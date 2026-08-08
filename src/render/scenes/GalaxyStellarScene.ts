import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { CosmologyState } from '../../science/cosmology/model';
import type { GalaxyState } from '../../science/galaxies/model';
import {
  type StellarPopulationModel,
  type StellarPopulationState,
  type StellarSnapshot,
} from '../../science/stars/model';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function temperatureColor(kelvin: number, target: THREE.Color): THREE.Color {
  if (kelvin <= 0) return target.setRGB(0.08, 0.1, 0.14);
  const temperature = clamp(kelvin / 100, 10, 400);
  let red: number;
  let green: number;
  let blue: number;
  if (temperature <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    blue = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * (temperature - 60) ** -0.1332047592;
    green = 288.1221695283 * (temperature - 60) ** -0.0755148492;
    blue = 255;
  }
  return target.setRGB(
    clamp(red, 0, 255) / 255,
    clamp(green, 0, 255) / 255,
    clamp(blue, 0, 255) / 255,
  );
}

function snapshotBrightness(snapshot: StellarSnapshot): number {
  if (snapshot.stage === 'unborn') return 0;
  if (snapshot.stage === 'black-hole') return 0.015;
  if (snapshot.stage === 'neutron-star') return 0.15;
  if (snapshot.stage === 'white-dwarf') return 0.28;
  return clamp(0.18 + Math.log10(1 + snapshot.luminositySolar) * 0.28, 0.18, 1);
}

export class GalaxyStellarScene {
  readonly galacticGroup = new THREE.Group();
  readonly stellarGroup = new THREE.Group();
  private readonly starPositions: Float32Array;
  private readonly starColors: Float32Array;
  private readonly starGeometry: THREE.BufferGeometry;
  private readonly starMaterial: THREE.PointsMaterial;
  private readonly cloudMaterial: THREE.PointsMaterial;
  private readonly bulgeMaterial: THREE.MeshBasicMaterial;
  private readonly haloMaterial: THREE.MeshBasicMaterial;
  private readonly selectedStarMaterial: THREE.MeshBasicMaterial;
  private readonly selectedStarGlowMaterial: THREE.PointsMaterial;
  private readonly protostellarDustMaterial: THREE.PointsMaterial;
  private transitionOpacityGalactic = 0;
  private transitionOpacityStellar = 0;
  private galaxyState: GalaxyState | null = null;
  private populationState: StellarPopulationState | null = null;

