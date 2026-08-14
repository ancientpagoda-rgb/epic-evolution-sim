import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FixedStepClock } from '../core/clock';
import { FlatLambdaCDMModel, formatCosmicAge, type CosmologyState } from '../science/cosmology/model';
import { FloatingOrigin } from '../render/camera/FloatingOrigin';
import { MultiScaleCamera } from '../render/camera/MultiScaleCamera';
import { getReferenceFrame, type ScaleDomain } from '../render/camera/referenceFrames';
import { UniverseRenderer } from '../render/renderer';
import { ContinuumPrototypeScene } from '../render/scenes/ContinuumPrototypeScene';
import { TransitionDirector } from '../render/transitions/TransitionDirector';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

function frameStatus(domain: ScaleDomain, accumulated: THREE.Vector3): string {
  const frame = getReferenceFrame(domain);
  const offset = accumulated.length();
  return `${frame.label} • local unit ${frame.unitLabel} • origin shift ${offset.toExponential(2)} local units`;
}

function formatRedshift(redshift: number): string {
  if (redshift >= 1e5) return `z ${redshift.toExponential(2)}`;
  if (redshift >= 100) return `z ${redshift.toFixed(0)}`;
  if (redshift >= 10) return `z ${redshift.toFixed(1)}`;
  return `z ${redshift.toFixed(3)}`;
}

function formatTemperature(kelvin: number): string {
  if (kelvin <= 0) return '—';
  if (kelvin >= 1e6) return `${kelvin.toExponential(2)} K`;
  if (kelvin >= 1000) return `${kelvin.toFixed(0)} K`;
  return `${kelvin.toFixed(2)} K`;
}

function formatSolarMass(mass: number): string {
  if (mass >= 1e12) return `${(mass / 1e12).toFixed(2)} T M☉`;
  if (mass >= 1e9) return `${(mass / 1e9).toFixed(2)} B M☉`;
  if (mass >= 1e6) return `${(mass / 1e6).toFixed(2)} M M☉`;
  if (mass >= 1e3) return `${(mass / 1e3).toFixed(1)} k M☉`;
  return `${mass.toFixed(1)} M☉`;
}

function formatEarthMass(mass: number): string {
  if (mass >= 1000) return `${(mass / 317.83).toFixed(2)} M♃`;
  if (mass >= 10) return `${mass.toFixed(1)} M⊕`;
  return `${mass.toFixed(2)} M⊕`;
}

function eraLabel(state: CosmologyState): string {
  return state.era.replaceAll('-', ' ');
}

