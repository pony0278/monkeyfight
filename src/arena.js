import * as THREE from 'three';

// The floating jungle platform the monkeys brawl on, plus sky, lights and
// some background palm trees for flavour.
export const ARENA_RADIUS = 12;

export function buildArena(scene) {
  scene.background = new THREE.Color(0x9fd8ff);
  scene.fog = new THREE.Fog(0x9fd8ff, 35, 90);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
  sun.position.set(10, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const arena = new THREE.Group();
  scene.add(arena);

  // Top grassy disc
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 1, 48),
    new THREE.MeshStandardMaterial({ color: 0x5fb04a, roughness: 0.95 })
  );
  top.position.y = -0.5;
  top.receiveShadow = true;
  arena.add(top);

  // Dirt underside (cone)
  const dirt = new THREE.Mesh(
    new THREE.ConeGeometry(ARENA_RADIUS, 9, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1, side: THREE.DoubleSide })
  );
  dirt.position.y = -5.5;
  dirt.rotation.x = Math.PI;
  arena.add(dirt);

  // Rim stones
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.3), stoneMat);
    s.position.set(Math.sin(a) * (ARENA_RADIUS - 0.2), 0.1, Math.cos(a) * (ARENA_RADIUS - 0.2));
    s.rotation.set(Math.random(), Math.random(), Math.random());
    s.castShadow = true;
    arena.add(s);
  }

  // Decorative palm trees around the edge
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const tree = makePalm();
    tree.position.set(Math.sin(a) * (ARENA_RADIUS - 1.5), 0, Math.cos(a) * (ARENA_RADIUS - 1.5));
    tree.rotation.y = Math.random() * Math.PI;
    arena.add(tree);
  }

  // Floating background islands for depth
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 25;
    const isl = new THREE.Mesh(
      new THREE.SphereGeometry(2 + Math.random() * 3, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x5fb04a, roughness: 1 })
    );
    isl.scale.y = 0.6;
    isl.position.set(Math.sin(a) * r, -3 + Math.random() * 14, Math.cos(a) * r);
    scene.add(isl);
  }

  // Fluffy clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 1.5, 8, 6), cloudMat);
      puff.position.set((Math.random() - 0.5) * 4, Math.random(), (Math.random() - 0.5) * 2);
      c.add(puff);
    }
    const a = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 40;
    c.position.set(Math.sin(a) * r, 12 + Math.random() * 18, Math.cos(a) * r);
    clouds.add(c);
  }
  scene.add(clouds);

  return { arena, clouds };
}

function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x9c6b3a, roughness: 1 })
  );
  trunk.position.y = 1.6;
  trunk.rotation.z = 0.15;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f9e2f, roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 4), leafMat);
    leaf.scale.set(1.4, 0.18, 0.6);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.sin(a) * 0.7 + 0.3, 3.4, Math.cos(a) * 0.7);
    leaf.rotation.set(0.3 * Math.cos(a), -a, 0.3 * Math.sin(a));
    g.add(leaf);
  }
  // coconuts
  for (let i = 0; i < 3; i++) {
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
    coco.position.set(0.3 + (Math.random() - 0.5) * 0.4, 3.2, (Math.random() - 0.5) * 0.4);
    g.add(coco);
  }
  return g;
}