  constructor(seed: string, private readonly stellarModel: StellarPopulationModel) {
    this.galacticGroup.name = 'phase4-galaxy';
    this.stellarGroup.name = 'phase4-selected-stellar-system';

    const starCount = stellarModel.stars.length;
    this.starPositions = new Float32Array(starCount * 3);
    this.starColors = new Float32Array(starCount * 3);
    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    this.starMaterial = new THREE.PointsMaterial({
      size: 0.055,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.galacticGroup.add(new THREE.Points(this.starGeometry, this.starMaterial));

    this.bulgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd7a0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20), this.bulgeMaterial);
    bulge.scale.set(1.2, 0.48, 1.2);
    this.galacticGroup.add(bulge);

    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x6556a9,
      transparent: true,
      opacity: 0,
      wireframe: true,
      depthWrite: false,
    });
    this.galacticGroup.add(new THREE.Mesh(new THREE.SphereGeometry(12, 20, 12), this.haloMaterial));

    const cloudGeometry = this.createMolecularCloudGeometry(seed);
    this.cloudMaterial = new THREE.PointsMaterial({
      color: 0x82b7d8,
      size: 0.11,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.galacticGroup.add(new THREE.Points(cloudGeometry, this.cloudMaterial));

    const selectedStarRadiusAu = 0.00465047;
    this.selectedStarMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdfb0,
      transparent: true,
      opacity: 0,
    });
    const selectedStar = new THREE.Mesh(
      new THREE.SphereGeometry(selectedStarRadiusAu, 48, 24),
      this.selectedStarMaterial,
    );
    selectedStar.name = 'selected-star-physical-radius';
    this.stellarGroup.add(selectedStar);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    this.selectedStarGlowMaterial = new THREE.PointsMaterial({
      color: 0xffdfb0,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.stellarGroup.add(new THREE.Points(glowGeometry, this.selectedStarGlowMaterial));

    const dust = this.createProtostellarDust(seed);
    this.protostellarDustMaterial = dust.material as THREE.PointsMaterial;
    this.stellarGroup.add(dust);
  }

  setStates(cosmology: CosmologyState, galaxy: GalaxyState, population: StellarPopulationState): void {
    this.galaxyState = galaxy;
    this.populationState = population;
    this.updateGalaxyGeometry(cosmology, galaxy);
    this.updateStellarVisual(population.selectedStar);
    this.applyOpacities();
  }

  setGalacticOpacity(opacity: number): void {
    this.transitionOpacityGalactic = clamp(opacity, 0, 1);
    this.applyOpacities();
  }

  setStellarOpacity(opacity: number): void {
    this.transitionOpacityStellar = clamp(opacity, 0, 1);
    this.applyOpacities();
  }

  update(timeMs: number): void {
    this.galacticGroup.rotation.y = timeMs * 0.000012;
    const snapshot = this.populationState?.selectedStar;
    if (snapshot?.stage === 'unborn') {
      this.stellarGroup.rotation.y = timeMs * 0.00002;
    }
  }

  private updateGalaxyGeometry(cosmology: CosmologyState, galaxy: GalaxyState): void {
    const tempColor = new THREE.Color();
    const ageYears = cosmology.ageSeconds / 31_557_600;
    const scale = clamp(galaxy.diskScaleKpc / 3.2, 0.18, 2.6);
    const verticalScale = 0.15 + galaxy.bulgeFraction * 0.8;

    for (let i = 0; i < this.stellarModel.stars.length; i += 1) {
      const star = this.stellarModel.stars[i]!;
      const snapshot = this.stellarModel.snapshot(star, ageYears);
      const radial = star.radialFraction * 8.6;
      const spiralAngle = star.armPhase + radial * (0.5 + galaxy.diskFraction * 0.38);
      const diskX = Math.cos(spiralAngle) * radial * scale;
      const diskZ = Math.sin(spiralAngle) * radial * scale;
      const diskY = star.verticalScatter * verticalScale * scale;
      const bulgeBlend = galaxy.bulgeFraction * (1 - star.radialFraction) ** 1.6;
      const base = i * 3;
      this.starPositions[base] = diskX * (1 - bulgeBlend) + Math.cos(star.armPhase) * radial * 0.22 * bulgeBlend;
      this.starPositions[base + 1] = diskY * (1 - bulgeBlend) + star.verticalScatter * 1.3 * bulgeBlend;
      this.starPositions[base + 2] = diskZ * (1 - bulgeBlend) + Math.sin(star.armPhase) * radial * 0.22 * bulgeBlend;

      const brightness = snapshotBrightness(snapshot);
      temperatureColor(snapshot.temperatureK, tempColor).multiplyScalar(brightness);
      this.starColors[base] = tempColor.r;
      this.starColors[base + 1] = tempColor.g;
      this.starColors[base + 2] = tempColor.b;
    }
    (this.starGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.starGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateStellarVisual(snapshot: StellarSnapshot): void {
    const color = temperatureColor(snapshot.temperatureK, new THREE.Color());
    if (snapshot.stage === 'white-dwarf') color.set(0xbfd8ff);
    if (snapshot.stage === 'neutron-star') color.set(0xc8e7ff);
    if (snapshot.stage === 'black-hole') color.set(0x080b12);
    this.selectedStarMaterial.color.copy(color);
    this.selectedStarGlowMaterial.color.copy(color);

    const starMesh = this.stellarGroup.getObjectByName('selected-star-physical-radius') as THREE.Mesh | undefined;
    if (starMesh) {
      const visualRadiusSolar = Math.max(0.1, snapshot.radiusSolar);
      starMesh.scale.setScalar(visualRadiusSolar);
    }

    const isYoung = snapshot.stage === 'unborn' || snapshot.ageYears < 12e6;
    this.protostellarDustMaterial.opacity = this.transitionOpacityStellar * (isYoung ? 0.62 : 0.08);
  }

  private applyOpacities(): void {
    const galaxy = this.galaxyState;
    const population = this.populationState;
    const galaxyFormation = galaxy?.formed ? 1 : 0.05;
    const livingFraction = population && population.formedCount > 0
      ? population.livingCount / population.formedCount
      : 0;
    this.starMaterial.opacity = this.transitionOpacityGalactic * galaxyFormation * clamp(0.2 + livingFraction, 0.2, 1);
    this.cloudMaterial.opacity = this.transitionOpacityGalactic * galaxyFormation
      * clamp((galaxy?.molecularGasFraction ?? 0) * 0.9 + (galaxy?.starFormationRateSolarPerYear ?? 0) * 0.015, 0.05, 0.58);
    this.bulgeMaterial.opacity = this.transitionOpacityGalactic * galaxyFormation * (0.08 + (galaxy?.bulgeFraction ?? 0) * 0.34);
    this.haloMaterial.opacity = this.transitionOpacityGalactic * 0.09;
    this.galacticGroup.visible = this.transitionOpacityGalactic > 0.001;

    const selected = population?.selectedStar;
    const born = selected && selected.stage !== 'unborn';
    const blackHole = selected?.stage === 'black-hole';
    this.selectedStarMaterial.opacity = this.transitionOpacityStellar * (born ? (blackHole ? 0.12 : 1) : 0);
    this.selectedStarGlowMaterial.opacity = this.transitionOpacityStellar * (born ? (blackHole ? 0.03 : 0.8) : 0);
    this.stellarGroup.visible = this.transitionOpacityStellar > 0.001;
  }

  private createMolecularCloudGeometry(seed: string): THREE.BufferGeometry {
    const rng = createRandomStream(seed, 'phase4/molecular-clouds');
    const count = 1100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = Math.sqrt(rng.next()) * 8.3;
      const arm = rng.int(0, 3);
      const angle = r * 0.72 + arm * Math.PI / 2 + rng.range(-0.25, 0.25);
      positions[i * 3] = Math.cos(angle) * r + rng.range(-0.35, 0.35);
      positions[i * 3 + 1] = rng.range(-0.18, 0.18);
      positions[i * 3 + 2] = Math.sin(angle) * r + rng.range(-0.35, 0.35);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  private createProtostellarDust(seed: string): THREE.Points {
    const rng = createRandomStream(seed, 'phase4/selected-star-dust');
    const count = 2600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 0.08 + Math.sqrt(rng.next()) * 12;
      const angle = rng.range(0, Math.PI * 2);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (rng.next() + rng.next() - 1) * (0.05 + radius * 0.018);
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xc39b72,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return new THREE.Points(geometry, material);
  }
}
