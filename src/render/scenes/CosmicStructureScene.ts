import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { CosmologyState } from '../../science/cosmology/model';
import { ZeldovichField } from '../../science/cosmology/perturbations';
import type { HaloSeed } from '../../science/galaxies/model';

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class CosmicStructureScene {
  readonly group = new THREE.Group();
  private readonly structureRoot = new THREE.Group();
  private readonly field: ZeldovichField;
  private readonly selectedHaloIndex: number;
  private readonly darkPositions: Float32Array;
  private readonly baryonFullPositions: Float32Array;
  private readonly baryonPositions: Float32Array;
  private readonly baryonIndices: Uint32Array;
  private readonly darkGeometry = new THREE.BufferGeometry();
  private readonly baryonGeometry = new THREE.BufferGeometry();
  private readonly darkMaterial = new THREE.PointsMaterial({
    size: 0.07,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly baryonMaterial = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    color: 0xf2f6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly cmbMaterial = new THREE.PointsMaterial({
    size: 0.075,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly plasmaMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc285,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    depthWrite: false,
  });
  private readonly haloMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  );
  private transitionOpacity = 1;
  private state: CosmologyState | null = null;

  constructor(seed: string, field?: ZeldovichField, halo?: HaloSeed) {
    this.group.name = 'phase3-cosmic-structure';
    this.structureRoot.name = 'selected-halo-centered-structure';
    this.group.add(this.structureRoot);
    this.field = field ?? new ZeldovichField(seed, { gridSize: 18, boxSize: 32, modeCount: 96 });
    if (halo) this.selectedHaloIndex = halo.particleIndex;
    else {
      let densest = 0;
      for (let i = 1; i < this.field.densityProxy.length; i += 1) {
        if ((this.field.densityProxy[i] ?? -Infinity) > (this.field.densityProxy[densest] ?? -Infinity)) densest = i;
      }
      this.selectedHaloIndex = densest;
    }

    this.darkPositions = new Float32Array(this.field.lagrangian.length);
    this.baryonFullPositions = new Float32Array(this.field.lagrangian.length);
    this.field.writePositions(0, this.darkPositions);
    this.field.writePositions(0, this.baryonFullPositions);

    const darkColors = new Float32Array(this.field.particleCount * 3);
    const underdense = new THREE.Color(0x294c91);
    const overdense = new THREE.Color(0xa783ff);
    for (let i = 0; i < this.field.particleCount; i += 1) {
      const mix = ((this.field.densityProxy[i] ?? 0) + 1) * 0.5;
      const color = underdense.clone().lerp(overdense, mix);
      darkColors[i * 3] = color.r;
      darkColors[i * 3 + 1] = color.g;
      darkColors[i * 3 + 2] = color.b;
    }
    this.darkGeometry.setAttribute('position', new THREE.BufferAttribute(this.darkPositions, 3));
    this.darkGeometry.setAttribute('color', new THREE.BufferAttribute(darkColors, 3));
    this.structureRoot.add(new THREE.Points(this.darkGeometry, this.darkMaterial));

    const selected: number[] = [];
    for (let i = 0; i < this.field.particleCount; i += 1) {
      if ((this.field.densityProxy[i] ?? -1) > -0.08 && i % 2 === 0) selected.push(i);
    }
    this.baryonIndices = Uint32Array.from(selected);
    this.baryonPositions = new Float32Array(this.baryonIndices.length * 3);
    this.baryonGeometry.setAttribute('position', new THREE.BufferAttribute(this.baryonPositions, 3));
    this.structureRoot.add(new THREE.Points(this.baryonGeometry, this.baryonMaterial));

    this.group.add(this.createCmbShell(seed));
    const plasma = new THREE.Mesh(new THREE.SphereGeometry(17.2, 64, 40), this.plasmaMaterial);
    plasma.name = 'opaque-primordial-plasma';
    this.group.add(plasma);
    this.structureRoot.add(this.haloMarker);
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = Math.min(1, Math.max(0, opacity));
    this.applyVisualState();
  }

  setCosmologyState(state: CosmologyState): void {
    this.state = state;
    this.field.writePositions(state.growthNormalized, this.darkPositions);
    this.field.writePositions(state.growthNormalized, this.baryonFullPositions, state.recombinationProgress);

    const haloBase = this.selectedHaloIndex * 3;
    const haloX = this.darkPositions[haloBase] ?? 0;
    const haloY = this.darkPositions[haloBase + 1] ?? 0;
    const haloZ = this.darkPositions[haloBase + 2] ?? 0;
    this.structureRoot.position.set(-haloX, -haloY, -haloZ);
    this.haloMarker.position.set(haloX, haloY, haloZ);

    const darkAttribute = this.darkGeometry.getAttribute('position') as THREE.BufferAttribute;
    darkAttribute.needsUpdate = true;

    for (let i = 0; i < this.baryonIndices.length; i += 1) {
      const sourceIndex = this.baryonIndices[i] ?? 0;
      const sourceBase = sourceIndex * 3;
      const targetBase = i * 3;
      this.baryonPositions[targetBase] = this.baryonFullPositions[sourceBase] ?? 0;
      this.baryonPositions[targetBase + 1] = this.baryonFullPositions[sourceBase + 1] ?? 0;
      this.baryonPositions[targetBase + 2] = this.baryonFullPositions[sourceBase + 2] ?? 0;
    }
    const baryonAttribute = this.baryonGeometry.getAttribute('position') as THREE.BufferAttribute;
    baryonAttribute.needsUpdate = true;
    this.applyVisualState();
  }

  update(timeMs: number): void {
    this.group.rotation.y = timeMs * 0.0000025;
  }

  private createCmbShell(seed: string): THREE.Points {
    const rng = createRandomStream(seed, 'phase3/cmb-anisotropy');
    const count = 4200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cool = new THREE.Color(0x5a88ff);
    const warm = new THREE.Color(0xffb878);
    for (let i = 0; i < count; i += 1) {
      const z = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const radius = 16.5;
      positions[i * 3] = Math.cos(theta) * radial * radius;
      positions[i * 3 + 1] = z * radius;
      positions[i * 3 + 2] = Math.sin(theta) * radial * radius;
      const anisotropy = Math.max(-2.5, Math.min(2.5, (rng.next() + rng.next() + rng.next() - 1.5) * 1.8));
      const color = cool.clone().lerp(warm, 0.5 + anisotropy * 0.12);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, this.cmbMaterial);
    points.name = 'cmb-last-scattering-shell';
    return points;
  }

  private applyVisualState(): void {
    const state = this.state;
    if (!state) return;
    const recombination = state.recombinationProgress;
    const ageYears = state.ageSeconds / 31_557_600;
    const structure = smoothstep(30e6, 1.2e9, ageYears);
    const cmbPeak = Math.exp(-Math.abs(Math.log10(Math.max(1, ageYears) / 380_000)) * 1.7);
    const factor = this.transitionOpacity;

    this.plasmaMaterial.opacity = factor * (1 - recombination) * 0.42;
    this.cmbMaterial.opacity = factor * (0.055 + 0.68 * cmbPeak) * recombination;
    this.darkMaterial.opacity = factor * recombination * (0.13 + 0.72 * structure);
    this.baryonMaterial.opacity = factor * recombination * structure * 0.72;
    const markerMaterial = this.haloMarker.material as THREE.MeshBasicMaterial;
    markerMaterial.opacity = factor * structure * 0.62;
    this.haloMarker.visible = markerMaterial.opacity > 0.01;
    this.group.visible = factor > 0.001;
  }
}
