import * as THREE from 'three';

// A limb that pivots from its TOP (shoulder/hip), so rotating it swings the
// whole arm/leg naturally. `foot` flattens the end into a hand/foot pad.
function makeLimb(len, r, mat, padMat, foot = false) {
  const limb = new THREE.Group();
  const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), mat);
  seg.position.y = -len / 2 - r;
  seg.castShadow = true;
  limb.add(seg);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 12, 10), padMat);
  pad.position.y = -len - r * 1.4;
  if (foot) { pad.scale.set(1.1, 0.7, 1.4); pad.position.y += r * 0.2; pad.position.z = r * 0.3; }
  limb.add(pad);
  limb.userData.pad = pad;
  return limb;
}

// Builds a chunky, ape-ish cartoon monkey out of primitives. Returns a group
// whose userData holds the animatable parts (torso twists, limbs swing, etc.).
export function buildMonkey(bodyColor = 0x8a5a2b) {
  const g = new THREE.Group();
  const c = new THREE.Color(bodyColor);
  const skin = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
  const skinDark = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.78), roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color(0xffe2b8), 0.62), roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241405, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const shine = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x999999 });

  // ---- torso (twists & bobs as one unit) ----
  const torso = new THREE.Group();
  g.add(torso);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 16), skin);
  body.scale.set(1, 1.12, 1.02);
  body.position.y = 0.82;
  body.rotation.x = 0.16; // slight hunch
  body.castShadow = true;
  torso.add(body);

  // hump on the back for a gorilla-ish silhouette
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), skinDark);
  hump.scale.set(1, 0.8, 0.8);
  hump.position.set(0, 1.15, -0.34);
  torso.add(hump);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 14), face);
  belly.scale.set(0.86, 1.05, 0.58);
  belly.position.set(0, 0.74, 0.36);
  torso.add(belly);

  // ---- head ----
  const head = new THREE.Group();
  head.position.set(0, 1.55, 0.16);
  torso.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 18), skin);
  skull.castShadow = true;
  head.add(skull);

  // brow ridge — gives the face attitude
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), skinDark);
  brow.position.set(0, 0.12, 0.06);
  brow.scale.set(1.02, 0.7, 1.02);
  head.add(brow);

  // muzzle (flatter, pushed forward)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), face);
  muzzle.scale.set(1.05, 0.78, 0.92);
  muzzle.position.set(0, -0.12, 0.32);
  head.add(muzzle);

  // ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
    ear.scale.set(0.85, 1, 0.45);
    ear.position.set(sx * 0.46, 0.06, -0.02);
    head.add(ear);
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), face);
    earIn.scale.set(0.7, 1, 0.4);
    earIn.position.set(sx * 0.5, 0.06, 0.03);
    head.add(earIn);
  }

  // eyes (white + pupil + shine) and movable eyebrows
  const browL = [];
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), white);
    eyeWhite.position.set(sx * 0.17, 0.12, 0.34);
    eyeWhite.scale.set(1, 1.25, 0.7);
    head.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), dark);
    pupil.position.set(sx * 0.17, 0.1, 0.45);
    head.add(pupil);
    const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), shine);
    sparkle.position.set(sx * 0.19, 0.15, 0.5);
    head.add(sparkle);

    const eb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), dark);
    eb.position.set(sx * 0.18, 0.28, 0.4);
    eb.rotation.z = sx * 0.12;
    head.add(eb);
    browL.push(eb);
  }

  // nostrils + big goofy grin
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
    n.position.set(sx * 0.08, -0.1, 0.62);
    head.add(n);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 18, Math.PI), dark);
  mouth.position.set(0, -0.24, 0.55);
  mouth.rotation.x = Math.PI;
  head.add(mouth);

  // ---- arms (long, reach toward the ground) ----
  const armL = makeLimb(0.62, 0.15, skin, face); armL.position.set(-0.54, 1.18, 0.04);
  const armR = makeLimb(0.62, 0.15, skin, face); armR.position.set(0.54, 1.18, 0.04);
  armL.rotation.z = 0.12; armR.rotation.z = -0.12;
  torso.add(armL, armR);

  // ---- legs (short, on the root so they stay planted while the torso moves) ----
  const legL = makeLimb(0.34, 0.17, skin, skinDark, true); legL.position.set(-0.26, 0.52, 0);
  const legR = makeLimb(0.34, 0.17, skin, skinDark, true); legR.position.set(0.26, 0.52, 0);
  g.add(legL, legR);

  // ---- curly tail ----
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, -0.45),
    new THREE.Vector3(0, 0.3, -0.92),
    new THREE.Vector3(0.28, 0.55, -1.05),
    new THREE.Vector3(0.5, 0.92, -0.82),
    new THREE.Vector3(0.32, 1.08, -0.55),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.085, 8), skin);
  tail.castShadow = true;
  torso.add(tail);

  g.userData = { torso, head, brows: browL, armL, armR, legL, legR, tail, body, mouth };
  return g;
}

