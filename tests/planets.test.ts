import { describe, expect, it } from 'vitest';
import { SI } from '../src/science/cosmology/constants';
import { FlatLambdaCDMModel } from '../src/science/cosmology/model';
import { ZeldovichField } from '../src/science/cosmology/perturbations';
import { GalaxyFormationModel } from '../src/science/galaxies/model';
import { PlanetFormationModel } from '../src/science/planets/model';
import { StellarPopulationModel } from '../src/science/stars/model';
import { metersPerLocalUnit } from '../src/render/camera/referenceFrames';

function buildChain(seed: string) {
  const cosmology = new FlatLambdaCDMModel();
  const field = new ZeldovichField(seed, { gridSize: 8, modeCount: 20 });
  const galaxy = new GalaxyFormationModel(seed, field);
  const stars = new StellarPopulationModel(seed, galaxy, 700);
  const selectedStar = stars.stars[stars.selectedStarId] ?? stars.stars[0]!;
  const planets = new PlanetFormationModel(seed, selectedStar, galaxy);
  return { cosmology, galaxy, stars, selectedStar, planets };
}

describe('Phase 5 protoplanetary disk', () => {
  it('is deterministic for the same causal seed', () => {
    const a = buildChain('planet-seed');
    const b = buildChain('planet-seed');
    expect(a.planets.initialDiskMassSolar).toBe(b.planets.initialDiskMassSolar);
    expect(a.planets.diskLifetimeYears).toBe(b.planets.diskLifetimeYears);
    expect(a.planets.birthMetallicitySolar).toBe(b.planets.birthMetallicitySolar);
    expect(a.planets.selectedPlanetId).toBe(b.planets.selectedPlanetId);
  });

  it('cools and moves the water snow line inward as the young disk evolves', () => {
    const { planets } = buildChain('snow-line-seed');
    const early = planets.diskStateAtAge(0.2e6);
    const later = planets.diskStateAtAge(Math.min(5e6, planets.diskLifetimeYears * 0.8));
    expect(early.temperatureAt1AuK).toBeGreaterThan(later.temperatureAt1AuK);
    expect(early.snowLineAu).toBeGreaterThan(later.snowLineAu);
    expect(early.snowLineAu).toBeGreaterThan(0.2);
  });

  it('disperses its gas reservoir on the seeded Myr timescale', () => {
    const { planets } = buildChain('disk-dispersal-seed');
    const early = planets.diskStateAtAge(0.5e6);
    const after = planets.diskStateAtAge(planets.diskLifetimeYears * 1.2);
    expect(early.active).toBe(true);
    expect(early.gasFractionRemaining).toBeGreaterThan(0);
    expect(after.active).toBe(false);
    expect(after.gasFractionRemaining).toBe(0);
    expect(planets.diskLifetimeYears).toBeGreaterThan(2e6);
    expect(planets.diskLifetimeYears).toBeLessThan(9e6);
  });
});

describe('Phase 5 planetary architecture', () => {
  it('inherits the selected star and produces a mature bound system later', () => {
    const { cosmology, galaxy, stars, selectedStar, planets } = buildChain('mature-system-seed');
    const ageSeconds = Math.min(
      cosmology.presentAgeSeconds,
      (selectedStar.birthAgeYears + 1.2e9) * SI.secondsPerJulianYear,
    );
    const cosmicState = cosmology.stateAtAge(ageSeconds);
    const galaxyState = galaxy.stateAtCosmology(cosmicState);
    const stellarState = stars.stateAtCosmology(cosmicState, galaxyState);
    const state = planets.stateAt(cosmicState, stellarState.selectedStar, galaxyState);
    const bound = state.bodies.filter(body => body.status !== 'ejected' && body.massEarth > 0.05);
    expect(state.starAgeYears).toBeGreaterThan(1e8);
    expect(state.mature).toBe(true);
    expect(bound.length).toBeGreaterThan(0);
    expect(state.totalBoundPlanetMassEarth).toBeGreaterThan(0);
    expect(state.selectedPlanet).not.toBeNull();
  });

  it('keeps formed planetary mass below the inherited initial disk budget', () => {
    const { cosmology, galaxy, stars, planets } = buildChain('mass-budget-seed');
    const cosmicState = cosmology.stateAtAge(cosmology.presentAgeSeconds);
    const galaxyState = galaxy.stateAtCosmology(cosmicState);
    const stellarState = stars.stateAtCosmology(cosmicState, galaxyState);
    const state = planets.stateAt(cosmicState, stellarState.selectedStar, galaxyState);
    const diskBudgetEarth = planets.initialDiskMassSolar * 332_946;
    expect(state.totalBoundPlanetMassEarth).toBeLessThan(diskBudgetEarth);
    expect(state.collisionCount).toBeGreaterThanOrEqual(0);
    expect(state.ejectionCount).toBeGreaterThanOrEqual(0);
  });

  it('uses a physical 0.1 AU planetary reference unit', () => {
    const metersPerAu = 149_597_870_700;
    expect(metersPerLocalUnit('planetary')).toBeCloseTo(metersPerAu / 10, 3);
  });
});
