import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiosphereEvolutionState } from '../../science/biology/biosphere';
import type { MatureEcosystemState } from '../../science/biology/ecosystem';
import { NeurobehaviorEvolutionModel, type BehavioralEvolutionState } from '../../science/biology/neurobehavior';
import type { SurfaceEvolutionState } from '../../science/surface/model';

type AgentField = {
  points: THREE.Points;
  positions: THREE.BufferAttribute;
  phases: Float32Array;
  latitudes: Float32Array;
  speeds: Float32Array;
  material: THREE.PointsMaterial;
};

export class Phase11BehaviorLayer {
  readonly group = new THREE.Group();
  private readonly model: NeurobehaviorEvolutionModel;
  private readonly mobile: AgentField;
  private readonly social: AgentField;
  private readonly mobilePresentation: boolean;
  private opacity = 0;
  private state: BehavioralEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase11-adaptive-behavior';
    this.model = new NeurobehaviorEvolutionModel(seed);
    this.mobilePresentation = window.matchMedia('(max-width: 760px)').matches;

    this.mobile = this.makeAgents(
      seed,
      'mobile',
      this.mobilePresentation ? 160 : 96,
      0xc9efff,
      0.0040,
      this.mobilePresentation ? 6.5 : null,
    );
    this.social = this.makeAgents(
      seed,
      'social',
      this.mobilePresentation ? 80 : 48,
      0xffe0a0,
      0.0048,
      this.mobilePresentation ? 7.5 : null,
    );
    this.group.add(this.mobile.points, this.social.points);
  }

  setState(ecosystem: MatureEcosystemState, biosphere: BiosphereEvolutionState, surface: SurfaceEvolutionState): BehavioralEvolutionState {
    this.state = this.model.stateAt(ecosystem, biosphere, surface);
    if (!this.state.active) {
      this.group.visible = false;
      return this.state;
    }

    this.group.visible = this.opacity > 0.001;
    const mobileBoost = this.mobilePresentation ? 0.22 : 0;
    this.mobile.material.opacity = this.opacity * THREE.MathUtils.clamp(
      0.18 + mobileBoost + 0.66 * this.state.locomotion.mobility + 0.16 * this.state.strategies.foraging,
      0,
      this.mobilePresentation ? 0.96 : 0.84,
    );
    this.social.material.opacity = this.opacity * THREE.MathUtils.clamp(
      (this.mobilePresentation ? 0.10 : 0) + this.state.social.aggregation * (0.30 + 0.70 * this.state.social.communication),
      0,
      this.mobilePresentation ? 0.92 : 0.76,
    );
    return this.state;
  }

  setTransitionOpacity(opacity: number): void {
    this.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (!this.state) return;
    this.mobile.material.opacity *= this.opacity;
    this.social.material.opacity *= this.opacity;
    this.group.visible = this.opacity > 0.001 && this.state.active;
  }

  update(timeMs: number): void {
    if (!this.state?.active || !this.group.visible) return;
    const t = timeMs * 0.000001;
    this.updateField(this.mobile, t, this.state.locomotion.mobility, this.state.locomotion.maneuverability, 0);
    this.updateField(this.social, t, this.state.locomotion.mobility, this.state.social.aggregation, this.state.social.communication);
  }

  getState(): BehavioralEvolutionState | null { return this.state; }

  private makeAgents(
    seed: string,
    stream: string,
    count: number,
    color: number,
    worldSize: number,
    screenPixelSize: number | null,
  ): AgentField {
    const rng = createRandomStream(seed, `phase11/render-${stream}`);
    const raw = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const latitudes = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      phases[i] = rng.range(0, Math.PI * 2);
      latitudes[i] = rng.range(-1.05, 1.05);
      speeds[i] = rng.range(0.35, 1.5);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(raw, 3);
    geometry.setAttribute('position', positions);
    const material = new THREE.PointsMaterial({
      color,
      size: screenPixelSize ?? worldSize,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: screenPixelSize === null,
    });
    return { points: new THREE.Points(geometry, material), positions, phases, latitudes, speeds, material };
  }

  private updateField(field: AgentField, t: number, mobility: number, coherence: number, communication: number): void {
    const array = field.positions.array as Float32Array;
    const radius = 1.016;
    const commonPhase = t * (0.65 + 1.2 * mobility);
    for (let i = 0; i < field.phases.length; i += 1) {
      const localPhase = field.phases[i] ?? 0;
      const speed = field.speeds[i] ?? 1;
      const cluster = THREE.MathUtils.lerp(localPhase, commonPhase, coherence * communication * 0.48);
      const longitude = cluster + t * speed * (0.45 + 1.8 * mobility);
      const baseLat = field.latitudes[i] ?? 0;
      const latitude = THREE.MathUtils.clamp(
        baseLat + Math.sin(t * speed * 1.7 + localPhase) * 0.22 * (0.25 + coherence),
        -1.35,
        1.35,
      );
      const cosLat = Math.cos(latitude);
      const index = i * 3;
      array[index] = Math.cos(longitude) * cosLat * radius;
      array[index + 1] = Math.sin(latitude) * radius;
      array[index + 2] = Math.sin(longitude) * cosLat * radius;
    }
    field.positions.needsUpdate = true;
  }
}
