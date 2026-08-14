import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiosphereEvolutionState } from '../../science/biology/biosphere';

export class BiosphereScene {
  readonly group = new THREE.Group();
  private readonly activityMaterial: THREE.PointsMaterial;
  private readonly networkMaterial: THREE.LineBasicMaterial;
  private readonly advancedMaterial: THREE.MeshStandardMaterial;
  private readonly advancedForms: THREE.InstancedMesh;
  private transitionOpacity = 0;
  private state: BiosphereEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase9-biosphere';
    const rng = createRandomStream(seed, 'phase9/render');

    const points = new Float32Array(3200 * 3);
    for (let i = 0; i < 3200; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = Math.sqrt(rng.next()) * 6.5;
      points[i * 3] = Math.cos(angle) * radius;
      points[i * 3 + 1] = rng.range(-2.8, 2.8);
      points[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    this.activityMaterial = new THREE.PointsMaterial({ color: 0x62d98d, size: 0.07, transparent: true, opacity: 0, depthWrite: false });
    this.group.add(new THREE.Points(pointGeometry, this.activityMaterial));

    const links = new Float32Array(260 * 6);
    for (let i = 0; i < 260; i += 1) {
      const base = i * 6;
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(0.6, 5.7);
      links[base] = Math.cos(angle) * radius;
      links[base + 1] = rng.range(-2.3, 2.3);
      links[base + 2] = Math.sin(angle) * radius;
      links[base + 3] = links[base] + rng.range(-0.8, 0.8);
      links[base + 4] = links[base + 1] + rng.range(-0.5, 0.5);
      links[base + 5] = links[base + 2] + rng.range(-0.8, 0.8);
    }
    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute('position', new THREE.BufferAttribute(links, 3));
    this.networkMaterial = new THREE.LineBasicMaterial({ color: 0xd8c3ff, transparent: true, opacity: 0 });
    this.group.add(new THREE.LineSegments(linkGeometry, this.networkMaterial));

    this.advancedMaterial = new THREE.MeshStandardMaterial({ color: 0x91d9ff, roughness: 0.45, transparent: true, opacity: 0 });
    this.advancedForms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 1), this.advancedMaterial, 40);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 40; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(0.8, 5.5);
      matrix.makeScale(rng.range(0.7, 1.6), rng.range(0.7, 1.6), rng.range(0.7, 1.6));
      matrix.setPosition(Math.cos(angle) * radius, rng.range(-2.2, 2.2), Math.sin(angle) * radius);
      this.advancedForms.setMatrixAt(i, matrix);
    }
    this.advancedForms.instanceMatrix.needsUpdate = true;
    this.group.add(this.advancedForms);
  }

  setState(state: BiosphereEvolutionState): void {
    this.state = state;
    this.group.visible = this.transitionOpacity > 0.001 && state.active;
    if (!this.group.visible) return;
    this.activityMaterial.opacity = this.transitionOpacity * Math.min(0.72, state.ecosystem.biomassIndex * 0.72);
    this.networkMaterial.opacity = this.transitionOpacity * Math.min(0.55, state.horizontalExchange.networkConnectivity * 0.55);
    const advanced = Math.max(state.eukaryogenesis.cellularComplexity, state.multicellularity.groupSelection);
    this.advancedMaterial.opacity = this.transitionOpacity * Math.min(0.72, advanced * 0.72);
    this.advancedForms.visible = state.eukaryogenesis.established || state.multicellularity.established;
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (this.state) this.setState(this.state);
    else this.group.visible = false;
  }

  update(timeMs: number): void {
    this.group.rotation.y = timeMs * 0.000008;
  }
}
