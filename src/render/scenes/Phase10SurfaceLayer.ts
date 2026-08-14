import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiosphereEvolutionState } from '../../science/biology/biosphere';
import { MatureEcosystemRuntime } from '../../science/biology/ecosystemRuntime';
import type { SurfaceEvolutionState } from '../../science/surface/model';
import { Phase10Inspector } from '../../ui/Phase10Inspector';
import { Phase11Inspector } from '../../ui/Phase11Inspector';
import { Phase11BehaviorLayer } from './Phase11BehaviorLayer';

type Layer = 'primary' | 'consumer' | 'upper' | 'recycler' | 'pulse';

export class Phase10SurfaceLayer {
  readonly group = new THREE.Group();
  private readonly materials = new Map<Layer, THREE.PointsMaterial>();
  private readonly model: MatureEcosystemRuntime;
  private readonly inspector: Phase10Inspector;
  private readonly behavior: Phase11BehaviorLayer;
  private readonly behaviorInspector: Phase11Inspector;
  private opacity = 0;
  private surface: SurfaceEvolutionState | null = null;
  private biosphere: BiosphereEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase10-mature-ecosystem';
    this.model = new MatureEcosystemRuntime(seed);
    this.inspector = new Phase10Inspector();
    this.behavior = new Phase11BehaviorLayer(seed);
    this.behaviorInspector = new Phase11Inspector();
    this.addLayer(seed, 'primary', 1800, 1.004, 0x5adb7a, 0.0026);
    this.addLayer(seed, 'consumer', 900, 1.006, 0x67cae8, 0.0032);
    this.addLayer(seed, 'upper', 420, 1.008, 0xe68191, 0.0041);
    this.addLayer(seed, 'recycler', 1200, 1.003, 0xd6ac70, 0.0025);
    this.addLayer(seed, 'pulse', 560, 1.010, 0xffd39a, 0.0045);
    this.group.add(this.behavior.group);
  }

  setState(surface: SurfaceEvolutionState, biosphere: BiosphereEvolutionState): void {
    this.surface = surface;
    this.biosphere = biosphere;
    const state = this.model.stateAt(biosphere, surface);
    this.inspector.setState(state);
    const behaviorState = this.behavior.setState(state, biosphere, surface);
    this.behaviorInspector.setState(behaviorState);
    if (!state.active || !surface.planet) {
      this.group.visible = false;
      return;
    }
    this.group.visible = this.opacity > 0.001;
    this.set('primary', state.foodWeb.producerBiomass * 0.70);
    this.set('consumer', state.foodWeb.primaryConsumerBiomass * 0.84);
    this.set('upper', state.foodWeb.secondaryConsumerBiomass);
    this.set('recycler', state.foodWeb.decomposerBiomass * 0.70);
    this.set('pulse', state.turnover.pulseIntensity * 0.82);
  }

  setTransitionOpacity(opacity: number): void {
    this.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    this.behavior.setTransitionOpacity(this.opacity);
    if (this.surface && this.biosphere) this.setState(this.surface, this.biosphere);
  }

  update(timeMs: number): void {
    this.group.rotation.y = timeMs * 0.0000105;
    this.behavior.update(timeMs);
  }

  private set(layer: Layer, value: number): void {
    const material = this.materials.get(layer);
    if (material) material.opacity = this.opacity * THREE.MathUtils.clamp(value, 0, 0.84);
  }

  private addLayer(seed: string, layer: Layer, count: number, radius: number, color: number, size: number): void {
    const rng = createRandomStream(seed, `phase10/render-${layer}`);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const z = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const xy = Math.sqrt(Math.max(0, 1 - z * z));
      const r = radius + rng.range(-0.00045, 0.00045);
      positions[i * 3] = Math.cos(theta) * xy * r;
      positions[i * 3 + 1] = z * r;
      positions[i * 3 + 2] = Math.sin(theta) * xy * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    this.materials.set(layer, material);
    this.group.add(new THREE.Points(geometry, material));
  }
}
