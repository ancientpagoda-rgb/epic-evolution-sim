import { describe, expect, it } from 'vitest';
import { NeurobehaviorEvolutionModel } from '../src/science/biology/neurobehavior';

describe('Phase 11 core', () => {
  const biosphere: any = { active: true, biosphereAgeYears: 3e9, feedback: { oxygenFraction: 0.21 }, eukaryogenesis: { cellularComplexity: 0.8 } };
  const surface: any = { active: true, planet: { id: 1 }, stellarFluxEarth: 1 };
  const ecosystem: any = {
    active: true, ecosystemAgeYears: 3e9, establishedLineages: 1, ecosystemComplexity: 0.75, resilience: 0.75,
    cycles: { oxygenStability: 0.8 },
    foodWeb: { producerBiomass: 0.8, primaryConsumerBiomass: 0.7, secondaryConsumerBiomass: 0.5, connectance: 0.7, predationPressure: 0.6, verticalEnergyFlux: 0.7 },
    climateCoupling: { netPrimaryProductivity: 0.8 }, turnover: { successionIndex: 0.8, chronicStress: 0.1 },
    lineages: [{ id: 1, trophicRole: 'grazer', specialization: 0.8, groupIntegrity: 0.8, established: true }],
  };

  it('is active and deterministic for a supported mobile lineage', () => {
    const a = new NeurobehaviorEvolutionModel('repeat').stateAt(ecosystem, biosphere, surface);
    const b = new NeurobehaviorEvolutionModel('repeat').stateAt(ecosystem, biosphere, surface);
    expect(a.active).toBe(true);
    expect(a).toEqual(b);
  });

  it('keeps major behavior indices bounded', () => {
    const state = new NeurobehaviorEvolutionModel('bounds').stateAt(ecosystem, biosphere, surface);
    const values = [state.senses.sensoryIntegration, state.locomotion.mobility, state.learning.learningIndex, state.social.socialLearning, state.cognition.internalModelIndex];
    for (const value of values) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of values) expect(value).toBeLessThanOrEqual(1);
  });
});