function percent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export async function bootstrap(): Promise<void> {
  const host = requiredElement<HTMLElement>('viewport');
  const status = requiredElement<HTMLElement>('status');
  const backendLabel = requiredElement<HTMLElement>('backend');
  const qualityLabel = requiredElement<HTMLElement>('quality');
  const fpsLabel = requiredElement<HTMLElement>('fps');
  const ageLabel = requiredElement<HTMLElement>('age');
  const scaleLabel = requiredElement<HTMLElement>('scale');
  const frameLabel = requiredElement<HTMLElement>('frame');
  const transitionLabel = requiredElement<HTMLElement>('transition');
  const previousButton = requiredElement<HTMLButtonElement>('scalePrev');
  const nextButton = requiredElement<HTMLButtonElement>('scaleNext');
  const cosmicTimeline = requiredElement<HTMLInputElement>('cosmicTimeline');
  const cosmicPlay = requiredElement<HTMLButtonElement>('cosmicPlay');
  const cosmicEra = requiredElement<HTMLElement>('cosmicEra');
  const redshiftLabel = requiredElement<HTMLElement>('redshift');
  const cmbTempLabel = requiredElement<HTMLElement>('cmbTemp');
  const ionizationLabel = requiredElement<HTMLElement>('ionization');
  const growthLabel = requiredElement<HTMLElement>('growth');
  const haloMassLabel = requiredElement<HTMLElement>('haloMass');
  const stellarMassLabel = requiredElement<HTMLElement>('stellarMass');
  const starFormationLabel = requiredElement<HTMLElement>('starFormation');
  const metallicityLabel = requiredElement<HTMLElement>('metallicity');
  const selectedStarLabel = requiredElement<HTMLElement>('selectedStar');
  const stellarStageLabel = requiredElement<HTMLElement>('stellarStage');
  const agbEnrichmentLabel = requiredElement<HTMLElement>('agbEnrichment');
  const ccEnrichmentLabel = requiredElement<HTMLElement>('ccEnrichment');
  const iaEnrichmentLabel = requiredElement<HTMLElement>('iaEnrichment');
  const rEnrichmentLabel = requiredElement<HTMLElement>('rEnrichment');
  const diskStateLabel = requiredElement<HTMLElement>('diskState');
  const diskMassLabel = requiredElement<HTMLElement>('diskMass');
  const snowLineLabel = requiredElement<HTMLElement>('snowLine');
  const birthMetallicityLabel = requiredElement<HTMLElement>('birthMetallicity');
  const planetCountLabel = requiredElement<HTMLElement>('planetCount');
  const selectedPlanetLabel = requiredElement<HTMLElement>('selectedPlanet');
  const planetMassLabel = requiredElement<HTMLElement>('planetMass');
  const collisionsLabel = requiredElement<HTMLElement>('collisions');
  const ejectionsLabel = requiredElement<HTMLElement>('ejections');
  const diskGasLabel = requiredElement<HTMLElement>('diskGas');
  const worldRadiusLabel = requiredElement<HTMLElement>('worldRadius');
  const worldGravityLabel = requiredElement<HTMLElement>('worldGravity');
  const interiorRegimeLabel = requiredElement<HTMLElement>('interiorRegime');
  const mantleStateLabel = requiredElement<HTMLElement>('mantleState');
  const atmosphereStateLabel = requiredElement<HTMLElement>('atmosphereState');
  const surfaceClimateLabel = requiredElement<HTMLElement>('surfaceClimate');
  const surfaceTempLabel = requiredElement<HTMLElement>('surfaceTemp');
  const surfaceWaterLabel = requiredElement<HTMLElement>('surfaceWater');
  const dynamoStateLabel = requiredElement<HTMLElement>('dynamoState');
  const volcanismStateLabel = requiredElement<HTMLElement>('volcanismState');
  const weatheringStateLabel = requiredElement<HTMLElement>('weatheringState');
  const impactStateLabel = requiredElement<HTMLElement>('impactState');
  const chemEnvironmentLabel = requiredElement<HTMLElement>('chemEnvironment');
  const chemConditionsLabel = requiredElement<HTMLElement>('chemConditions');
  const chemEnergyLabel = requiredElement<HTMLElement>('chemEnergy');
  const chemMineralsLabel = requiredElement<HTMLElement>('chemMinerals');
  const chemOrganicsLabel = requiredElement<HTMLElement>('chemOrganics');
  const chemPolymersLabel = requiredElement<HTMLElement>('chemPolymers');
  const chemCompartmentsLabel = requiredElement<HTMLElement>('chemCompartments');
  const chemSelectionLabel = requiredElement<HTMLElement>('chemSelection');
  const routeHydroLabel = requiredElement<HTMLElement>('routeHydro');
  const routeWetDryLabel = requiredElement<HTMLElement>('routeWetDry');
  const routePoreLabel = requiredElement<HTMLElement>('routePore');
  const routeIceLabel = requiredElement<HTMLElement>('routeIce');
  const protocellIndexLabel = requiredElement<HTMLElement>('protocellIndex');
  const bioStageLabel = requiredElement<HTMLElement>('bioStage');
  const originGateLabel = requiredElement<HTMLElement>('originGate');
  const heredityStateLabel = requiredElement<HTMLElement>('heredityState');
  const fidelityStateLabel = requiredElement<HTMLElement>('fidelityState');
  const metabolismStateLabel = requiredElement<HTMLElement>('metabolismState');
  const populationStateLabel = requiredElement<HTMLElement>('populationState');
  const diversityStateLabel = requiredElement<HTMLElement>('diversityState');
  const ecologyStateLabel = requiredElement<HTMLElement>('ecologyState');
  const darwinStateLabel = requiredElement<HTMLElement>('darwinState');
  const selectionStateLabel = requiredElement<HTMLElement>('selectionState');
  const parasiteStateLabel = requiredElement<HTMLElement>('parasiteState');
  const extinctionStateLabel = requiredElement<HTMLElement>('extinctionState');
  const generationsStateLabel = requiredElement<HTMLElement>('generationsState');

  const universe = new UniverseRenderer(host, 'ultra');
  const backend = await universe.init();
  backendLabel.textContent = `backend: ${backend}`;

  const framebuffer = universe.getFramebufferSize();
  qualityLabel.textContent = `Ultra 4K • ${framebuffer.width}×${framebuffer.height}`;

  const seed = 'chaisson-734221';
  const cosmology = new FlatLambdaCDMModel();
  let timelineNormalized = Number(cosmicTimeline.value) / 10_000;
  let cosmologyState = cosmology.stateAtAge(cosmology.timelineToAgeSeconds(timelineNormalized));
  let cosmicPlaying = false;

  const visuals = new ContinuumPrototypeScene(universe.scene, seed);
  visuals.setCosmologyState(cosmologyState);
  const cameraRig = new MultiScaleCamera(universe.camera, 'cosmic');
  const transitions = new TransitionDirector(cameraRig, visuals, 'cosmic');
  const floatingOrigin = new FloatingOrigin(getReferenceFrame('cosmic').rebaseThreshold);

  const controls = new OrbitControls(universe.camera, universe.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.target.copy(cameraRig.getTarget());
  controls.minDistance = 0.25;
  controls.maxDistance = 2_000_000;

  const clock = new FixedStepClock(1 / 60, 5);
  clock.reset();

  let frames = 0;
  let fpsWindowStart = performance.now();
  let displayedDomain: ScaleDomain = 'cosmic';
  let transitionWasActive = false;

  function updateCosmology(): void {
    cosmologyState = cosmology.stateAtAge(cosmology.timelineToAgeSeconds(timelineNormalized));
    visuals.setCosmologyState(cosmologyState);
    cosmicTimeline.value = String(Math.round(timelineNormalized * 10_000));
    ageLabel.textContent = formatCosmicAge(cosmologyState.ageSeconds);
    cosmicEra.textContent = `era: ${eraLabel(cosmologyState)}`;
    redshiftLabel.textContent = formatRedshift(cosmologyState.redshift);
    cmbTempLabel.textContent = `CMB ${formatTemperature(cosmologyState.cmbTemperatureK)}`;
    ionizationLabel.textContent = `ionized ${(cosmologyState.ionizationFraction * 100).toFixed(2)}%`;
    growthLabel.textContent = `D(a) ${cosmologyState.growthNormalized < 0.01
      ? cosmologyState.growthNormalized.toExponential(2)
      : cosmologyState.growthNormalized.toFixed(3)}`;

    const galaxy = visuals.getGalaxyState();
    const population = visuals.getStellarPopulationState();
    if (galaxy && population) {
      haloMassLabel.textContent = formatSolarMass(galaxy.haloMassSolar);
      stellarMassLabel.textContent = formatSolarMass(galaxy.stellarMassSolar);
      starFormationLabel.textContent = `${galaxy.starFormationRateSolarPerYear.toFixed(2)} M☉/yr`;
      metallicityLabel.textContent = `${galaxy.metallicitySolar.toFixed(3)} Z☉`;
      const selected = population.selectedStar;
      selectedStarLabel.textContent = `${selected.star.massSolar.toFixed(2)} M☉ • ${formatTemperature(selected.temperatureK)}`;
      stellarStageLabel.textContent = selected.stage.replaceAll('-', ' ');
      agbEnrichmentLabel.textContent = `AGB ${population.enrichment.agbIndex.toFixed(3)}`;
      ccEnrichmentLabel.textContent = `CCSN ${population.enrichment.coreCollapseIndex.toFixed(3)}`;
      iaEnrichmentLabel.textContent = `Type Ia ${population.enrichment.typeIaIndex.toExponential(1)}`;
      rEnrichmentLabel.textContent = `r-process ${population.enrichment.rProcessIndex.toExponential(1)}`;
    }

    const planetary = visuals.getPlanetarySystemState();
    if (planetary) {
      const disk = planetary.disk;
      diskStateLabel.textContent = planetary.starAgeYears <= 0 ? 'not formed' : disk.active ? 'gas-rich disk' : planetary.mature ? 'mature system' : 'debris / assembly';
      diskMassLabel.textContent = `${(disk.gasMassSolar * 1047.35).toFixed(2)} M♃ gas`;
      snowLineLabel.textContent = `${disk.snowLineAu.toFixed(2)} AU • ${disk.temperatureAt1AuK.toFixed(0)} K @ 1 AU`;
      birthMetallicityLabel.textContent = `${disk.birthMetallicitySolar.toFixed(3)} Z☉`;
      const boundBodies = planetary.bodies.filter(body => body.status !== 'ejected' && body.massEarth > 0.05);
      planetCountLabel.textContent = `${boundBodies.length} resolved`;
      const selected = planetary.selectedPlanet;
      selectedPlanetLabel.textContent = selected
        ? `${formatEarthMass(selected.massEarth)} • ${selected.semimajorAxisAu.toFixed(2)} AU • ${selected.composition}`
        : '—';
      planetMassLabel.textContent = `planet mass ${formatEarthMass(planetary.totalBoundPlanetMassEarth)}`;
      collisionsLabel.textContent = `mergers ${planetary.collisionCount}`;
      ejectionsLabel.textContent = `ejections ${planetary.ejectionCount}`;
      diskGasLabel.textContent = `gas ${(disk.gasFractionRemaining * 100).toFixed(1)}%`;
    }

    const surface = visuals.getSurfaceEvolutionState();
    if (surface?.active && surface.planet) {
      worldRadiusLabel.textContent = `${formatEarthMass(surface.planet.massEarth)} • ${surface.radiusKm.toFixed(0)} km`;
      worldGravityLabel.textContent = `${surface.gravityEarth.toFixed(2)} g • ${surface.escapeVelocityKmS.toFixed(1)} km/s`;
      interiorRegimeLabel.textContent = surface.interior.tectonicRegime.replaceAll('-', ' ');
      mantleStateLabel.textContent = `${surface.interior.mantleTemperatureK.toFixed(0)} K • ${surface.interior.heatFluxEarth.toFixed(2)}× Earth heat`;
      atmosphereStateLabel.textContent = `${surface.atmosphere.surfacePressureBar.toFixed(2)} bar • CO₂ ${(surface.atmosphere.co2Fraction * 100).toFixed(2)}%`;
      surfaceClimateLabel.textContent = surface.climate.replaceAll('-', ' ');
      surfaceTempLabel.textContent = `${surface.surfaceTemperatureK.toFixed(1)} K • ${(surface.surfaceTemperatureK - 273.15).toFixed(1)} °C`;
      surfaceWaterLabel.textContent = `${(surface.hydrosphere.oceanCoverage * 100).toFixed(0)}% cover • ${surface.hydrosphere.retainedWaterEarthOceans.toFixed(2)} Earth oceans`;
      dynamoStateLabel.textContent = `dynamo ${percent(surface.interior.dynamoIndex)}`;
      volcanismStateLabel.textContent = `volcanism ${percent(surface.interior.volcanismIndex)}`;
      weatheringStateLabel.textContent = `weathering ${percent(surface.hydrosphere.weatheringIndex)}`;
      impactStateLabel.textContent = `impacts ${percent(surface.interior.impactFluxIndex)}`;
    } else {
      worldRadiusLabel.textContent = '—';
      worldGravityLabel.textContent = '—';
      interiorRegimeLabel.textContent = 'unformed';
      mantleStateLabel.textContent = '—';
      atmosphereStateLabel.textContent = '—';
      surfaceClimateLabel.textContent = 'unformed';
      surfaceTempLabel.textContent = '—';
      surfaceWaterLabel.textContent = '—';
      dynamoStateLabel.textContent = 'dynamo —';
      volcanismStateLabel.textContent = 'volcanism —';
      weatheringStateLabel.textContent = 'weathering —';
      impactStateLabel.textContent = 'impacts —';
    }

    const chemistry = visuals.getChemicalEvolutionState();
    if (chemistry) {
      chemEnvironmentLabel.textContent = chemistry.active ? chemistry.environment.replaceAll('-', ' ') : 'inactive / insufficient conditions';
      chemConditionsLabel.textContent = `${chemistry.temperatureK.toFixed(0)} K • ${chemistry.pressureBar.toFixed(2)} bar • pH≈${chemistry.pHProxy.toFixed(1)}`;
      chemEnergyLabel.textContent = `${percent(chemistry.energy.totalGradient)} • redox ${percent(chemistry.energy.redox)}`;
      chemMineralsLabel.textContent = `${percent(chemistry.mineralCatalysisIndex)} • ionic ${percent(chemistry.ionicStrengthProxy)}`;
      chemOrganicsLabel.textContent = percent(chemistry.network.simpleOrganics);
      chemPolymersLabel.textContent = `${percent(chemistry.polymerizationIndex)} • nucleotide ${percent(chemistry.network.nucleotidePolymers)}`;
      chemCompartmentsLabel.textContent = `${percent(chemistry.compartmentIndex)} • amphiphile ${percent(chemistry.network.amphiphiles)}`;
      chemSelectionLabel.textContent = percent(chemistry.chemicalSelectionPotential);
      routeHydroLabel.textContent = `vent ${percent(chemistry.routeScores.hydrothermalInterface)}`;
      routeWetDryLabel.textContent = `wet–dry ${percent(chemistry.routeScores.wetDryMineral)}`;
      routePoreLabel.textContent = `mineral pore ${percent(chemistry.routeScores.aqueousMineralPore)}`;
      routeIceLabel.textContent = `ice/brine ${percent(chemistry.routeScores.iceBrine)}`;
      protocellIndexLabel.textContent = `protocell-like ${percent(chemistry.protocellLikeIndex)}`;
    }

    const biology = visuals.getBiologicalEvolutionState();
    if (biology) {
      bioStageLabel.textContent = biology.stage.replaceAll('-', ' ');
      originGateLabel.textContent = `${percent(biology.originReadiness)} / ${percent(biology.originThreshold)} required`;
      heredityStateLabel.textContent = `${percent(biology.heredity.heritabilityIndex)} • inheritance ${percent(biology.heredity.compartmentInheritance)}`;
      fidelityStateLabel.textContent = `${percent(biology.heredity.copyingFidelity)} fidelity • ${percent(biology.heredity.mutationRate)} mutation`;
      metabolismStateLabel.textContent = `${percent(biology.metabolism.energyCapture)} capture • growth ${percent(biology.metabolism.growthCoupling)}`;
      populationStateLabel.textContent = biology.active
        ? `${percent(biology.population.abundanceIndex)} abundance • competition ${percent(biology.population.competitionIndex)}`
        : 'no sustained biological population';
      diversityStateLabel.textContent = `${percent(biology.population.diversityIndex)} variants • ${biology.variants.length} modeled types`;
      ecologyStateLabel.textContent = `${percent(biology.ecology.diversificationIndex)} diversification • niches ${percent(biology.ecology.nicheDiversity)}`;
      darwinStateLabel.textContent = `Darwinian ${percent(biology.darwinianEvolutionIndex)}`;
      selectionStateLabel.textContent = `selection ${percent(biology.population.selectionStrength)}`;
      parasiteStateLabel.textContent = `parasites ${percent(biology.population.parasiteLoad)}`;
      extinctionStateLabel.textContent = `extinction risk ${percent(biology.population.extinctionRisk)}`;
      generationsStateLabel.textContent = `generations ${biology.population.generations.toLocaleString()}`;
    }
  }

  function requestScale(direction: -1 | 1): void {
    if (!transitions.requestAdjacent(direction, performance.now())) return;
    controls.enabled = false;
  }

  previousButton.addEventListener('click', () => requestScale(-1));
  nextButton.addEventListener('click', () => requestScale(1));
  cosmicPlay.addEventListener('click', () => {
    if (timelineNormalized >= 0.9999) timelineNormalized = 0;
    cosmicPlaying = !cosmicPlaying;
    cosmicPlay.textContent = cosmicPlaying ? 'Ⅱ' : '▶';
    updateCosmology();
  });
  cosmicTimeline.addEventListener('input', () => {
    timelineNormalized = Number(cosmicTimeline.value) / 10_000;
    cosmicPlaying = false;
    cosmicPlay.textContent = '▶';
    updateCosmology();
  });
  window.addEventListener('keydown', event => {
    if (event.key === '[' || event.key === 'ArrowUp') requestScale(-1);
    if (event.key === ']' || event.key === 'ArrowDown') requestScale(1);
  });

  window.addEventListener('resize', () => {
    universe.resize();
    const size = universe.getFramebufferSize();
    qualityLabel.textContent = `Ultra 4K • ${size.width}×${size.height}`;
  });

  status.textContent = 'V3 Phase 8 • heredity + imperfect replication + mutation + selection + early ecology';
  updateCosmology();

  universe.setAnimationLoop(timeMs => {
    const tick = clock.advance(timeMs);
    if (cosmicPlaying && tick.steps > 0) {
      timelineNormalized = Math.min(1, timelineNormalized + tick.steps * clock.stepSeconds * 0.018);
      if (timelineNormalized >= 1) {
        cosmicPlaying = false;
        cosmicPlay.textContent = '▶';
      }
      updateCosmology();
    }

    visuals.update(timeMs);

    const transition = transitions.update(timeMs);
    const activeDomain = cameraRig.getDomain();

    if (transition.active) {
      transitionWasActive = true;
      controls.enabled = false;
      controls.target.copy(cameraRig.getTarget());
      const transitionPercent = Math.round(transition.progress * 100);
      transitionLabel.textContent = `${transition.anchor?.label ?? 'scale handoff'} • ${transitionPercent}%`;
    } else {
      if (transitionWasActive) {
        transitionWasActive = false;
        controls.target.copy(cameraRig.getTarget());
        controls.enabled = true;
      }
      cameraRig.syncFromFreeCamera(controls.target);
      transitionLabel.textContent = 'free inspection • [ / ] or ↑ / ↓ changes scale';

      const surfaceState = visuals.getSurfaceEvolutionState();
      if (activeDomain === 'surface' && surfaceState?.active) {
        controls.minDistance = Math.max(5, surfaceState.radiusKm * 1.03);
        controls.maxDistance = 2_000_000;
      } else if (activeDomain === 'microscopic') {
        controls.minDistance = 0.15;
        controls.maxDistance = 120;
      } else {
        controls.minDistance = 0.25;
        controls.maxDistance = 20_000;
      }
      controls.update();

      const frame = getReferenceFrame(activeDomain);
      floatingOrigin.setThreshold(frame.rebaseThreshold);
      floatingOrigin.rebaseIfNeeded(universe.camera, [visuals.root], [controls.target]);
    }

    if (activeDomain !== displayedDomain) {
      displayedDomain = activeDomain;
      floatingOrigin.reset();
    }

    const frame = getReferenceFrame(activeDomain);
    scaleLabel.textContent = `${frame.label} • ${frame.unitLabel}`;
    frameLabel.textContent = frameStatus(activeDomain, floatingOrigin.getAccumulatedOffset());

    previousButton.disabled = transitions.isActive() || activeDomain === 'cosmic';
    nextButton.disabled = transitions.isActive() || activeDomain === 'microscopic';

    universe.render();

    frames += 1;
    if (timeMs - fpsWindowStart >= 1000) {
      const fps = (frames * 1000) / (timeMs - fpsWindowStart);
      fpsLabel.textContent = `fps: ${fps.toFixed(0)}`;
      frames = 0;
      fpsWindowStart = timeMs;
    }
  });
}
