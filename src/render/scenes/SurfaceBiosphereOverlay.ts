import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiosphereEvolutionState } from '../../science/biology/biosphere';
import type { SurfaceEvolutionState } from '../../science/surface/model';
import { Phase10SurfaceLayer } from './Phase10SurfaceLayer';

export class SurfaceBiosphereOverlay {
  readonly group = new THREE.Group();
  private readonly biomassMaterial: THREE.PointsMaterial;
  private readonly atmosphereMaterial: THREE.MeshBasicMaterial;
  private readonly atmosphere: THREE.Mesh;
  private readonly matureEcosystem: Phase10SurfaceLayer;
  private opacity = 0;
  private surface: SurfaceEvolutionState | null = null;
  private biosphere: BiosphereEvolutionState | null = null;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase9/surface-overlay');
    const positions = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i += 1) {
      const z = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const xy = Math.sqrt(Math.max(0, 1 - z * z));
      positions[i * 3] = Math.cos(theta) * xy * 1.003;
      positions[i * 3 + 1] = z * 1.003;
      positions[i * 3 + 2] = Math.sin(theta) * xy * 1.003;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.biomassMaterial = new THREE.PointsMaterial({ color: 0x4fd37c, size: 0.0028, transparent: true, opacity: 0, depthWrite: false });
    this.group.add(new THREE.Points(geometry, this.biomassMaterial));

    this.atmosphereMaterial = new THREE.MeshBasicMaterial({ color: 0x72b8ef, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 32), this.atmosphereMaterial);
    this.group.add(this.atmosphere);

    this.matureEcosystem = new Phase10SurfaceLayer(seed);
    this.group.add(this.matureEcosystem.group);
  }

  setState(surface: SurfaceEvolutionState, biosphere: BiosphereEvolutionState): void {
    this.surface = surface;
    this.biosphere = biosphere;
    this.matureEcosystem.setState(surface, biosphere);
    if (!surface.active || !biosphere.active) {
      this.group.visible = false;
      return;
    }
    this.group.visible = this.opacity > 0.001;
    this.group.scale.setScalar(surface.radiusKm);
    this.biomassMaterial.opacity = this.opacity * Math.min(0.62, biosphere.ecosystem.biomassIndex * 0.62);
    const greenShift = Math.min(1, biosphere.guilds.oxygenicPhotosynthesis + biosphere.ecosystem.producerIndex);
    this.biomassMaterial.color.setHSL(0.30 + 0.05 * greenShift, 0.65, 0.55);
    this.atmosphereMaterial.opacity = this.opacity * Math.min(0.16, biosphere.feedback.oxygenFraction * 0.5 + biosphere.feedback.ozoneIndex * 0.06);
  }

  setTransitionOpacity(opacity: number): void {
    this.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    this.matureEcosystem.setTransitionOpacity(this.opacity);
    if (this.surface && this.biosphere) this.setState(this.surface, this.biosphere);
  }

  update(timeMs: number): void {
    this.group.rotation.y = timeMs * 0.000012;
    this.matureEcosystem.update(timeMs);
  }
}
