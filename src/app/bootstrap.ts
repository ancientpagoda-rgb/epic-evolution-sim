import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FixedStepClock } from '../core/clock';
import { createRandomStream } from '../core/random';
import { UniverseRenderer } from '../render/renderer';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

function createContinuumSeedScene(scene: THREE.Scene, seed: string): THREE.Group {
  const root = new THREE.Group();
  const rng = createRandomStream(seed, 'foundation-scene');

  const starCount = 2200;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i += 1) {
    const radius = rng.range(12, 120);
    const theta = rng.range(0, Math.PI * 2);
    const phi = Math.acos(rng.range(-1, 1));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    sizes[i] = rng.range(0.5, 1.4);
  }

  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xd8e8ff, size: 0.045, sizeAttenuation: true }),
  );
  root.add(stars);

  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdf91 }),
  );
  root.add(star);

  const light = new THREE.PointLight(0xffe3a3, 120, 50, 2);
  root.add(light);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.006, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x426795, transparent: true, opacity: 0.45 }),
  );
  orbit.rotation.x = Math.PI / 2;
  root.add(orbit);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 48, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f7db8, roughness: 0.78, metalness: 0.02 }),
  );
  planet.position.x = 2.15;
  planet.userData.orbitRadius = 2.15;
  root.add(planet);

  scene.add(root);
  return root;
}

function formatFoundationAge(seconds: number): string {
  if (seconds < 1e-6) return `${seconds.toExponential(2)} s`;
  return `${seconds.toFixed(3)} s`;
}

export async function bootstrap(): Promise<void> {
  const host = requiredElement<HTMLElement>('viewport');
  const status = requiredElement<HTMLElement>('status');
  const backendLabel = requiredElement<HTMLElement>('backend');
  const qualityLabel = requiredElement<HTMLElement>('quality');
  const fpsLabel = requiredElement<HTMLElement>('fps');
  const ageLabel = requiredElement<HTMLElement>('age');

  const universe = new UniverseRenderer(host, 'ultra');
  const backend = await universe.init();
  backendLabel.textContent = `backend: ${backend}`;

  const framebuffer = universe.getFramebufferSize();
  qualityLabel.textContent = `Ultra 4K • ${framebuffer.width}×${framebuffer.height}`;
  status.textContent = 'V3 foundation initialized • deterministic continuum scene';

  const controls = new OrbitControls(universe.camera, universe.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 1.3;
  controls.maxDistance = 80;

  const root = createContinuumSeedScene(universe.scene, 'chaisson-734221');
  const planet = root.children.find(child => child.userData.orbitRadius !== undefined) as THREE.Mesh | undefined;
  const clock = new FixedStepClock(1 / 60, 5);
  clock.reset();

  let frames = 0;
  let fpsWindowStart = performance.now();

  window.addEventListener('resize', () => {
    universe.resize();
    const size = universe.getFramebufferSize();
    qualityLabel.textContent = `Ultra 4K • ${size.width}×${size.height}`;
  });

  universe.setAnimationLoop(timeMs => {
    const tick = clock.advance(timeMs);
    ageLabel.textContent = formatFoundationAge(tick.simulationSeconds);

    root.rotation.y = timeMs * 0.000012;
    if (planet) {
      const orbitRadius = Number(planet.userData.orbitRadius);
      const angle = timeMs * 0.00016;
      planet.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
    }

    controls.update();
    universe.render();

    frames += 1;
    if (timeMs - fpsWindowStart >= 1000) {
      const fps = (frames * 1000) / (timeMs - fpsWindowStart);
      fpsLabel.textContent = `fps: ${fps.toFixed(0)}`;
      frames = 0;
      fpsWindowStart = timeMs;
    }
  });
}
