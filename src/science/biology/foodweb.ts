import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import type { BiogeochemicalCycleState } from './biogeochemistry';

export interface FoodWebState {
  producerBiomass: number;
  primaryConsumerBiomass: number;
  secondaryConsumerBiomass: number;
  decomposerBiomass: number;
  detritalPool: number;
  trophicTransferEfficiency: number;
  connectance: number;
  predationPressure: number;
  verticalEnergyFlux: number;
  trophicLevels: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveFoodWeb(
  biosphere: BiosphereEvolutionState,
  cycles: BiogeochemicalCycleState,
  surface: SurfaceEvolutionState,
  baselineTransferEfficiency: number,
): FoodWebState {
  const temperaturePenalty = clamp(Math.abs(surface.surfaceTemperatureK - 288) / 105);
  const thermalTransfer = clamp(1 - 0.56 * temperaturePenalty);
  const trophicTransferEfficiency = clamp(baselineTransferEfficiency * thermalTransfer, 0.03, 0.22);

  const producerBiomass = clamp(
    biosphere.ecosystem.producerIndex
    * cycles.nutrientSupport
    * (0.52 + 0.48 * biosphere.feedback.primaryProductivity),
  );
  const consumerAccess = clamp(
    0.18
    + 0.44 * biosphere.eukaryogenesis.cellularComplexity
    + 0.38 * biosphere.multicellularity.groupSelection,
  );
  const primaryConsumerBiomass = clamp(
    producerBiomass * trophicTransferEfficiency * consumerAccess * 4.2,
  );
  const predatorAccess = clamp(
    0.10
    + 0.46 * biosphere.multicellularity.differentiation
    + 0.44 * biosphere.ecosystem.trophicComplexity,
  );
  const secondaryConsumerBiomass = clamp(
    primaryConsumerBiomass * trophicTransferEfficiency * predatorAccess * 4.8,
  );
  const decomposerBiomass = clamp(
    biosphere.ecosystem.decomposerIndex * (0.45 + 0.55 * cycles.detritalRecycling),
  );
  const detritalPool = clamp(
    0.36 * producerBiomass
    + 0.30 * primaryConsumerBiomass
    + 0.22 * secondaryConsumerBiomass
    + 0.12 * biosphere.ecosystem.extinctionPressure,
  );
  const connectance = clamp(
    0.26 * biosphere.ecosystem.biodiversityIndex
    + 0.24 * biosphere.ecosystem.trophicComplexity
    + 0.20 * biosphere.horizontalExchange.networkConnectivity
    + 0.18 * decomposerBiomass
    + 0.12 * biosphere.ecosystem.resilienceIndex,
  );
  const predationPressure = clamp(
    secondaryConsumerBiomass * (0.42 + 0.58 * connectance) * 1.7,
  );
  const verticalEnergyFlux = clamp(
    producerBiomass
    * (0.52 + 0.48 * primaryConsumerBiomass)
    * (0.64 + 0.36 * trophicTransferEfficiency / 0.22),
  );
  const trophicLevels = secondaryConsumerBiomass > 0.12
    ? 4
    : primaryConsumerBiomass > 0.08 ? 3 : producerBiomass > 0.03 ? 2 : 1;

  return {
    producerBiomass,
    primaryConsumerBiomass,
    secondaryConsumerBiomass,
    decomposerBiomass,
    detritalPool,
    trophicTransferEfficiency,
    connectance,
    predationPressure,
    verticalEnergyFlux,
    trophicLevels,
  };
}
