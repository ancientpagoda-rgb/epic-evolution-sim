import { createRandomStream } from '../../core/random';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import type { MatureEcosystemState } from './ecosystem';
import type { TrophicRole } from './macroevolution';

export type BehavioralStage =
  | 'non-neural-multicellular'
  | 'sensorimotor-networks'
  | 'centralized-nervous-systems'
  | 'mobile-foraging'
  | 'predator-prey-learning'
  | 'social-cognition';

export interface SensoryState {
  chemoreception: number;
  mechanoreception: number;
  photoreception: number;
  spatialVision: number;
  proprioception: number;
  sensoryIntegration: number;
}

export interface NervousSystemState {
  neuralOriginScore: number;
  neuralGatePassed: boolean;
  integration: number;
  centralization: number;
  conductionSpeed: number;
  plasticity: number;
  energeticCost: number;
  energySupport: number;
}

export interface LocomotionState {
  mobility: number;
  endurance: number;
  maneuverability: number;
  searchRange: number;
}

export interface BehavioralStrategyState {
  foraging: number;
  avoidance: number;
  pursuit: number;
  ambush: number;
  vigilance: number;
}

export interface LearningState {
  associativeLearning: number;
  memoryPersistence: number;
  reinforcement: number;
  exploration: number;
  learningIndex: number;
}

export interface SocialBehaviorState {
  aggregation: number;
  communication: number;
  cooperation: number;
  competition: number;
  socialLearning: number;
}

export interface CognitionState {
  prediction: number;
  workingMemory: number;
  behavioralFlexibility: number;
  internalModelIndex: number;
}

export interface BehavioralLineageState {
  id: number;
  trophicRole: TrophicRole;
  motilityPotential: number;
  sensorimotorIndex: number;
  learningPotential: number;
  socialityPotential: number;
  cognitionPotential: number;
}

export interface BehavioralEvolutionState {
  active: boolean;
  stage: BehavioralStage;
  behavioralAgeYears: number;
  senses: SensoryState;
  nervousSystem: NervousSystemState;
  locomotion: LocomotionState;
  strategies: BehavioralStrategyState;
  learning: LearningState;
  social: SocialBehaviorState;
  cognition: CognitionState;
  lineages: readonly BehavioralLineageState[];
  dominantLineageId: number | null;
}

interface LineageBias {
  id: number;
  motility: number;
  learning: number;
  sociality: number;
  cognition: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function saturating(ageYears: number, timescaleYears: number): number {
  if (ageYears <= 0) return 0;
  return clamp(1 - Math.exp(-ageYears / Math.max(1, timescaleYears)));
}

function inactive(): BehavioralEvolutionState {
  return {
    active: false,
    stage: 'non-neural-multicellular',
    behavioralAgeYears: 0,
    senses: { chemoreception: 0, mechanoreception: 0, photoreception: 0, spatialVision: 0, proprioception: 0, sensoryIntegration: 0 },
    nervousSystem: { neuralOriginScore: 0, neuralGatePassed: false, integration: 0, centralization: 0, conductionSpeed: 0, plasticity: 0, energeticCost: 0, energySupport: 0 },
    locomotion: { mobility: 0, endurance: 0, maneuverability: 0, searchRange: 0 },
    strategies: { foraging: 0, avoidance: 0, pursuit: 0, ambush: 0, vigilance: 0 },
    learning: { associativeLearning: 0, memoryPersistence: 0, reinforcement: 0, exploration: 0, learningIndex: 0 },
    social: { aggregation: 0, communication: 0, cooperation: 0, competition: 0, socialLearning: 0 },
    cognition: { prediction: 0, workingMemory: 0, behavioralFlexibility: 0, internalModelIndex: 0 },
    lineages: [],
    dominantLineageId: null,
  };
}

export class NeurobehaviorEvolutionModel {
  private readonly neuralThreshold: number;
  private readonly sensoryBias: number;
  private readonly plasticityBias: number;
  private readonly socialBias: number;
  private readonly lineageBiases: readonly LineageBias[];

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase11/neurobehavior');
    this.neuralThreshold = rng.range(0.16, 0.34);
    this.sensoryBias = rng.range(0.82, 1.18);
    this.plasticityBias = rng.range(0.80, 1.20);
    this.socialBias = rng.range(0.72, 1.28);
    this.lineageBiases = Array.from({ length: 12 }, (_, id): LineageBias => ({
      id,
      motility: rng.range(0.68, 1.32),
      learning: rng.range(0.62, 1.38),
      sociality: rng.range(0.58, 1.42),
      cognition: rng.range(0.58, 1.42),
    }));
  }

