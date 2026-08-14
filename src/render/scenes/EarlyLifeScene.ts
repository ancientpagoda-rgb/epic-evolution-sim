import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiologicalEvolutionState, ReplicatorVariantState } from '../../science/biology/model';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function variantColor(variant: ReplicatorVariantState): THREE.Color {
  const hue = variant.parasite ? 0.985 : (0.34 + variant.id * 0.047) % 1;
  const saturation = variant.parasite ? 0.72 : 0.58;
  const lightness = variant.parasite ? 0.58 : 0.60;
  return new THREE.Color().setHSL(hue, saturation, lightness);
}

export class EarlyLifeScene {
  readonly group = new THREE.Group();
  private readonly cellsGroup = new THREE.Group();
  private readonly replicatorsGroup = new THREE.Group();
  private readonly resourceMaterial: THREE.PointsMaterial;
  private readonly energyMaterial: THREE.PointsMaterial;
  private readonly cellMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly cellMeshes: THREE.Mesh[] = [];
  private readonly replicatorMaterials: THREE.LineBasicMaterial[] = [];
  private readonly replicatorLines: THREE.Line[] = [];
  private readonly cellVariantIds: number[] = [];
  private transitionOpacity = 0;
  private state: BiologicalEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase8-early-life';

    const resourceGeometry = this.createPointCloud(seed, 'resources', 2600, 7.6, 3.6);
    this.resourceMaterial = new THREE.PointsMaterial({
      color: 0xc6f6d5,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const resources = new THREE.Points(resourceGeometry, this.resourceMaterial);
    resources.name = 'phase8-resource-field';
    this.group.add(resources);

    const energyGeometry = this.createPointCloud(seed, 'energy', 900, 6.8, 3.1);
    this.energyMaterial = new THREE.PointsMaterial({
      color: 0x92f5c8,
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const energy = new THREE.Points(energyGeometry, this.energyMaterial);
    energy.name = 'phase8-metabolic-energy';
    this.group.add(energy);

    this.group.add(this.cellsGroup);
    this.group.add(this.replicatorsGroup);
    this.createCells(seed);
  }

  setState(state: BiologicalEvolutionState): void {
    this.state = state;
    const visible = this.transitionOpacity > 0.001 && state.active;
    this.group.visible = visible;
    if (!visible) return;

    const population = clamp(state.population.abundanceIndex * 5.4 + 0.08);
    const activeCells = Math.max(3, Math.floor(this.cellMeshes.length * population));
    const variantMap = new Map(state.variants.map(variant => [variant.id, variant] as const));
    const cumulative: Array<{ id: number; cumulative: number }> = [];
    let sum = 0;
    for (const variant of state.variants) {
      sum += variant.frequency;
      cumulative.push({ id: variant.id, cumulative: sum });
    }

    for (let i = 0; i < this.cellMeshes.length; i += 1) {
      const mesh = this.cellMeshes[i]!;
      const material = this.cellMaterials[i]!;
      const line = this.replicatorLines[i]!;
      const lineMaterial = this.replicatorMaterials[i]!;
      const active = i < activeCells;
      mesh.visible = active;
      line.visible = active;
      if (!active) continue;

      const sample = ((i * 0.61803398875) % 1) * Math.max(1e-9, sum);
      const chosen = cumulative.find(entry => sample <= entry.cumulative)?.id ?? state.variants[0]?.id ?? 0;
      this.cellVariantIds[i] = chosen;
      const variant = variantMap.get(chosen) ?? state.variants[0];
      if (!variant) continue;
      const color = variantColor(variant);
      material.color.copy(color);
      material.emissive.copy(color).multiplyScalar(0.08 + state.metabolism.energyCapture * 0.18);
      material.opacity = this.transitionOpacity * clamp(0.42 + 0.48 * state.heredity.compartmentInheritance);
      lineMaterial.color.copy(color).offsetHSL(0.08, 0, 0.12);
      lineMaterial.opacity = this.transitionOpacity * clamp(0.22 + 0.68 * state.heredity.templateReplication);
      const growth = 0.72 + 0.62 * state.metabolism.growthCoupling + 0.18 * variant.catalyticCoupling;
      mesh.scale.set(growth, growth * (0.82 + 0.25 * variant.copyingFidelity), growth);
      line.scale.setScalar(0.72 + 0.35 * state.heredity.templateReplication);
    }

    this.resourceMaterial.opacity = this.transitionOpacity * clamp(0.08 + state.metabolism.resourceUptake * 0.36);
    this.energyMaterial.opacity = this.transitionOpacity * clamp(0.04 + state.metabolism.energyCapture * 0.52);
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = clamp(opacity);
    if (this.state) this.setState(this.state);
    else this.group.visible = false;
  }

  update(timeMs: number): void {
    if (!this.state?.active) return;
    const speed = 0.00002 + this.state.population.selectionStrength * 0.000035;
    this.cellsGroup.rotation.y = timeMs * speed;
    const resources = this.group.getObjectByName('phase8-resource-field');
    const energy = this.group.getObjectByName('phase8-metabolic-energy');
    if (resources) resources.rotation.y = -timeMs * 0.000018;
    if (energy) energy.rotation.y = timeMs * 0.000032;

    const pulse = 1 + Math.sin(timeMs * 0.0015) * 0.025 * this.state.metabolism.growthCoupling;
    for (let i = 0; i < this.cellMeshes.length; i += 1) {
      const mesh = this.cellMeshes[i]!;
      if (!mesh.visible) continue;
      const phase = i * 0.37;
      const localPulse = pulse + Math.sin(timeMs * 0.0011 + phase) * 0.018;
      mesh.scale.multiplyScalar(localPulse / Math.max(0.001, mesh.userData.lastPulse ?? 1));
      mesh.userData.lastPulse = localPulse;
      mesh.rotation.x += 0.0008 + (i % 5) * 0.00008;
      mesh.rotation.z -= 0.0005 + (i % 7) * 0.00004;
      const line = this.replicatorLines[i]!;
      line.rotation.y = -timeMs * (0.00008 + (i % 4) * 0.00001);
    }
  }

  private createPointCloud(seed: string, stream: string, count: number, radius: number, halfHeight: number): THREE.BufferGeometry {
    const rng = createRandomStream(seed, `phase8/render-${stream}`);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.next()) * radius;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = rng.range(-halfHeight, halfHeight);
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  private createCells(seed: string): void {
    const rng = createRandomStream(seed, 'phase8/render-cells');
    const membraneGeometry = new THREE.SphereGeometry(0.38, 30, 20);
    for (let i = 0; i < 120; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x87dfba,
        emissive: 0x0d2d20,
        roughness: 0.48,
        metalness: 0,
        transparent: true,
        opacity: 0,
      });
      const cell = new THREE.Mesh(membraneGeometry, material);
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(0.7, 6.4);
      cell.position.set(Math.cos(angle) * radius, rng.range(-2.7, 2.9), Math.sin(angle) * radius);
      cell.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), rng.range(0, Math.PI));
      cell.userData.lastPulse = 1;
      cell.name = `phase8-cell-${i}`;
      this.cellMaterials.push(material);
      this.cellMeshes.push(cell);
      this.cellsGroup.add(cell);

      const points: THREE.Vector3[] = [];
      const turns = rng.range(1.2, 3.2);
      const segments = 28;
      for (let s = 0; s < segments; s += 1) {
        const t = s / (segments - 1);
        const theta = t * Math.PI * 2 * turns;
        const r = 0.18 * (0.75 + 0.25 * Math.sin(t * Math.PI));
        points.push(new THREE.Vector3(Math.cos(theta) * r, (t - 0.5) * 0.42, Math.sin(theta) * r));
      }
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xe7fff4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.position.copy(cell.position);
      line.rotation.copy(cell.rotation);
      line.name = `phase8-replicator-${i}`;
      this.replicatorMaterials.push(lineMaterial);
      this.replicatorLines.push(line);
      this.replicatorsGroup.add(line);
      this.cellVariantIds.push(0);
    }
  }
}
