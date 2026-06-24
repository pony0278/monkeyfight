import * as THREE from 'three';
import { Monkey } from './monkey.js';
import { buildArena, ARENA_RADIUS } from './arena.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';

const GRAVITY = 34;
const MOVE_SPEED = 7.2;
const JUMP_V = 12;
const FALL_DEATH_Y = -6;

const MONKEY_COLORS = [
  0xc98a3a, 0x8a5a2b, 0x6b4a2a, 0xa9744a, 0x5a3a1a, 0xd6a85a, 0x7a4a2a,
];
const NAMES = ['Bongo', 'Kiki', 'Coco', 'Bananas', 'Chunk', 'Momo', 'Tito', 'Goober'];

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.cb = callbacks;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camOffset = new THREE.Vector3(0, 15, 15);
    this.camTarget = new THREE.Vector3();

    const { clouds } = buildArena(this.scene);
    this.clouds = clouds;
    this.fx = new Effects(this.scene);

    this.monkeys = [];
    this.bananas = [];
    this.player = null;
    this.running = false;
    this.matchOver = false;

    this._banGeo = new THREE.CapsuleGeometry(0.12, 0.3, 4, 8);
    this._banGeo.rotateZ(Math.PI / 2);
    this._banGeo.scale(1, 1, 1);
    this._banMat = new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.5 });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  clearMonkeys() {
    for (const m of this.monkeys) m.dispose(this.scene);
    this.monkeys = [];
    for (const b of this.bananas) this.scene.remove(b.mesh);
    this.bananas = [];
    this.player = null;
  }

  // Spawn the player + n enemies in a ring. difficulty scales AI speed/aggression.
  startMatch(numEnemies, difficulty = 1) {
    this.clearMonkeys();
    this.matchOver = false;
    this.difficulty = difficulty;

    this.player = new Monkey(this.scene, {
      isPlayer: true, color: 0xff5a3c, name: 'You', x: 0, z: 0,
    });
    this.player.invuln = 2.0; // spawn protection so you don't get instantly mobbed
    this.monkeys.push(this.player);

    const total = numEnemies;
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2;
      const r = ARENA_RADIUS * 0.55;
      const m = new Monkey(this.scene, {
        color: MONKEY_COLORS[i % MONKEY_COLORS.length],
        name: NAMES[i % NAMES.length],
        x: Math.sin(a) * r, z: Math.cos(a) * r,
      });
      m.difficulty = difficulty;
      m.invuln = 1.2; // brief grace so enemies don't all pile on at once
      this.monkeys.push(m);
    }
    this.running = true;
  }

  setRunning(v) { this.running = v; }

  spawnBanana(owner) {
    const fwd = owner.forward();
    const mesh = new THREE.Mesh(this._banGeo, this._banMat);
    mesh.castShadow = true;
    const pos = owner.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).multiplyScalar(0.8));
    pos.y = 1.2;
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.bananas.push({
      mesh,
      pos,
      vel: new THREE.Vector3(fwd.x * 16, 6, fwd.z * 16),
      owner,
      life: 3,
      spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
    });
    Audio.whoosh();
  }

  // --- combat ---
  resolvePunch(attacker) {
    const fwd = attacker.forward();
    let best = null, bestDot = 0.25, bestDist = 2.0;
    for (const m of this.monkeys) {
      if (m === attacker || !m.alive) continue;
      const dx = m.pos.x - attacker.pos.x;
      const dz = m.pos.z - attacker.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > bestDist) continue;
      const dot = (dx * fwd.x + dz * fwd.z) / (dist || 1);
      if (dot > bestDot) { best = m; bestDot = dot; }
    }
    if (best) {
      const dir = new THREE.Vector3(best.pos.x - attacker.pos.x, 0, best.pos.z - attacker.pos.z).normalize();
      best.lastHitBy = attacker;
      if (!best.hit(dir, 10, 13)) return; // shrugged off (invulnerable)
      const hp = best.pos.clone(); hp.y = 1;
      this.fx.burst(hp, 0xffffff, 12, 7, 0.12);
      this.fx.ring(best.pos);
      this.fx.addShake(0.35 + best.damage * 0.004);
      Audio.punch();
      Audio.hoot(0.8 + Math.random() * 0.4);
      if (this.cb.onHit) this.cb.onHit(attacker, best);
    }
  }

  updateBananas(dt) {
    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const b = this.bananas[i];
      b.life -= dt;
      b.vel.y -= GRAVITY * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x += b.spin.x * dt;
      b.mesh.rotation.y += b.spin.y * dt;

      let hit = false;
      for (const m of this.monkeys) {
        if (m === b.owner || !m.alive) continue;
        const d = Math.hypot(m.pos.x - b.pos.x, m.pos.z - b.pos.z);
        if (d < 0.9 && b.pos.y < 2 && b.pos.y > 0.2) {
          const dir = new THREE.Vector3(m.pos.x - b.owner.pos.x, 0, m.pos.z - b.owner.pos.z).normalize();
          m.lastHitBy = b.owner;
          if (!m.hit(dir, 8, 9)) continue; // invulnerable — banana flies past
          this.fx.burst(b.pos.clone(), 0xffe14d, 16, 6, 0.14);
          this.fx.addShake(0.3);
          Audio.splat();
          Audio.hoot(1.2);
          if (this.cb.onHit) this.cb.onHit(b.owner, m);
          hit = true;
          break;
        }
      }
      if (hit || b.life <= 0 || b.pos.y < -1) {
        this.scene.remove(b.mesh);
        this.bananas.splice(i, 1);
      }
    }
  }

  // --- AI ---
  updateAI(m, dt) {
    m.aiTimer -= dt;
    m.aiThrowTimer -= dt;
    const diff = m.difficulty || 1;

    // pick / refresh target
    if (!m.target || !m.target.alive || m.aiTimer <= 0) {
      const alive = this.monkeys.filter((o) => o !== m && o.alive);
      // prefer the player a bit for drama, else nearest
      m.target = alive.includes(this.player) && Math.random() < 0.5
        ? this.player
        : alive.sort((a, b) =>
            Math.hypot(a.pos.x - m.pos.x, a.pos.z - m.pos.z) -
            Math.hypot(b.pos.x - m.pos.x, b.pos.z - m.pos.z))[0];
      m.aiTimer = 1.5 + Math.random() * 2;
    }

    const move = { x: 0, y: 0 };
    const distCenter = Math.hypot(m.pos.x, m.pos.z);

    if (distCenter > ARENA_RADIUS * 0.78) {
      // too close to the edge — scramble back toward the middle
      move.x = -m.pos.x; move.y = -m.pos.z;
    } else if (m.target) {
      const dx = m.target.pos.x - m.pos.x;
      const dz = m.target.pos.z - m.pos.z;
      const dist = Math.hypot(dx, dz);
      move.x = dx; move.y = dz;
      if (dist < 1.7) {
        // in range — punch
        m.faceDir(dx, dz, 0.5);
        if (m.startPunch()) this.resolvePunch(m);
        // back off a touch sometimes for comedic shuffling
        if (Math.random() < 0.3) { move.x = -dx; move.y = -dz; }
      } else if (dist < 9 && m.aiThrowTimer <= 0 && m.canThrow()) {
        m.faceDir(dx, dz, 0.5);
        m.throwCooldown = 1.2;
        m.aiThrowTimer = 1.5 + Math.random() * 2.5 / diff;
        this.spawnBanana(m);
      }
    }

    // separation — don't perfectly stack on other monkeys, surround instead
    for (const o of this.monkeys) {
      if (o === m || !o.alive) continue;
      const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z;
      const od = Math.hypot(ox, oz);
      if (od < 1.5 && od > 0.001) {
        const push = (1.5 - od) / 1.5;
        move.x += (ox / od) * push * 1.2;
        move.y += (oz / od) * push * 1.2;
      }
    }

    const len = Math.hypot(move.x, move.y) || 1;
    return { x: (move.x / len) * (0.7 + 0.3 * diff), y: (move.y / len) * (0.7 + 0.3 * diff) };
  }

  // --- per-monkey physics + control ---
  updateMonkey(m, dt, controlVec) {
    // horizontal control -> velocity (camera/world aligned: y is +z forward)
    let mvx = 0, mvz = 0;
    if (m.alive && !m.launched) {
      mvx = controlVec.x;
      mvz = controlVec.y;
    }
    const moving = Math.hypot(mvx, mvz);
    const speed = moving * MOVE_SPEED;

    if (m.onGround && !m.launched) {
      // direct, snappy control on the ground
      m.vel.x = mvx * MOVE_SPEED;
      m.vel.z = mvz * MOVE_SPEED;
      if (moving > 0.05) m.faceDir(mvx, mvz, m.isPlayer ? 0.4 : 0.25);
    } else {
      // limited air control + drag
      m.vel.x += mvx * MOVE_SPEED * 1.4 * dt;
      m.vel.z += mvz * MOVE_SPEED * 1.4 * dt;
      m.vel.x *= 0.992;
      m.vel.z *= 0.992;
    }

    // gravity
    m.vel.y -= GRAVITY * dt;
    m.pos.addScaledVector(m.vel, dt);

    // ground / platform collision
    const distCenter = Math.hypot(m.pos.x, m.pos.z);
    const onPlatform = distCenter <= ARENA_RADIUS;
    if (m.pos.y <= 0 && onPlatform) {
      if (!m.onGround && m.vel.y < -4) {
        m.squash = Math.min(0.3, -m.vel.y * 0.02);
        this.fx.burst(new THREE.Vector3(m.pos.x, 0.1, m.pos.z), 0x9c7a4a, 6, 3, 0.1);
      }
      m.pos.y = 0;
      m.vel.y = 0;
      m.onGround = true;
      m.launched = false;
      m.mesh.rotation.set(0, m.facing, 0);
    } else if (m.pos.y > 0) {
      m.onGround = false;
    } else if (!onPlatform) {
      // walked/flew off the edge — start falling
      m.onGround = false;
    }

    m.squash *= Math.pow(0.001, dt);

    // timers
    if (m.punchTimer > 0) m.punchTimer -= dt;
    if (m.punchCooldown > 0) m.punchCooldown -= dt;
    if (m.throwCooldown > 0) m.throwCooldown -= dt;
    if (m.hurtTimer > 0) m.hurtTimer -= dt;
    if (m.invuln > 0) {
      m.invuln -= dt;
      m.mesh.visible = Math.floor(m.invuln * 12) % 2 === 0; // blink
      if (m.invuln <= 0) m.mesh.visible = true;
    }

    m.mesh.position.set(m.pos.x, m.pos.y, m.pos.z);
    m.animate(dt, speed);

    // death by falling
    if (m.alive && m.pos.y < FALL_DEATH_Y) {
      this.killMonkey(m);
    }
  }

  killMonkey(m) {
    m.alive = false;
    m.mesh.visible = false;
    Audio.yeet();
    // credit the last attacker with a KO point
    if (m.lastHitBy && m.lastHitBy !== m && m.lastHitBy.alive) {
      m.lastHitBy.score += 1;
    }
    if (this.cb.onKO) this.cb.onKO(m, m.lastHitBy);

    if (m === this.player) {
      this.running = false;
      if (this.cb.onPlayerDead) this.cb.onPlayerDead();
      return;
    }
    // an enemy fell — did that clear the arena?
    const enemiesLeft = this.monkeys.filter((o) => o !== this.player && o.alive).length;
    if (enemiesLeft === 0 && this.player && this.player.alive && !this.matchOver) {
      this.matchOver = true;
      this.running = false;
      if (this.cb.onRoundWon) this.cb.onRoundWon();
    }
  }

  // Revive the player at the centre (used after a rewarded ad).
  revivePlayer() {
    if (!this.player) return;
    this.player.alive = true;
    this.player.mesh.visible = true;
    this.player.pos.set(0, 6, 0);
    this.player.vel.set(0, 0, 0);
    this.player.launched = false;
    this.player.damage = Math.floor(this.player.damage * 0.4);
    this.player.mesh.rotation.set(0, 0, 0);
    this.player.invuln = 2.5;
    this.running = true;
  }

  // Player throws are routed here so we can also tag lastHitBy properly.
  playerActions(input) {
    if (!this.player.alive || this.player.launched) return;
    const acts = input.consume();
    if (acts.punch) {
      if (this.player.startPunch()) this.resolvePunch(this.player);
    }
    if (acts.throw && this.player.canThrow()) {
      this.player.throwCooldown = 0.6;
      this.spawnBanana(this.player);
    }
    if (acts.jump && this.player.onGround) {
      this.player.vel.y = JUMP_V;
      this.player.onGround = false;
      Audio.jump();
    }
  }

  update(dt, input) {
    if (!this.running) { this.render(dt); return; }

    // tag lastHitBy by watching damage application is done in hit(); set here
    for (const m of this.monkeys) {
      if (m === this.player) {
        input.pollKeyboard();
        // Screen-aligned: camera sits at +z looking toward -z, so "up" on the
        // joystick / W (input.move.y < 0) drives the monkey to -z (away from cam).
        this._playerCtrl = { x: input.move.x, y: input.move.y };
      }
    }

    // player actions
    if (this.player && this.player.alive) this.playerActions(input);

    // update each monkey
    for (const m of this.monkeys) {
      if (!m.alive) continue;
      let ctrl;
      if (m === this.player) ctrl = this._playerCtrl || { x: 0, y: 0 };
      else ctrl = this.updateAI(m, dt);
      // remember attacker for KO credit
      this.updateMonkey(m, dt, ctrl);
    }

    this.updateBananas(dt);
    this.fx.update(dt);

    // clouds drift
    if (this.clouds) this.clouds.rotation.y += dt * 0.01;

    this.updateCamera(dt);
    this.render(dt);
  }

  updateCamera(dt) {
    // Follow the player; nudge toward the action centroid a little.
    const focus = (this.player && this.player.alive) ? this.player.pos : this.camTarget;
    let cx = focus.x, cz = focus.z;
    const alive = this.monkeys.filter((m) => m.alive);
    if (alive.length) {
      let ax = 0, az = 0;
      for (const m of alive) { ax += m.pos.x; az += m.pos.z; }
      ax /= alive.length; az /= alive.length;
      cx = cx * 0.6 + ax * 0.4;
      cz = cz * 0.6 + az * 0.4;
    }
    this.camTarget.lerp(new THREE.Vector3(cx, 0.6, cz), 1 - Math.pow(0.001, dt));
    const desired = this.camTarget.clone().add(this.camOffset);
    this.camera.position.lerp(desired, 1 - Math.pow(0.0005, dt));
    this.camera.lookAt(this.camTarget);
    this.fx.applyShake(this.camera);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // Snapshot for the HUD.
  hudState() {
    return {
      score: this.player ? this.player.score : 0,
      damage: this.player ? Math.round(this.player.damage) : 0,
      alive: this.monkeys.filter((m) => m.alive).length,
      total: this.monkeys.length,
      playerAlive: this.player ? this.player.alive : false,
    };
  }
}
