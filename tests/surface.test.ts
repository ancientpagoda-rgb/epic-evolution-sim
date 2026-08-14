import { describe, expect, it } from 'vitest';
import { SI } from '../src/science/cosmology/constants';
import { FlatLambdaCDMModel } from '../src/science/cosmology/model';
import { ZeldovichField } from '../src/science/cosmology/perturbations';
import { GalaxyFormationModel } from '../src/science/galaxies/model';
import { PlanetFormationModel } from '../src/science/planets/model';
import { StellarPopulationModel } from '../src/science/stars/model';
import { SurfaceEvolutionModel } from '../src/science/surface/model';
import { metersPerLocalUnit } from '../src/render/camera/referenceFrames';

function buildChain(seed: string) {
  const cosmology = new FlatLambdaCDMModel();
  const field = new ZeldovichField(seed, { gridSize: 8, modeCount: 20 });
  const galaxy = new GalaxyFormationModel(seed, field);
  const stars = new StellarPopulationModel(seed, galaxy, 700);
  const selectedStar = stars.stars[stars.selectedStarId] ?? stars.stars[0]!;
  const planets = new PlanetFormationModel(seed, selectedStar, galaxy);
  const surface = new SurfaceEvolutionModel(seed);
  return { cosmology, galaxy, stars, selectedStar, planets, surface };
}

function stateAtStarAge(seed: string, starAgeYears: number) {
  const chain = buildChain(seed);
  const requestedAgeSeconds = (chain.selectedStar.birthAgeYears + starAgeYears) * SI.secondsPerJulianYear;
  const cosmicState = chain.cosmology.stateAtAge(Math.min(chain.cosmology.presentAgeSeconds, requestedAgeSeconds));
  const galaxyState = chain.galaxy.stateAtCosmology(cosmicState);
  const stellarState = chain.stars.stateAtCosmology(cosmicState, galaxyState);
  const planetaryState = chain.planets.stateAt(cosmicState, stellarState.selectedStar, galaxyState);
  const surfaceState = chain.surface.stateAt(cosmicState, stellarState.selectedStar, planetaryState);
  return { ...chain, cosmicState, galaxyState, stellarState, planetaryState, surfaceState };
}

describe('Phase 6 selected-world continuity', () => {
  it('inherits the exact selected Phase-5 planet', () => {
    const { planetaryState, surfaceState } = stateAtStarAge('surface-continuity', 1.2e9);
    expect(planetaryState.selectedPlanet).not.toBeNull();
    expect(surfaceState.active).toBe(true);
    expect(surfaceState.planet?.id).toBe(planetaryState.selectedPlanet?.id);
    expect(surfaceState.planet?.massEarth).toBe(planetaryState.selectedPlanet?.massEarth);
    expect(surfaceState.planet?.semimajorAxisAu).toBe(planetaryState.selectedPlanet?.semimajorAxisAu);
  });

  it('derives gravity and escape speed from generated mass and radius', () => {
    const { surfaceState } = stateAtStarAge('surface-gravity', 1.5e9);
    expect(surfaceState.active).toBe(true);
    const planet = surfaceState.planet!;
    expect(surfaceState.gravityEarth).toBeCloseTo(planet.massEarth / (planet.radiusEarth ** 2), 8);
    expect(surfaceState.escapeVelocityKmS).toBeGreaterThan(0);
  });

  it('is deterministic for the same continuum seed', () => {
    const a = stateAtStarAge('surface-determinism', 2e9).surfaceState;
    const b = stateAtStarAge('surface-determinism', 2e9).surfaceState;
    expect(a.climate).toBe(b.climate);
    expect(a.surfaceTemperatureK).toBe(b.surfaceTemperatureK);
    expect(a.interior.tectonicRegime).toBe(b.interior.tectonicRegime);
    expect(a.hydrosphere.retainedWaterEarthOceans).toBe(b.hydrosphere.retainedWaterEarthOceans);
  });
});

describe('Phase 6 thermal and surface evolution', () => {
  it('moves from early impact heating toward a differentiated cooler interior', () => {
    const early = stateAtStarAge('surface-thermal', 1e6).surfaceState;
    const late = stateAtStarAge('surface-thermal', 1.5e9).surfaceState;
    expect(early.active).toBe(true);
    expect(late.active).toBe(true);
    expect(late.interior.differentiationProgress).toBeGreaterThan(early.interior.differentiationProgress);
    expect(early.interior.mantleTemperatureK).toBeGreaterThan(late.interior.mantleTemperatureK);
    expect(early.interior.impactFluxIndex).toBeGreaterThan(late.interior.impactFluxIndex);
  });

  it('keeps reduced climate, hydrosphere, and geodynamic indices bounded', () => {
    const state = stateAtStarAge('surface-bounds', 2.5e9).surfaceState;
    expect(state.active).toBe(true);
    expect(state.atmosphere.surfacePressureBar).toBeGreaterThanOrEqual(0);
    expect(state.atmosphere.retainedFraction).toBeGreaterThanOrEqual(0);
    expect(state.atmosphere.retainedFraction).toBeLessThanOrEqual(1);
    expect(state.hydrosphere.oceanCoverage).toBeGreaterThanOrEqual(0);
    expect(state.hydrosphere.oceanCoverage).toBeLessThanOrEqual(1);
    expect(state.interior.tectonicMobilityIndex).toBeGreaterThanOrEqual(0);
    expect(state.interior.tectonicMobilityIndex).toBeLessThanOrEqual(1);
    expect(state.interior.dynamoIndex).toBeGreaterThanOrEqual(0);
    expect(state.interior.dynamoIndex).toBeLessThanOrEqual(1);
  });

  it('does not create a surface world before the selected star exists', () => {
    const chain = buildChain('surface-unborn');
    const cosmicState = chain.cosmology.stateAtAge(chain.selectedStar.birthAgeYears * 0.8 * SI.secondsPerJulianYear);
    const galaxyState = chain.galaxy.stateAtCosmology(cosmicState);
    const stellarState = chain.stars.stateAtCosmology(cosmicState, galaxyState);
    const planetaryState = chain.planets.stateAt(cosmicState, stellarState.selectedStar, galaxyState);
    const surfaceState = chain.surface.stateAt(cosmicState, stellarState.selectedStar, planetaryState);
    expect(stellarState.selectedStar.stage).toBe('unborn');
    expect(surfaceState.active).toBe(false);
    expect(surfaceState.climate).toBe('unformed');
  });

  it('uses kilometers as the physical Phase-6 surface reference unit', () => {
    expect(metersPerLocalUnit('surface')).toBe(1000);
  });
});