  stateAt(
    ecosystem: MatureEcosystemState,
    biosphere: BiosphereEvolutionState,
    surface: SurfaceEvolutionState,
  ): BehavioralEvolutionState {
    if (!ecosystem.active || !biosphere.active || !surface.active || !surface.planet || ecosystem.establishedLineages === 0) {
      return inactive();
    }

    const ageYears = ecosystem.ecosystemAgeYears;
    const animalCandidates = ecosystem.lineages.filter(lineage =>
      lineage.established && (lineage.trophicRole === 'grazer' || lineage.trophicRole === 'predator'),
    );
    if (animalCandidates.length === 0) return inactive();

    const oxygenSupport = clamp(biosphere.feedback.oxygenFraction / 0.21);
    const energySupport = clamp(
      0.34 * ecosystem.foodWeb.verticalEnergyFlux
      + 0.24 * ecosystem.cycles.oxygenStability
      + 0.18 * oxygenSupport
      + 0.14 * ecosystem.foodWeb.producerBiomass
      + 0.10 * ecosystem.climateCoupling.netPrimaryProductivity,
    );
    const mobilityOpportunity = clamp(
      0.30 * ecosystem.foodWeb.connectance
      + 0.24 * ecosystem.foodWeb.primaryConsumerBiomass
      + 0.20 * ecosystem.foodWeb.predationPressure
      + 0.14 * ecosystem.ecosystemComplexity
      + 0.12 * ecosystem.turnover.successionIndex,
    );
    const neuralOriginScore = clamp(
      (0.34 * energySupport
      + 0.24 * mobilityOpportunity
      + 0.18 * biosphere.eukaryogenesis.cellularComplexity
      + 0.14 * ecosystem.resilience
      + 0.10 * saturating(ageYears, 6e8))
      * this.sensoryBias,
    );
    const neuralGatePassed = neuralOriginScore >= this.neuralThreshold;

    const chemoreception = clamp(0.46 + 0.30 * mobilityOpportunity + 0.24 * ecosystem.foodWeb.connectance);
    const mechanoreception = clamp(mobilityOpportunity * (0.52 + 0.48 * ecosystem.foodWeb.predationPressure));
    const photoreception = clamp(
      surface.stellarFluxEarth / 1.6
      * (0.42 + 0.58 * mobilityOpportunity)
      * (0.48 + 0.52 * saturating(ageYears, 5e8)),
    );
    const spatialVision = neuralGatePassed
      ? clamp(photoreception * neuralOriginScore * (0.45 + 0.55 * ecosystem.foodWeb.predationPressure))
      : 0;
    const proprioception = neuralGatePassed
      ? clamp(mechanoreception * (0.48 + 0.52 * neuralOriginScore))
      : 0;
    const sensoryIntegration = neuralGatePassed
      ? clamp((0.24 * chemoreception + 0.22 * mechanoreception + 0.20 * photoreception + 0.18 * spatialVision + 0.16 * proprioception) * 1.18)
      : clamp(0.22 * chemoreception + 0.18 * mechanoreception);

    const integration = neuralGatePassed ? clamp(neuralOriginScore * (0.48 + 0.52 * sensoryIntegration)) : 0;
    const centralization = neuralGatePassed
      ? clamp(integration * mobilityOpportunity * (0.48 + 0.52 * saturating(ageYears, 7e8)))
      : 0;
    const conductionSpeed = clamp(centralization * (0.42 + 0.58 * oxygenSupport) * (0.55 + 0.45 * energySupport));
    const plasticity = clamp(
      integration
      * (0.38 + 0.62 * ecosystem.foodWeb.connectance)
      * (0.42 + 0.58 * ecosystem.turnover.successionIndex)
      * this.plasticityBias,
    );
    const energeticCost = clamp(0.22 * integration + 0.34 * centralization + 0.24 * plasticity + 0.20 * conductionSpeed);
    const affordableNeuralActivity = clamp(energySupport / Math.max(0.08, energeticCost));

    const mobility = neuralGatePassed
      ? clamp(mobilityOpportunity * (0.42 + 0.58 * integration) * (0.45 + 0.55 * affordableNeuralActivity))
      : clamp(mobilityOpportunity * 0.28);
    const endurance = clamp(mobility * (0.38 + 0.62 * oxygenSupport) * (0.45 + 0.55 * energySupport));
    const maneuverability = clamp(mobility * (0.42 + 0.58 * sensoryIntegration));
    const searchRange = clamp(Math.sqrt(Math.max(0, mobility * endurance)) * (0.55 + 0.45 * spatialVision));

    const foraging = clamp(mobility * (0.40 + 0.60 * sensoryIntegration) * (0.45 + 0.55 * ecosystem.foodWeb.primaryConsumerBiomass));
    const avoidance = clamp(maneuverability * (0.42 + 0.58 * ecosystem.foodWeb.predationPressure));
    const predatorLineages = animalCandidates.filter(lineage => lineage.trophicRole === 'predator').length;
    const predatorSupport = clamp(predatorLineages / Math.max(1, animalCandidates.length));
    const pursuit = clamp(predatorSupport * mobility * spatialVision * (0.38 + 0.62 * centralization));
    const ambush = clamp(predatorSupport * sensoryIntegration * (1 - 0.45 * mobility) * (0.48 + 0.52 * ecosystem.foodWeb.connectance));
    const vigilance = clamp(avoidance * (0.48 + 0.52 * spatialVision) * (0.45 + 0.55 * centralization));

    const associativeLearning = clamp(plasticity * (0.42 + 0.58 * sensoryIntegration) * affordableNeuralActivity);
    const memoryPersistence = clamp(associativeLearning * (0.45 + 0.55 * centralization) * (0.50 + 0.50 * energySupport));
    const reinforcement = clamp(associativeLearning * (0.38 + 0.62 * ecosystem.foodWeb.predationPressure));
    const exploration = clamp(plasticity * searchRange * (0.55 + 0.45 * ecosystem.resilience));
    const learningIndex = clamp(0.30 * associativeLearning + 0.28 * memoryPersistence + 0.22 * reinforcement + 0.20 * exploration);

    const aggregation = clamp(mobility * (0.38 + 0.62 * ecosystem.foodWeb.primaryConsumerBiomass) * this.socialBias);
    const communication = clamp(sensoryIntegration * aggregation * (0.40 + 0.60 * centralization));
    const cooperation = clamp(communication * (0.38 + 0.62 * ecosystem.resilience) * (1 - 0.38 * ecosystem.turnover.chronicStress));
    const competition = clamp(aggregation * ecosystem.foodWeb.connectance * (0.45 + 0.55 * ecosystem.foodWeb.predationPressure));
    const socialLearning = clamp(learningIndex * communication * (0.45 + 0.55 * cooperation));

    const prediction = clamp(learningIndex * spatialVision * (0.42 + 0.58 * pursuit + 0.28 * avoidance));
    const workingMemory = clamp(memoryPersistence * centralization * (0.45 + 0.55 * affordableNeuralActivity));
    const behavioralFlexibility = clamp(plasticity * (0.34 + 0.66 * learningIndex) * (0.50 + 0.50 * ecosystem.turnover.successionIndex));
    const internalModelIndex = clamp(
      (0.32 * prediction + 0.28 * workingMemory + 0.24 * behavioralFlexibility + 0.16 * socialLearning)
      * (0.55 + 0.45 * saturating(ageYears, 1.2e9)),
    );

    const lineages = animalCandidates.map(lineage => {
      const bias = this.lineageBiases[lineage.id % this.lineageBiases.length]!;
      const roleDrive = lineage.trophicRole === 'predator'
        ? clamp(0.55 + 0.45 * ecosystem.foodWeb.predationPressure)
        : clamp(0.52 + 0.48 * ecosystem.foodWeb.primaryConsumerBiomass);
      const motilityPotential = clamp(mobility * lineage.groupIntegrity * roleDrive * bias.motility);
      const sensorimotorIndex = clamp(sensoryIntegration * motilityPotential * (0.48 + 0.52 * lineage.specialization));
      const learningPotential = clamp(learningIndex * sensorimotorIndex * bias.learning);
      const socialityPotential = clamp(aggregation * communication * lineage.groupIntegrity * bias.sociality);
      const cognitionPotential = clamp(internalModelIndex * (0.45 + 0.55 * learningPotential) * bias.cognition);
      return {
        id: lineage.id,
        trophicRole: lineage.trophicRole,
        motilityPotential,
        sensorimotorIndex,
        learningPotential,
        socialityPotential,
        cognitionPotential,
      } satisfies BehavioralLineageState;
    });
    const dominant = [...lineages].sort((a, b) =>
      (b.sensorimotorIndex + b.learningPotential + b.cognitionPotential)
      - (a.sensorimotorIndex + a.learningPotential + a.cognitionPotential),
    )[0] ?? null;

    let stage: BehavioralStage = 'non-neural-multicellular';
    if (neuralGatePassed && sensoryIntegration > 0.18) stage = 'sensorimotor-networks';
    if (centralization > 0.16) stage = 'centralized-nervous-systems';
    if (mobility > 0.22 && foraging > 0.16) stage = 'mobile-foraging';
    if (learningIndex > 0.16 && (pursuit > 0.08 || avoidance > 0.20)) stage = 'predator-prey-learning';
    if (socialLearning > 0.16 && internalModelIndex > 0.14) stage = 'social-cognition';

    return {
      active: true,
      stage,
      behavioralAgeYears: ageYears,
      senses: { chemoreception, mechanoreception, photoreception, spatialVision, proprioception, sensoryIntegration },
      nervousSystem: { neuralOriginScore, neuralGatePassed, integration, centralization, conductionSpeed, plasticity, energeticCost, energySupport },
      locomotion: { mobility, endurance, maneuverability, searchRange },
      strategies: { foraging, avoidance, pursuit, ambush, vigilance },
      learning: { associativeLearning, memoryPersistence, reinforcement, exploration, learningIndex },
      social: { aggregation, communication, cooperation, competition, socialLearning },
      cognition: { prediction, workingMemory, behavioralFlexibility, internalModelIndex },
      lineages,
      dominantLineageId: dominant?.id ?? null,
    };
  }
}
