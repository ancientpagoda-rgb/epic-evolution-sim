import { describe, expect, it } from 'vitest';
import { SI } from '../src/science/cosmology/constants';
import { FlatLambdaCDMModel } from '../src/science/cosmology/model';
import { ZeldovichField } from '../src/science/cosmology/perturbations';
import { GalaxyFormationModel } from '../src/science/galaxies/model';
import {
  StellarPopulationModel,
  mainSequenceLifetimeYears,
  sampleKroupaLikeMass,
} from '../src/science/stars/model';
import { createRandomStream } from '../src/core/random';

describe('Phase 4 halo-driven galaxy model', () => {
  it('selects the same Phase-3 halo for the same seed', () => {
    const fieldA = new ZeldovichField('halo-seed', { gridSize: 8, modeCount: 20 });
    const fieldB = new ZeldovichField('halo-seed', { gridSize: 8, modeCount: 20 });
    const a = new GalaxyFormationModel('halo-seed', fieldA);
    const b = new GalaxyFormationModel('halo-seed', fieldB);
    expect(a.halo).toEqual(b.halo);
  });

  it('grows halo and stellar mass with cosmic time', () => {
    const cosmology = new FlatLambdaCDMModel();
    const field = new ZeldovichField('growth-galaxy', { gridSize: 8, modeCount: 20 });
    const galaxy = new GalaxyFormationModel('growth-galaxy', field);
    const early = galaxy.stateAtCosmology(cosmology.stateAtAge(350e6 * SI.secondsPerJulianYear));
    const late = galaxy.stateAtCosmology(cosmology.stateAtAge(10e9 * SI.secondsPerJulianYear));
    expect(late.haloMassSolar).toBeGreaterThan(early.haloMassSolar);
    expect(late.stellarMassSolar).toBeGreaterThanOrEqual(early.stellarMassSolar);
    expect(late.stellarToHaloRatio).toBeLessThan(0.1);
  });

  it('does not form stars before its seeded first-star threshold', () => {
    const cosmology = new FlatLambdaCDMModel();
    const field = new ZeldovichField('threshold-galaxy', { gridSize: 8, modeCount: 20 });
    const galaxy = new GalaxyFormationModel('threshold-galaxy', field);
    const before = galaxy.stateAtCosmology(
      cosmology.stateAtAge((galaxy.firstStarAgeYears * 0.8) * SI.secondsPerJulianYear),
    );
    expect(before.formed).toBe(false);
    expect(before.stellarMassSolar).toBe(0);
    expect(before.starFormationRateSolarPerYear).toBe(0);
  });
});

describe('Phase 4 stellar population', () => {
  it('samples a bounded low-mass-dominated Kroupa-like IMF', () => {
    const rng = createRandomStream('imf-test', 'sample');
    const masses = Array.from({ length: 5000 }, () => sampleKroupaLikeMass(rng));
    expect(Math.min(...masses)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...masses)).toBeLessThanOrEqual(120);
    const lowMassFraction = masses.filter(mass => mass < 1).length / masses.length;
    expect(lowMassFraction).toBeGreaterThan(0.75);
  });

  it('gives massive stars much shorter main-sequence lifetimes', () => {
    expect(mainSequenceLifetimeYears(20)).toBeLessThan(mainSequenceLifetimeYears(2));
    expect(mainSequenceLifetimeYears(2)).toBeLessThan(mainSequenceLifetimeYears(1));
    expect(mainSequenceLifetimeYears(0.3)).toBeGreaterThan(13.8e9);
  });

  it('keeps the representative population and selected star deterministic', () => {
    const fieldA = new ZeldovichField('stellar-seed', { gridSize: 8, modeCount: 20 });
    const fieldB = new ZeldovichField('stellar-seed', { gridSize: 8, modeCount: 20 });
    const galaxyA = new GalaxyFormationModel('stellar-seed', fieldA);
    const galaxyB = new GalaxyFormationModel('stellar-seed', fieldB);
    const starsA = new StellarPopulationModel('stellar-seed', galaxyA, 500);
    const starsB = new StellarPopulationModel('stellar-seed', galaxyB, 500);
    expect(starsA.selectedStarId).toBe(starsB.selectedStarId);
    expect(starsA.stars.slice(0, 20)).toEqual(starsB.stars.slice(0, 20));
  });

  it('develops delayed enrichment channels after generations evolve', () => {
    const cosmology = new FlatLambdaCDMModel();
    const field = new ZeldovichField('enrichment-seed', { gridSize: 8, modeCount: 20 });
    const galaxy = new GalaxyFormationModel('enrichment-seed', field);
    const stars = new StellarPopulationModel('enrichment-seed', galaxy, 1800);

    const earlyCosmology = cosmology.stateAtAge(180e6 * SI.secondsPerJulianYear);
    const earlyGalaxy = galaxy.stateAtCosmology(earlyCosmology);
    const early = stars.stateAtCosmology(earlyCosmology, earlyGalaxy);

    const lateCosmology = cosmology.stateAtAge(12e9 * SI.secondsPerJulianYear);
    const lateGalaxy = galaxy.stateAtCosmology(lateCosmology);
    const late = stars.stateAtCosmology(lateCosmology, lateGalaxy);

    expect(late.formedCount).toBeGreaterThan(early.formedCount);
    expect(late.enrichment.agbIndex).toBeGreaterThanOrEqual(early.enrichment.agbIndex);
    expect(late.enrichment.coreCollapseIndex).toBeGreaterThanOrEqual(early.enrichment.coreCollapseIndex);
    expect(late.enrichment.totalReturnedMassIndex).toBeGreaterThan(0);
  });
});
