import * as THREE from 'three';

// Lightweight particle bursts (dust, banana splat) + camera screen-shake.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shake = 0;
    this.shakeT = 0;
  }

  burst(pos, color = 0xffe066, count = 14, speed = 6, size = 0.15) {
    const geo = new THREE.SphereGeometry(size, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.8 + 0.2;
      const s = speed * (0.5 + Math.random());
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * s, up * s, Math.sin(a) * s),
        life: 0.6 + Math.random() * 0.4,
        max: 1,
      });
    }
  }

  ring(pos, color = 0xffffff) {
    // expanding shock ring for big hits
    const geo = new THREE.RingGeometry(0.1, 0.25, 24);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).setY(0.1);
    this.scene.add(m);
    this.particles.push({ mesh: m, ring: true, life: 0.4, max: 0.4 });
  }

  addShake(amount) { this.shake = Math.min(this.shake + amount, 1.2); }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.ring) {
        const t = 1 - p.life / p.max;
        p.mesh.scale.setScalar(1 + t * 10);
        p.mesh.material.opacity = 1 - t;
      } else {
        p.vel.y -= 18 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.01, p.life / p.max));
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.ring) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
        this.particles.splice(i, 1);
      }
    }
    this.shake *= Math.pow(0.0001, dt); // decay fast
    this.shakeT += dt * 40;
  }

  // Apply shake offset to a camera (call after camera positioned).
  applyShake(camera) {
    if (this.shake < 0.001) return;
    const s = this.shake;
    camera.position.x += Math.sin(this.shakeT * 1.7) * s * 0.5;
    camera.position.y += Math.cos(this.shakeT * 2.3) * s * 0.4;
    camera.position.z += Math.sin(this.shakeT * 1.1) * s * 0.5;
  }
}
