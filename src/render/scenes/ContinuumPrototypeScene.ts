import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { CosmologyState } from '../../science/cosmology/model';
import { ZeldovichField } from '../../science/cosmology/perturbations';
import { GalaxyFormationModel, type GalaxyState } from '../../science/galaxies/model';
import { PlanetFormationModel, type PlanetarySystemState } from '../../science/planets/model';
import { StellarPopulationModel, type StellarPopulationState } from '../../science/stars/model';
import { SurfaceEvolutionModel, type SurfaceEvolutionState } from '../../science/surface/model';
import type { ScaleDomain } from '../camera/referenceFrames';
import type { TransitionVisualController } from '../transitions/TransitionDirector';
import { CosmicStructureScene } from './CosmicStructureScene';
import { GalaxyStellarScene } from './GalaxyStellarScene';
import { PlanetarySystemScene } from './PlanetarySystemScene';
import { SurfacePlanetScene } from './SurfacePlanetScene';

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
  private readonly cosmic: CosmicStructureScene;
  private readonly galaxyModel: GalaxyFormationModel;
  private readonly stellarModel: StellarPopulationModel;
  private readonly galaxyStellar: GalaxyStellarScene;
  private readonly planetModel: PlanetFormationModel;
  private readonly planetaryScene: PlanetarySystemScene;
  private readonly surfaceModel: SurfaceEvolutionModel;
  private readonly surfaceScene: SurfacePlanetScene;
  private galaxyState: GalaxyState | null = null;
  private populationState: StellarPopulationState | null = null;
  private planetaryState: PlanetarySystemState | null = null;
  private surfaceState: SurfaceEvolutionState | null = null;

  constructor(scene: THREE.Scene, seed: string) {
    this.root.name = 'v3-continuum-root';

    const structureField = new ZeldovichField(seed, { gridSize: 18, boxSize: 32, modeCount: 96 });
    this.galaxyModel = new GalaxyFormationModel(seed, structureField);
    this.stellarModel = new StellarPopulationModel(seed, this.galaxyModel);
    const selectedStar = this.stellarModel.stars[this.stellarModel.selectedStarId] ?? this.stellarModel.stars[0]!;
    this.planetModel = new PlanetFormationModel(seed, selectedStar, this.galaxyModel);
    this.surfaceModel = new SurfaceEvolutionModel(seed);
    this.cosmic = new CosmicStructureScene(seed, structureField, this.galaxyModel.halo);
    this.galaxyStellar = new GalaxyStellarScene(seed, this.stellarModel);
    this.planetaryScene = new PlanetarySystemScene(seed, this.planetModel);
    this.surfaceScene = new SurfacePlanetScene(seed);

    this.groups.set('cosmic', this.cosmic.group);
    this.groups.set('galactic', this.galaxyStellar.galacticGroup);
    this.groups.set('stellar', this.galaxyStellar.stellarGroup);
    this.groups.set('planetary', this.planetaryScene.group);
    this.groups.set('surface', this.surfaceScene.group);
    this.groups.set('microscopic', createMicroscopic(seed));

    for (const [domain, group] of this.groups) {
      group.name = `scale-${domain}`;
      this.root.add(group);
    }

    scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x1b2334, 1.35));
    scene.add(this.root);
    this.focus('cosmic');
  }

  setCosmologyState(state: CosmologyState): void {
    this.cosmic.setCosmologyState(state);
    this.galaxyState = this.galaxyModel.stateAtCosmology(state);
    this.populationState = this.stellarModel.stateAtCosmology(state, this.galaxyState);
    this.galaxyStellar.setStates(state, this.galaxyState, this.populationState);
    this.planetaryState = this.planetModel.stateAt(state, this.populationState.selectedStar, this.galaxyState);
    this.planetaryScene.setState(this.planetaryState);
    this.surfaceState = this.surfaceModel.stateAt(state, this.populationState.selectedStar, this.planetaryState);
    this.surfaceScene.setState(this.surfaceState);
  }

  getGalaxyState(): GalaxyState | null {
    return this.galaxyState;
  }

  getStellarPopulationState(): StellarPopulationState | null {
    return this.populationState;
  }

  getPlanetarySystemState(): PlanetarySystemState | null {
    return this.planetaryState;
  }

  getSurfaceEvolutionState(): SurfaceEvolutionState | null {
    return this.surfaceState;
  }

  getGalaxyModel(): GalaxyFormationModel {
    return this.galaxyModel;
  }

  getPlanetFormationModel(): PlanetFormationModel {
    return this.planetModel;
  }

  focus(domain: ScaleDomain): void {
    this.planetaryScene.setSelectedWorldFocus(domain === 'surface' ? 1 : 0);
    for (const [candidate, group] of this.groups) {
      const opacity = candidate === domain ? 1 : 0;
      this.setDomainOpacity(candidate, group, opacity);
    }
  }

  blend(from: ScaleDomain, to: ScaleDomain, progress: number): void {
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    if (from === 'planetary' && to === 'surface') this.planetaryScene.setSelectedWorldFocus(t);
    else if (from === 'surface' && to === 'planetary') this.planetaryScene.setSelectedWorldFocus(1 - t);
    else this.planetaryScene.setSelectedWorldFocus(0);

    for (const [candidate, group] of this.groups) {
      let opacity = 0;
      if (candidate === from) opacity = 1 - t;
      else if (candidate === to) opacity = t;
      this.setDomainOpacity(candidate, group, opacity);
    }
  }

  update(timeMs: number): void {
    this.cosmic.update(timeMs);
    this.galaxyStellar.update(timeMs);
    this.planetaryScene.update(timeMs);
    this.surfaceScene.update(timeMs);

    const microscopic = this.groups.get('microscopic');
    if (microscopic) microscopic.rotation.y = timeMs * 0.00008;
  }

  private setDomainOpacity(domain: ScaleDomain, group: THREE.Group, opacity: number): void {
    if (domain === 'cosmic') this.cosmic.setTransitionOpacity(opacity);
    else if (domain === 'galactic') this.galaxyStellar.setGalacticOpacity(opacity);
    else if (domain === 'stellar') this.galaxyStellar.setStellarOpacity(opacity);
    else if (domain === 'planetary') this.planetaryScene.setTransitionOpacity(opacity);
    else if (domain === 'surface') this.surfaceScene.setTransitionOpacity(opacity);
    else setGroupOpacity(group, opacity);
  }
}
