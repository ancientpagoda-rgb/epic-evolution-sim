import * as THREE from 'three/webgpu';
import { BiosphereEvolutionModel, type BiosphereEvolutionState } from '../../science/biology/biosphere';
import { BiologicalEvolutionModel, type BiologicalEvolutionState } from '../../science/biology/model';
import { ChemicalEvolutionModel, type ChemicalEvolutionState } from '../../science/chemistry/model';
import type { CosmologyState } from '../../science/cosmology/model';
import { ZeldovichField } from '../../science/cosmology/perturbations';
import { GalaxyFormationModel, type GalaxyState } from '../../science/galaxies/model';
import { PlanetFormationModel, type PlanetarySystemState } from '../../science/planets/model';
import { StellarPopulationModel, type StellarPopulationState } from '../../science/stars/model';
import { SurfaceEvolutionModel, type SurfaceEvolutionState } from '../../science/surface/model';
import type { ScaleDomain } from '../camera/referenceFrames';
import type { TransitionVisualController } from '../transitions/TransitionDirector';
import { BiosphereScene } from './BiosphereScene';
import { CosmicStructureScene } from './CosmicStructureScene';
import { EarlyLifeScene } from './EarlyLifeScene';
import { GalaxyStellarScene } from './GalaxyStellarScene';
import { PlanetarySystemScene } from './PlanetarySystemScene';
import { PrebioticChemistryScene } from './PrebioticChemistryScene';
import { SurfaceBiosphereOverlay } from './SurfaceBiosphereOverlay';
import { SurfacePlanetScene } from './SurfacePlanetScene';

export class ContinuumPrototypeScene implements TransitionVisualController {
  readonly root = new THREE.Group();
  private readonly groups = new Map<ScaleDomain, THREE.Group>();
  private readonly surfaceGroup = new THREE.Group();
  private readonly microscopicGroup = new THREE.Group();
  private readonly cosmic: CosmicStructureScene;
  private readonly galaxyModel: GalaxyFormationModel;
  private readonly stellarModel: StellarPopulationModel;
  private readonly galaxyStellar: GalaxyStellarScene;
  private readonly planetModel: PlanetFormationModel;
  private readonly planetaryScene: PlanetarySystemScene;
  private readonly surfaceModel: SurfaceEvolutionModel;
  private readonly surfaceScene: SurfacePlanetScene;
  private readonly surfaceBiosphere: SurfaceBiosphereOverlay;
  private readonly chemicalModel: ChemicalEvolutionModel;
  private readonly chemistryScene: PrebioticChemistryScene;
  private readonly biologicalModel: BiologicalEvolutionModel;
  private readonly lifeScene: EarlyLifeScene;
  private readonly biosphereModel: BiosphereEvolutionModel;
  private readonly biosphereScene: BiosphereScene;
  private galaxyState: GalaxyState | null = null;
  private populationState: StellarPopulationState | null = null;
  private planetaryState: PlanetarySystemState | null = null;
  private surfaceState: SurfaceEvolutionState | null = null;
  private chemicalState: ChemicalEvolutionState | null = null;
  private biologicalState: BiologicalEvolutionState | null = null;
  private biosphereState: BiosphereEvolutionState | null = null;

