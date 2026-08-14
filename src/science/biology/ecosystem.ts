import { createRandomStream } from '../../core/random';
import type { ChemicalEvolutionState } from '../chemistry/model';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import { deriveBiogeochemicalCycles, type BiogeochemicalCycleState } from './biogeochemistry';
import { deriveClimateCoupling, type BiosphereClimateCouplingState } from './climateCoupling';
import { deriveFoodWeb, type FoodWebState } from './foodweb';
import { MacroevolutionModel, type EcologicalTurnoverState, type MulticellularLineageState } from './macroevolution';

export type MatureEcosystemStage =
  | 'inactive'
  | 'microbial-cycling'
  | 'structured-food-web'
  | 'macroscopic-radiation'
  | 'disturbance-recovery'
  | 'resilient-complex-ecosystem';

export interface MatureEcosystemState {
  active: boolean;
  stage: MatureEcosystemStage;
  ecosystemAgeYears: number;
  cycles: BiogeochemicalCycleState;
  foodWeb: FoodWebState;
  lineages: readonly MulticellularLineageState[];
  turnover: EcologicalTurnoverState;
  climateCoupling: BiosphereClimateCouplingState;
  establishedLineages: number;
  ecosystemComplexity: number;
  resilience: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function inactive(): MatureEcosystemState {
  return {
    active: false,
    stage: 'inactive',
    ecosystemAgeYears: 0,
    cycles: { carbonAvailability: 0, nitrogenAvailability: 0, phosphorusAvailability: 0, oxygenStability: 0, recyclingEfficiency: 0, detritalRecycling: 0, nutrientSupport: 0, limitingNutrient: 'co-limited' },
    foodWeb: { producerBiomass: 0, primaryConsumerBiomass: 0, secondaryConsumerBiomass: 0, decomposerBiomass: 0, detritalPool: 0, trophicTransferEfficiency: 0, connectance: 0, predationPressure: 0, verticalEnergyFlux: 0, trophicLevels: 0 },
    lineages: [],
    turnover: { pulseIntensity: 0, chronicStress: 0, biodiversityReduction: 0, trophicCascadeRisk: 0, majorTurnover: false, recoveryProgress: 0, successionIndex: 0, timeSinceMajorPulseYears: 0 },
    climateCoupling: { netPrimaryProductivity: 0, carbonBurial: 0, methaneOxidation: 0, oxygenBuffering: 0, biologicalWeathering: 0, climateBuffering: 0 },
    establishedLineages: 0,
    ecosystemComplexity: 0,
    resilience: 0,
  };
}

export class MatureEcosystemModel {
  private readonly transferEfficiency: number;
  private readonly macro: MacroevolutionModel;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase10/ecosystem');
    this.transferEfficiency = rng.range(0.07, 0.18);
    this.macro = new MacroevolutionModel(seed);
  }

  stateAt(biosphere: BiosphereEvolutionState, chemistry: ChemicalEvolutionState, surface: SurfaceEvolutionState): MatureEcosystemState {
    if (!biosphere.active || !surface.active || !surface.planet) return inactive();

    const cycles = deriveBiogeochemicalCycles(biosphere, chemistry, surface);
    const foodWeb = deriveFoodWeb(biosphere, cycles, surface, this.transferEfficiency);
    const lineages = this.macro.deriveLineages(biosphere, cycles, foodWeb);
    const turnover = this.macro.deriveTurnover(biosphere, cycles, foodWeb, surface);
    const climateCoupling = deriveClimateCoupling(biosphere, cycles, foodWeb, surface, turnover.pulseIntensity);
    const establishedLineages = lineages.filter(lineage => lineage.established).length;
    const lineageDiversity = clamp(establishedLineages / 6);
    const ecosystemComplexity = clamp(
      0.20 * cycles.nutrientSupport
      + 0.22 * foodWeb.connectance
      + 0.20 * biosphere.ecosystem.biodiversityIndex
      + 0.18 * lineageDiversity
      + 0.12 * foodWeb.verticalEnergyFlux
      + 0.08 * turnover.successionIndex,
    );
    const remainingBiodiversity = clamp(biosphere.ecosystem.biodiversityIndex * (1 - turnover.biodiversityReduction));
    const resilience = clamp(
      0.26 * biosphere.ecosystem.resilienceIndex
      + 0.24 * cycles.recyclingEfficiency
      + 0.20 * remainingBiodiversity
      + 0.16 * foodWeb.connectance
      + 0.14 * turnover.recoveryProgress,
    );

    let stage: MatureEcosystemStage = 'microbial-cycling';
    if (foodWeb.trophicLevels >= 3 && foodWeb.connectance > 0.16) stage = 'structured-food-web';
    if (establishedLineages >= 2 && ecosystemComplexity > 0.22) stage = 'macroscopic-radiation';
    if (turnover.pulseIntensity > 0.32 && turnover.recoveryProgress < 0.72) stage = 'disturbance-recovery';
    if (establishedLineages >= 2 && resilience > 0.42 && ecosystemComplexity > 0.34 && turnover.recoveryProgress > 0.62) stage = 'resilient-complex-ecosystem';

    return { active: true, stage, ecosystemAgeYears: biosphere.biosphereAgeYears, cycles, foodWeb, lineages, turnover, climateCoupling, establishedLineages, ecosystemComplexity, resilience };
  }
}
