import { describe, expect, it } from 'vitest';
import { NeurobehaviorEvolutionModel } from '../src/science/biology/neurobehavior';

const b: any = { active: true, biosphereAgeYears: 3e9, feedback: { oxygenFraction: 0.21 }, eukaryogenesis: { cellularComplexity: 0.8 } };
const s: any = { active: true, planet: { id: 1 }, stellarFluxEarth: 1 };
const lineage = (role: string) => ({ id: 1, trophicRole: role, specialization: 0.8, groupIntegrity: 0.8, established: true });
const eco = (role: string): any => ({ active: true, ecosystemAgeYears: 3e9, establishedLineages: 1, ecosystemComplexity: 0.75, resilience: 0.75, cycles: { oxygenStability: 0.8 }, foodWeb: { producerBiomass: 0.8, primaryConsumerBiomass: 0.7, secondaryConsumerBiomass: 0.5, connectance: 0.7, predationPressure: 0.6, verticalEnergyFlux: 0.7 }, climateCoupling: { netPrimaryProductivity: 0.8 }, turnover: { successionIndex: 0.8, chronicStress: 0.1 }, lineages: [lineage(role)] });

describe('Phase 11 lineage gates', () => {
  it('does not activate from a producer-only lineage', () => {
    expect(new NeurobehaviorEvolutionModel('producer').stateAt(eco('producer'), b, s).active).toBe(false);
  });
  it('keeps pursuit at zero in a grazer-only lineage', () => {
    expect(new NeurobehaviorEvolutionModel('grazer').stateAt(eco('grazer'), b, s).strategies.pursuit).toBe(0);
  });
});
