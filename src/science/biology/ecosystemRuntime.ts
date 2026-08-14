import { createRandomStream } from '../../core/random';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import { deriveRuntimeCycles } from './biogeochemistryRuntime';
import { deriveClimateCoupling } from './climateCoupling';
import { deriveFoodWeb } from './foodweb';
import { MacroevolutionModel } from './macroevolution';
import type { MatureEcosystemStage, MatureEcosystemState } from './ecosystem';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export class MatureEcosystemRuntime {
  private readonly transferEfficiency: number;
  private readonly macro: MacroevolutionModel;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase10/runtime-ecosystem');
    this.transferEfficiency = rng.range(0.07, 0.18);
    this.macro = new MacroevolutionModel(seed);
  }

  stateAt(biosphere: BiosphereEvolutionState, surface: SurfaceEvolutionState): MatureEcosystemState {
    const cycles = deriveRuntimeCycles(biosphere, surface);
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
    const remainingBiodiversity = clamp(
      biosphere.ecosystem.biodiversityIndex * (1 - turnover.biodiversityReduction),
    );
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
    if (establishedLineages >= 2 && resilience > 0.42 && ecosystemComplexity > 0.34 && turnover.recoveryProgress > 0.62) {
      stage = 'resilient-complex-ecosystem';
    }

    return {
      active: biosphere.active && surface.active && Boolean(surface.planet),
      stage: biosphere.active && surface.active && surface.planet ? stage : 'inactive',
      ecosystemAgeYears: biosphere.biosphereAgeYears,
      cycles,
      foodWeb,
      lineages,
      turnover,
      climateCoupling,
      establishedLineages,
      ecosystemComplexity,
      resilience,
    };
  }
}