  constructor(scene: THREE.Scene, seed: string) {
    this.root.name = 'v3-continuum-root';
    this.surfaceGroup.name = 'scale-surface';
    this.microscopicGroup.name = 'scale-microscopic';

    const structureField = new ZeldovichField(seed, { gridSize: 18, boxSize: 32, modeCount: 96 });
    this.galaxyModel = new GalaxyFormationModel(seed, structureField);
    this.stellarModel = new StellarPopulationModel(seed, this.galaxyModel);
    const selectedStar = this.stellarModel.stars[this.stellarModel.selectedStarId] ?? this.stellarModel.stars[0]!;
    this.planetModel = new PlanetFormationModel(seed, selectedStar, this.galaxyModel);
    this.surfaceModel = new SurfaceEvolutionModel(seed);
    this.chemicalModel = new ChemicalEvolutionModel(seed);
    this.biologicalModel = new BiologicalEvolutionModel(seed);
    this.biosphereModel = new BiosphereEvolutionModel(seed);
    this.cosmic = new CosmicStructureScene(seed, structureField, this.galaxyModel.halo);
    this.galaxyStellar = new GalaxyStellarScene(seed, this.stellarModel);
    this.planetaryScene = new PlanetarySystemScene(seed, this.planetModel);
    this.surfaceScene = new SurfacePlanetScene(seed);
    this.surfaceBiosphere = new SurfaceBiosphereOverlay(seed);
    this.chemistryScene = new PrebioticChemistryScene(seed);
    this.lifeScene = new EarlyLifeScene(seed);
    this.biosphereScene = new BiosphereScene(seed);
    this.surfaceGroup.add(this.surfaceScene.group, this.surfaceBiosphere.group);
    this.microscopicGroup.add(this.chemistryScene.group, this.lifeScene.group, this.biosphereScene.group);

    this.groups.set('cosmic', this.cosmic.group);
    this.groups.set('galactic', this.galaxyStellar.galacticGroup);
    this.groups.set('stellar', this.galaxyStellar.stellarGroup);
    this.groups.set('planetary', this.planetaryScene.group);
    this.groups.set('surface', this.surfaceGroup);
    this.groups.set('microscopic', this.microscopicGroup);

    for (const [domain, group] of this.groups) {
      if (domain !== 'surface' && domain !== 'microscopic') group.name = `scale-${domain}`;
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
    this.chemicalState = this.chemicalModel.stateAt(this.surfaceState);
    this.chemistryScene.setState(this.chemicalState);
    this.biologicalState = this.biologicalModel.stateAt(this.chemicalState, this.surfaceState);
    this.lifeScene.setState(this.biologicalState);
    this.biosphereState = this.biosphereModel.stateAt(this.biologicalState, this.chemicalState, this.surfaceState);
    this.biosphereScene.setState(this.biosphereState);
    this.surfaceBiosphere.setState(this.surfaceState, this.biosphereState);
  }

  getGalaxyState(): GalaxyState | null { return this.galaxyState; }
  getStellarPopulationState(): StellarPopulationState | null { return this.populationState; }
  getPlanetarySystemState(): PlanetarySystemState | null { return this.planetaryState; }
  getSurfaceEvolutionState(): SurfaceEvolutionState | null { return this.surfaceState; }
  getChemicalEvolutionState(): ChemicalEvolutionState | null { return this.chemicalState; }
  getBiologicalEvolutionState(): BiologicalEvolutionState | null { return this.biologicalState; }
  getBiosphereEvolutionState(): BiosphereEvolutionState | null { return this.biosphereState; }
  getGalaxyModel(): GalaxyFormationModel { return this.galaxyModel; }
  getPlanetFormationModel(): PlanetFormationModel { return this.planetModel; }

  focus(domain: ScaleDomain): void {
    this.planetaryScene.setSelectedWorldFocus(domain === 'surface' ? 1 : 0);
    for (const [candidate, group] of this.groups) {
      this.setDomainOpacity(candidate, group, candidate === domain ? 1 : 0);
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
    this.surfaceBiosphere.update(timeMs);
    this.chemistryScene.update(timeMs);
    this.lifeScene.update(timeMs);
    this.biosphereScene.update(timeMs);
  }

  private setDomainOpacity(domain: ScaleDomain, group: THREE.Group, opacity: number): void {
    if (domain === 'cosmic') this.cosmic.setTransitionOpacity(opacity);
    else if (domain === 'galactic') this.galaxyStellar.setGalacticOpacity(opacity);
    else if (domain === 'stellar') this.galaxyStellar.setStellarOpacity(opacity);
    else if (domain === 'planetary') this.planetaryScene.setTransitionOpacity(opacity);
    else if (domain === 'surface') {
      this.surfaceScene.setTransitionOpacity(opacity);
      this.surfaceBiosphere.setTransitionOpacity(opacity);
      group.visible = opacity > 0.001;
    } else if (domain === 'microscopic') {
      this.chemistryScene.setTransitionOpacity(opacity);
      this.lifeScene.setTransitionOpacity(opacity);
      this.biosphereScene.setTransitionOpacity(opacity);
      group.visible = opacity > 0.001;
    } else group.visible = opacity > 0.001;
  }
}
