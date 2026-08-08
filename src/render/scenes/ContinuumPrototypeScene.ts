import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { ScaleDomain } from '../camera/referenceFrames';
import type { TransitionVisualController } from '../transitions/TransitionDirector';

function setMaterialOpacity(material: THREE.Material, opacity: number): void {
  const transparentMaterial = material as THREE.Material & { opacity?: number };
  if (transparentMaterial.opacity !== undefined) transparentMaterial.opacity = opacity;
  material.transparent = opacity < 0.999;
  material.depthWrite = opacity > 0.35;
  material.needsUpdate = true;
}

function setGroupOpacity(group: THREE.Object3D, opacity: number): void {
  const visible = opacity > 0.001;
  group.visible = visible;
  if (!visible) return;
  group.traverse(object => {
    const candidate = object as THREE.Mesh;
    const material = candidate.material;
    if (!material) return;
    if (Array.isArray(material)) {
      for (const entry of material) setMaterialOpacity(entry, opacity);
    } else {
      setMaterialOpacity(material, opacity);
    }
  });
}

function gaussian(rng: ReturnType<typeof createRandomStream>, mean = 0, sigma = 1): number {
  const u1 = Math.max(Number.EPSILON, rng.next());
  const u2 = rng.next();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
}

function makePoints(
  count: number,
  radius: number,
  seed: string,
  stream: string,
  color: number,
  size: number,
): THREE.Points {
  const rng = createRandomStream(seed, stream);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = radius * Math.cbrt(rng.next());
    const theta = rng.range(0, Math.PI * 2);
    const z = rng.range(-1, 1);
    const radial = Math.sqrt(Math.max(0, 1 - z * z));
    positions[i * 3] = Math.cos(theta) * radial * r;
    positions[i * 3 + 1] = z * r;
    positions[i * 3 + 2] = Math.sin(theta) * radial * r;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true }),
  );
}

function createCosmic(seed: string): THREE.Group {
  const group = new THREE.Group();
  group.add(makePoints(5200, 18, seed, 'phase2-cosmic', 0x9bc4ff, 0.055));
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xf5fbff, transparent: true }),
  ));
  return group;
}

function createGalaxy(seed: string): THREE.Group {
  const group = new THREE.Group();
  const rng = createRandomStream(seed, 'phase2-galaxy');
  const count = 7200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const warm = new THREE.Color(0xffd8a8);
  const cool = new THREE.Color(0xa9c8ff);

  for (let i = 0; i < count; i += 1) {
    const r = Math.pow(rng.next(), 0.58) * 10;
    const arm = rng.int(0, 3);
    const angle = r * 0.58 + arm * (Math.PI * 2 / 4) + rng.range(-0.42, 0.42);
    const vertical = gaussian(rng, 0, 0.18 + 0.025 * r);
    positions[i * 3] = Math.cos(angle) * r + gaussian(rng, 0, 0.22);
    positions[i * 3 + 1] = vertical;
    positions[i * 3 + 2] = Math.sin(angle) * r + gaussian(rng, 0, 0.22);
    const color = cool.clone().lerp(warm, rng.range(0.15, 0.9));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  group.add(new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.045, sizeAttenuation: true, vertexColors: true, transparent: true }),
  ));
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe3b0, transparent: true }),
  ));
  return group;
}

function createStellar(seed: string): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffddb0, transparent: true }),
  ));
  group.add(new THREE.PointLight(0xffddad, 180, 100, 2));
  const dust = makePoints(3200, 8, seed, 'phase2-dust', 0xffc98a, 0.035);
  dust.scale.y = 0.13;
  group.add(dust);
  return group;
}

function createPlanetary(): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 48, 24),
    new THREE.MeshBasicMaterial({ color: 0xffdfa0, transparent: true }),
  ));
  group.add(new THREE.PointLight(0xffe2ad, 120, 80, 2));

  for (const radius of [2.4, 4.2, 6.5]) {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x7296c4, transparent: true, opacity: 0.45 }),
    );
    orbit.rotation.x = Math.PI / 2;
    group.add(orbit);
  }

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 64, 32),
    new THREE.MeshStandardMaterial({ color: 0x4f80b6, roughness: 0.76, metalness: 0.02, transparent: true }),
  );
  planet.position.set(4.2, 0, 0);
  planet.userData.phase2Planet = true;
  group.add(planet);
  return group;
}

function createSurface(): THREE.Group {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x315d58, roughness: 0.95, metalness: 0, transparent: true }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.6;
  group.add(ground);

  const ocean = new THREE.Mesh(
    new THREE.CircleGeometry(6, 96),
    new THREE.MeshStandardMaterial({ color: 0x174f78, roughness: 0.28, metalness: 0.05, transparent: true }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(2.5, -1.52, -1.2);
  group.add(ocean);
  return group;
}

function createMicroscopic(seed: string): THREE.Group {
  const group = new THREE.Group();
  const rng = createRandomStream(seed, 'phase2-micro');
  const atomGeometry = new THREE.SphereGeometry(0.16, 24, 16);
  for (let i = 0; i < 70; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: i % 4 === 0 ? 0xff8b70 : i % 3 === 0 ? 0x7fc6ff : 0xd9e9ff,
      roughness: 0.5,
      metalness: 0,
      transparent: true,
    });
    const atom = new THREE.Mesh(atomGeometry, material);
    atom.position.set(gaussian(rng, 0, 2.4), gaussian(rng, 0, 1.4), gaussian(rng, 0, 2.4));
    group.add(atom);
  }
  return group;
}

export class ContinuumPrototypeScene implements TransitionVisualController {
  readonly root = new THREE.Group();
  private readonly groups = new Map<ScaleDomain, THREE.Group>();

  constructor(scene: THREE.Scene, seed: string) {
    this.root.name = 'phase2-continuum-root';
    this.groups.set('cosmic', createCosmic(seed));
    this.groups.set('galactic', createGalaxy(seed));
    this.groups.set('stellar', createStellar(seed));
    this.groups.set('planetary', createPlanetary());
    this.groups.set('surface', createSurface());
    this.groups.set('microscopic', createMicroscopic(seed));

    for (const [domain, group] of this.groups) {
      group.name = `scale-${domain}`;
      this.root.add(group);
    }

    scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x1b2334, 1.35));
    scene.add(this.root);
    this.focus('cosmic');
  }

  focus(domain: ScaleDomain): void {
    for (const [candidate, group] of this.groups) setGroupOpacity(group, candidate === domain ? 1 : 0);
  }

  blend(from: ScaleDomain, to: ScaleDomain, progress: number): void {
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    for (const [candidate, group] of this.groups) {
      if (candidate === from) setGroupOpacity(group, 1 - t);
      else if (candidate === to) setGroupOpacity(group, t);
      else setGroupOpacity(group, 0);
    }
  }

  update(timeMs: number): void {
    const galaxy = this.groups.get('galactic');
    if (galaxy) galaxy.rotation.y = timeMs * 0.000018;
    const stellar = this.groups.get('stellar');
    if (stellar) stellar.rotation.y = timeMs * 0.00001;

    const planetary = this.groups.get('planetary');
    const planet = planetary?.children.find(child => child.userData.phase2Planet === true);
    if (planet) {
      const angle = timeMs * 0.00012;
      planet.position.set(Math.cos(angle) * 4.2, 0, Math.sin(angle) * 4.2);
    }

    const microscopic = this.groups.get('microscopic');
    if (microscopic) microscopic.rotation.y = timeMs * 0.00008;
  }
}
