import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { ChemicalEvolutionState } from '../../science/chemistry/model';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export class PrebioticChemistryScene {
  readonly group = new THREE.Group();
  private readonly mineralMaterial: THREE.MeshStandardMaterial;
  private readonly waterMaterial: THREE.PointsMaterial;
  private readonly organicsMaterial: THREE.PointsMaterial;
  private readonly polymerMaterial: THREE.LineBasicMaterial;
  private readonly energyMaterial: THREE.PointsMaterial;
  private readonly compartmentMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly compartments: THREE.Mesh[] = [];
  private readonly ventGroup = new THREE.Group();
  private transitionOpacity = 0;
  private state: ChemicalEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase7-prebiotic-chemistry';

    this.mineralMaterial = new THREE.MeshStandardMaterial({
      color: 0x685f54,
      roughness: 0.96,
      metalness: 0.03,
      transparent: true,
      opacity: 0,
    });
    const mineral = new THREE.Mesh(new THREE.BoxGeometry(18, 0.7, 18, 20, 1, 20), this.mineralMaterial);
    mineral.position.y = -3.1;
    mineral.name = 'phase7-mineral-interface';
    this.group.add(mineral);

    const waterGeometry = this.createVolumePoints(seed, 'water', 5200, 8.2, 4.6);
    this.waterMaterial = new THREE.PointsMaterial({
      color: 0x72bde8,
      size: 0.028,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const water = new THREE.Points(waterGeometry, this.waterMaterial);
    water.name = 'phase7-aqueous-medium';
    this.group.add(water);

    const organicGeometry = this.createVolumePoints(seed, 'organics', 1800, 7.4, 3.9);
    this.organicsMaterial = new THREE.PointsMaterial({
      color: 0xffc37c,
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const organics = new THREE.Points(organicGeometry, this.organicsMaterial);
    organics.name = 'phase7-organic-network';
    this.group.add(organics);

    const polymerGeometry = this.createPolymerGeometry(seed);
    this.polymerMaterial = new THREE.LineBasicMaterial({
      color: 0xe9a5ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const polymers = new THREE.LineSegments(polymerGeometry, this.polymerMaterial);
    polymers.name = 'phase7-polymer-proxies';
    this.group.add(polymers);

    const energyGeometry = this.createVolumePoints(seed, 'energy-gradient', 850, 6.8, 3.4);
    this.energyMaterial = new THREE.PointsMaterial({
      color: 0x8fffd2,
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const energy = new THREE.Points(energyGeometry, this.energyMaterial);
    energy.name = 'phase7-energy-gradient';
    this.group.add(energy);

    this.createCompartments(seed);
    this.createVentStructures(seed);
  }

  setState(state: ChemicalEvolutionState): void {
    this.state = state;
    const visible = this.transitionOpacity > 0.001;
    this.group.visible = visible;
    if (!visible) return;

    const activeFactor = state.active ? 1 : 0.12;
    this.mineralMaterial.opacity = this.transitionOpacity * (0.35 + 0.45 * state.mineralCatalysisIndex);
    this.waterMaterial.opacity = this.transitionOpacity * activeFactor * clamp(0.08 + 0.42 * state.suitability);
    this.organicsMaterial.opacity = this.transitionOpacity * activeFactor * clamp(0.05 + 0.72 * state.network.simpleOrganics);
    this.polymerMaterial.opacity = this.transitionOpacity * activeFactor * clamp(0.02 + 0.88 * state.polymerizationIndex);
    this.energyMaterial.opacity = this.transitionOpacity * activeFactor * clamp(0.04 + 0.72 * state.energy.totalGradient);

    const environmentHue = state.environment === 'hydrothermal-interface'
      ? 0.06
      : state.environment === 'wet-dry-mineral'
        ? 0.10
        : state.environment === 'ice-brine'
          ? 0.55
          : 0.42;
    this.mineralMaterial.color.setHSL(environmentHue, 0.28, 0.32);
    this.waterMaterial.color.setHSL(state.environment === 'ice-brine' ? 0.56 : 0.55, 0.62, state.environment === 'ice-brine' ? 0.78 : 0.62);

    const compartmentOpacity = this.transitionOpacity * activeFactor * clamp(state.network.compartments * 0.72);
    for (let i = 0; i < this.compartments.length; i += 1) {
      const mesh = this.compartments[i]!;
      const material = this.compartmentMaterials[i]!;
      material.opacity = compartmentOpacity * (0.45 + 0.55 * ((i % 5) / 4));
      const growth = 0.7 + 0.55 * state.protocellLikeIndex;
      mesh.scale.setScalar(growth);
      mesh.visible = material.opacity > 0.01;
    }

    const hydrothermal = state.routeScores.hydrothermalInterface;
    this.ventGroup.visible = hydrothermal > 0.12;
    this.ventGroup.traverse(object => {
      const mesh = object as THREE.Mesh;
      const material = mesh.material;
      if (material && !Array.isArray(material)) {
        const opacityMaterial = material as THREE.Material & { opacity?: number };
        if (opacityMaterial.opacity !== undefined) opacityMaterial.opacity = this.transitionOpacity * hydrothermal * 0.75;
      }
    });
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = clamp(opacity);
    if (this.state) this.setState(this.state);
    else this.group.visible = opacity > 0.001;
  }

  update(timeMs: number): void {
    const organics = this.group.getObjectByName('phase7-organic-network');
    const energy = this.group.getObjectByName('phase7-energy-gradient');
    if (organics) organics.rotation.y = timeMs * 0.000035;
    if (energy) energy.rotation.y = -timeMs * 0.00005;
    for (let i = 0; i < this.compartments.length; i += 1) {
      const mesh = this.compartments[i]!;
      mesh.rotation.x = timeMs * (0.000015 + i * 0.0000002);
      mesh.rotation.y = -timeMs * (0.000012 + i * 0.00000015);
    }
  }

  private createVolumePoints(seed: string, stream: string, count: number, radius: number, halfHeight: number): THREE.BufferGeometry {
    const rng = createRandomStream(seed, `phase7/render-${stream}`);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.next()) * radius;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = rng.range(-2.65, halfHeight);
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  private createPolymerGeometry(seed: string): THREE.BufferGeometry {
    const rng = createRandomStream(seed, 'phase7/render-polymers');
    const segmentCount = 1200;
    const positions = new Float32Array(segmentCount * 2 * 3);
    for (let i = 0; i < segmentCount; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = Math.sqrt(rng.next()) * 6.2;
      const x = Math.cos(angle) * radius;
      const y = rng.range(-2.1, 3.2);
      const z = Math.sin(angle) * radius;
      const length = rng.range(0.06, 0.28);
      const theta = rng.range(0, Math.PI * 2);
      const phi = rng.range(-0.6, 0.6);
      const base = i * 6;
      positions[base] = x;
      positions[base + 1] = y;
      positions[base + 2] = z;
      positions[base + 3] = x + Math.cos(theta) * Math.cos(phi) * length;
      positions[base + 4] = y + Math.sin(phi) * length;
      positions[base + 5] = z + Math.sin(theta) * Math.cos(phi) * length;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  private createCompartments(seed: string): void {
    const rng = createRandomStream(seed, 'phase7/render-compartments');
    const geometry = new THREE.SphereGeometry(0.34, 24, 16);
    for (let i = 0; i < 26; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xb9ffcf : 0x9ed8ff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(1.0, 6.2);
      mesh.position.set(Math.cos(angle) * radius, rng.range(-1.8, 2.8), Math.sin(angle) * radius);
      mesh.scale.setScalar(rng.range(0.65, 1.45));
      mesh.name = `phase7-compartment-${i}`;
      this.compartmentMaterials.push(material);
      this.compartments.push(mesh);
      this.group.add(mesh);
    }
  }

  private createVentStructures(seed: string): void {
    const rng = createRandomStream(seed, 'phase7/render-vents');
    this.ventGroup.name = 'phase7-hydrothermal-structures';
    for (let i = 0; i < 9; i += 1) {
      const height = rng.range(0.6, 2.4);
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x4e3e34 : 0x756252,
        roughness: 0.96,
        transparent: true,
        opacity: 0,
      });
      const vent = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.18, 0.5), height, 12), material);
      vent.position.set(rng.range(-5, 5), -2.75 + height / 2, rng.range(-5, 5));
      this.ventGroup.add(vent);
    }
    this.group.add(this.ventGroup);
  }
}
