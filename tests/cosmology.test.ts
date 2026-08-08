import { describe, expect, it } from 'vitest';
import { PLANCK_LAMBDA_CDM, RECOMBINATION_AGE_SECONDS, SI } from '../src/science/cosmology/constants';
import { FlatLambdaCDMModel } from '../src/science/cosmology/model';
import { ZeldovichField } from '../src/science/cosmology/perturbations';

describe('Phase 3 flat LambdaCDM baseline', () => {
  it('integrates to a Planck-like present age', () => {
    const model = new FlatLambdaCDMModel();
    const ageGyr = model.presentAgeSeconds / SI.secondsPerJulianYear / 1e9;
    expect(ageGyr).toBeGreaterThan(13.7);
    expect(ageGyr).toBeLessThan(13.9);
  });

  it('places recombination near z ~ 1100 and ~3000 K', () => {
    const model = new FlatLambdaCDMModel();
    const state = model.stateAtAge(RECOMBINATION_AGE_SECONDS);
    expect(state.recombinationProgress).toBeCloseTo(0.5, 6);
    expect(state.redshift).toBeGreaterThan(950);
    expect(state.redshift).toBeLessThan(1200);
    expect(state.cmbTemperatureK).toBeGreaterThan(2500);
    expect(state.cmbTemperatureK).toBeLessThan(3300);
  });

  it('maps the dedicated timeline breakpoint to recombination', () => {
    const model = new FlatLambdaCDMModel();
    expect(model.timelineToAgeSeconds(0.34) / RECOMBINATION_AGE_SECONDS).toBeCloseTo(1, 8);
    expect(model.ageSecondsToTimeline(RECOMBINATION_AGE_SECONDS)).toBeCloseTo(0.34, 8);
  });

  it('retains the documented Planck baseline parameters', () => {
    expect(PLANCK_LAMBDA_CDM.hubbleKmSPerMpc).toBe(67.4);
    expect(PLANCK_LAMBDA_CDM.omegaMatter).toBe(0.315);
    expect(PLANCK_LAMBDA_CDM.scalarSpectralIndex).toBe(0.965);
  });
});

describe('seeded Zel’dovich field', () => {
  it('is deterministic for a seed and changes for a different seed', () => {
    const a = new ZeldovichField('same-seed', { gridSize: 8, modeCount: 20 });
    const b = new ZeldovichField('same-seed', { gridSize: 8, modeCount: 20 });
    const c = new ZeldovichField('other-seed', { gridSize: 8, modeCount: 20 });
    expect(Array.from(a.displacement.slice(0, 24))).toEqual(Array.from(b.displacement.slice(0, 24)));
    expect(Array.from(a.displacement.slice(0, 24))).not.toEqual(Array.from(c.displacement.slice(0, 24)));
  });

  it('starts on the Lagrangian grid and grows away from it', () => {
    const field = new ZeldovichField('growth-test', { gridSize: 8, modeCount: 20 });
    const early = new Float32Array(field.lagrangian.length);
    const late = new Float32Array(field.lagrangian.length);
    field.writePositions(0, early);
    field.writePositions(1, late);
    expect(Array.from(early)).toEqual(Array.from(field.lagrangian));
    expect(Array.from(late)).not.toEqual(Array.from(field.lagrangian));
  });
});