const tmp = new THREE.Vector3();

// A single monkey: physics body + procedural animation + (optional) AI.
export class Monkey {
  constructor(scene, opts = {}) {
    this.mesh = buildMonkey(opts.color ?? 0x8a5a2b);
    this.name = opts.name ?? 'Monkey';
    this.isPlayer = !!opts.isPlayer;
    scene.add(this.mesh);

    this.pos = new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0);
    this.vel = new THREE.Vector3();
    this.facing = Math.random() * Math.PI * 2;
    this.radius = 0.6;

    this.onGround = true;
    this.alive = true;
    this.damage = 0;              // smash-style: higher = flies further
    this.score = 0;
    this.invuln = 0;              // brief spawn / revive protection (seconds)

    this.punchTimer = 0;          // animation/cooldown timers
    this.punchCooldown = 0;
    this.punchArm = 1;            // which arm throws the current punch
    this.throwTimer = 0;          // throw wind-up/fling animation
    this.throwCooldown = 0;
    this.hurtTimer = 0;
    this.launched = false;        // spinning through the air after a big hit
    this.walkPhase = Math.random() * 10;
    this.idlePhase = Math.random() * 10;
    this.squash = 0;              // landing squash amount
    this.lean = 0;                // smoothed body lean into movement

    // AI state
    this.aiTimer = 0;
    this.aiThrowTimer = 1 + Math.random() * 2;
    this.target = null;
  }

  applyKnockback(dir, power) {
    // Knockback scales with accumulated damage (the more hurt, the further you fly).
    const scale = power * (0.6 + this.damage / 100);
    this.vel.x += dir.x * scale;
    this.vel.z += dir.z * scale;
    this.vel.y += Math.min(4 + scale * 0.35, 12);
    this.onGround = false;
    this.hurtTimer = 0.4;
    if (scale > 9) this.launched = true;
  }

  hit(dir, basePower, dmg) {
    if (this.invuln > 0 || !this.alive) return false;
    this.damage += dmg;
    this.applyKnockback(dir, basePower);
    return true;
  }

  faceDir(dx, dz, snap = 0.25) {
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    const target = Math.atan2(dx, dz);
    let diff = target - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * snap;
  }

  forward() {
    return tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)).clone();
  }

  startPunch() {
    if (this.punchCooldown > 0 || this.launched) return false;
    this.punchTimer = 0.32;
    this.punchCooldown = 0.42;
    this.punchArm = -this.punchArm; // alternate fists
    return true;
  }

  canThrow() {
    return this.throwCooldown <= 0 && !this.launched;
  }

  startThrow() {
    this.throwTimer = 0.4;
  }

  // Procedural animation based on movement & state.
  animate(dt, speed) {
    const u = this.mesh.userData;
    this.walkPhase += dt * (5 + speed * 1.6);
    this.idlePhase += dt * 2.2;

    if (this.launched) {
      // tumble wildly through the air
      this.mesh.rotation.z = this.walkPhase * 3;
      this.mesh.rotation.x = this.walkPhase * 2.4;
      u.armL.rotation.x = u.armR.rotation.x = Math.sin(this.walkPhase * 7) * 1.6;
      u.legL.rotation.x = u.legR.rotation.x = Math.sin(this.walkPhase * 6 + 1) * 1.2;
      return;
    }

    this.mesh.rotation.set(0, this.facing, 0);

    // base scale (reset; squash/stretch applied below)
    this.mesh.scale.set(1, 1, 1);

    // --- lean into movement / turns ---
    const targetLean = Math.min(speed * 0.04, 0.28);
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 8);

    // --- legs & arms walk cycle ---
    const sw = Math.sin(this.walkPhase) * Math.min(0.25 + speed * 0.12, 1.0);
    u.legL.rotation.x = sw;
    u.legR.rotation.x = -sw;
    u.armL.rotation.set(-sw * 0.8, 0, 0.12);
    u.armR.rotation.set(sw * 0.8, 0, -0.12);

    // --- torso bob + breathing + lean ---
    const bob = Math.abs(Math.sin(this.walkPhase)) * Math.min(speed * 0.012, 0.07);
    const breathe = Math.sin(this.idlePhase) * 0.015;
    u.torso.position.y = bob + breathe;
    u.torso.rotation.set(this.lean, 0, 0);
    u.tail.rotation.z = Math.sin(this.idlePhase * 0.8) * 0.15;

    // --- head idle look ---
    u.head.rotation.set(0, Math.sin(this.idlePhase * 0.5) * 0.12, 0);

    // --- punch: one-arm hook with body twist, windup -> swing -> recover ---
    if (this.punchTimer > 0) {
      const t = 1 - this.punchTimer / 0.32;       // 0..1
      const arm = this.punchArm > 0 ? u.armR : u.armL;
      const sign = this.punchArm > 0 ? 1 : -1;
      let twist, raise, cross;
      if (t < 0.3) {
        // windup: cock back & coil torso
        const k = t / 0.3;
        twist = -sign * 0.5 * k; raise = -2.2 * k; cross = -0.4 * sign * k;
      } else {
        // swing through & follow
        const k = (t - 0.3) / 0.7;
        const e = Math.sin(k * Math.PI * 0.5);
        twist = -sign * 0.5 + sign * 1.0 * e; raise = -2.2 + 1.7 * e; cross = -0.4 * sign + 1.1 * sign * e;
      }
      u.torso.rotation.y = twist;
      u.head.rotation.y = twist * 0.4;
      arm.rotation.set(raise, cross, sign * 0.12);
      this._brows(0.0, -0.06); // determined
    }

    // --- throw: cock overhead then fling forward ---
    if (this.throwTimer > 0) {
      const t = 1 - this.throwTimer / 0.4;
      const e = t < 0.4 ? -(t / 0.4) : (t - 0.4) / 0.6; // back then forward
      u.armR.rotation.set(-2.4 + e * 3.4, 0, -0.1);
      u.torso.rotation.x = this.lean - e * 0.1;
      this.throwTimer -= dt;
    }

    // --- hurt flinch ---
    if (this.hurtTimer > 0) {
      const w = Math.sin(this.hurtTimer * 45);
      u.head.rotation.z = w * 0.35;
      u.torso.rotation.x = this.lean - 0.25;
      this._brows(0.1, 0.1);
    }

    // --- squash & stretch ---
    if (!this.onGround) {
      this.mesh.scale.set(0.92, 1.14, 0.92); // stretch in air
    } else if (this.squash > 0.001) {
      const s = this.squash;
      this.mesh.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6); // splat on landing
    }
  }

  // tilt the eyebrows for expression (offsetY raises, angle furrows)
  _brows(offsetY, angle) {
    const b = this.mesh.userData.brows;
    if (!b) return;
    b[0].position.y = 0.28 + offsetY; b[0].rotation.z = 0.12 + angle;
    b[1].position.y = 0.28 + offsetY; b[1].rotation.z = -0.12 - angle;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose?.();
    });
  }
}
