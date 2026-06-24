import * as THREE from 'three';

// Builds a chunky cartoon monkey out of primitives and returns a group whose
// userData holds the animatable parts.
export function buildMonkey(bodyColor = 0x8a5a2b) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85 });
  const faceColor = new THREE.Color(bodyColor).lerp(new THREE.Color(0xffe0b2), 0.6);
  const face = new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });

  // Body — a fat egg.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), skin);
  body.scale.set(1, 1.15, 0.95);
  body.position.y = 0.7;
  body.castShadow = true;
  g.add(body);

  // Belly patch.
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), face);
  belly.scale.set(0.8, 1, 0.55);
  belly.position.set(0, 0.62, 0.32);
  g.add(belly);

  // Head.
  const head = new THREE.Group();
  head.position.y = 1.45;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), skin);
  skull.castShadow = true;
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), face);
  muzzle.scale.set(1.1, 0.85, 0.8);
  muzzle.position.set(0, -0.08, 0.28);
  head.add(muzzle);
  // ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin);
    ear.scale.set(0.6, 1, 0.4);
    ear.position.set(sx * 0.42, 0.05, 0);
    head.add(ear);
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), face);
    earIn.scale.set(0.6, 1, 0.4);
    earIn.position.set(sx * 0.46, 0.05, 0.04);
    head.add(earIn);
  }
  // eyes
  const eyeL = new THREE.Group();
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), white);
    eyeWhite.position.set(sx * 0.15, 0.08, 0.3);
    eyeWhite.scale.set(1, 1.2, 0.6);
    head.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
    pupil.position.set(sx * 0.15, 0.08, 0.39);
    head.add(pupil);
  }
  // nostrils
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dark);
    n.position.set(sx * 0.07, -0.12, 0.55);
    head.add(n);
  }
  // big goofy grin
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16, Math.PI), dark);
  mouth.position.set(0, -0.18, 0.5);
  mouth.rotation.x = Math.PI;
  head.add(mouth);
  g.add(head);

  // Arms.
  const makeLimb = (len, r) => {
    const limb = new THREE.Group();
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), skin);
    seg.position.y = -len / 2 - r;
    seg.castShadow = true;
    limb.add(seg);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), face);
    hand.position.y = -len - r * 1.5;
    limb.add(hand);
    return limb;
  };
  const armL = makeLimb(0.45, 0.13); armL.position.set(-0.5, 1.05, 0);
  const armR = makeLimb(0.45, 0.13); armR.position.set(0.5, 1.05, 0);
  g.add(armL, armR);

  // Legs.
  const legL = makeLimb(0.4, 0.15); legL.position.set(-0.25, 0.45, 0);
  const legR = makeLimb(0.4, 0.15); legR.position.set(0.25, 0.45, 0);
  g.add(legL, legR);

  // Curly tail.
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, -0.4),
    new THREE.Vector3(0, 0.25, -0.85),
    new THREE.Vector3(0.25, 0.5, -1.0),
    new THREE.Vector3(0.45, 0.85, -0.8),
    new THREE.Vector3(0.3, 1.0, -0.55),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.08, 8), skin);
  tail.castShadow = true;
  g.add(tail);

  g.userData = { head, armL, armR, legL, legR, tail, body, materials: [skin, face] };
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);
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
    this.throwCooldown = 0;
    this.hurtTimer = 0;
    this.launched = false;        // spinning through the air after a big hit
    this.walkPhase = Math.random() * 10;
    this.squash = 0;              // landing squash amount

    // AI state
    this.aiTimer = 0;
    this.aiThrowTimer = 1 + Math.random() * 2;
    this.target = null;
  }

  get launchedFar() {
    const d = Math.hypot(this.pos.x, this.pos.z);
    return d;
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

  // Face a world-space direction smoothly.
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
    this.punchTimer = 0.28;
    this.punchCooldown = 0.45;
    return true;
  }

  canThrow() {
    return this.throwCooldown <= 0 && !this.launched;
  }

  // Procedural animation based on movement & state.
  animate(dt, speed) {
    const u = this.mesh.userData;
    this.walkPhase += dt * (4 + speed * 1.5);

    if (this.launched) {
      // tumble wildly
      this.mesh.rotation.z = this.walkPhase * 3;
      this.mesh.rotation.x = this.walkPhase * 2.3;
      u.armL.rotation.x = u.armR.rotation.x = Math.sin(this.walkPhase * 6) * 1.5;
      return;
    }
    this.mesh.rotation.set(0, this.facing, 0);

    const sw = Math.sin(this.walkPhase) * Math.min(speed * 0.18, 0.9);
    u.legL.rotation.x = sw;
    u.legR.rotation.x = -sw;
    u.armL.rotation.x = -sw * 0.7;
    u.armR.rotation.x = sw * 0.7;
    u.armL.rotation.z = 0.15;
    u.armR.rotation.z = -0.15;

    // punch — both arms thrust forward
    if (this.punchTimer > 0) {
      const p = 1 - this.punchTimer / 0.28;
      const thrust = Math.sin(p * Math.PI);
      u.armL.rotation.x = -2.2 * thrust;
      u.armR.rotation.x = -2.2 * thrust;
    }

    // hurt wobble
    if (this.hurtTimer > 0) {
      u.head.rotation.z = Math.sin(this.hurtTimer * 40) * 0.3;
    } else {
      u.head.rotation.z = 0;
      u.head.rotation.y = Math.sin(this.walkPhase * 0.5) * 0.1;
    }

    // squash & stretch
    const baseY = 1;
    const sq = 1 - this.squash;
    this.mesh.scale.set(1 / Math.sqrt(sq || 1), sq || 1, 1 / Math.sqrt(sq || 1));
    if (!this.onGround) {
      // stretch upward in air
      this.mesh.scale.y = 1.12; this.mesh.scale.x = this.mesh.scale.z = 0.94;
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose?.();
    });
  }
}
