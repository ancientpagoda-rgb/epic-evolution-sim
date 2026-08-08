import { createRandomStream } from '../../core/random';
import type { ChemicalEvolutionState } from '../chemistry/model';
import type { SurfaceEvolutionState } from '../surface/model';

export type BiologicalStage =
  | 'pre-darwinian'
  | 'replicator-population'
  | 'protocellular-evolution'
  | 'microbial-ecology';

export interface ReplicatorVariantState {
  id: number;
  frequency: number;
  replicationEfficiency: number;
  catalyticCoupling: number;
  copyingFidelity: number;
  parasite: boolean;
}

export interface HeredityState {
  templateReplication: number;
  copyingFidelity: number;
  mutationRate: number;
  compartmentInheritance: number;
  genotypePhenotypeCoupling: number;
  heritabilityIndex: number;
}

export interface MetabolismState {
  resourceUptake: number;
  redoxCoupling: number;
  energyCapture: number;
  growthCoupling: number;
}

export interface PopulationEvolutionState {
  abundanceIndex: number;
  diversityIndex: number;
  selectionStrength: number;
  competitionIndex: number;
  parasiteLoad: number;
  extinctionRisk: number;
  generations: number;
}

export interface EcologyState {
  spatialStructure: number;
  nicheDiversity: number;
  cooperationIndex: number;
  diversificationIndex: number;
}

export interface BiologicalEvolutionState {
  active: boolean;
  stage: BiologicalStage;
  biologicalAgeYears: number;
  originReadiness: number;
  originThreshold: number;
  darwinianEvolutionIndex: number;
  heredity: HeredityState;
  metabolism: MetabolismState;
  population: PopulationEvolutionState;
  ecology: EcologyState;
  variants: readonly ReplicatorVariantState[];
}

interface SeedVariant {
  id: number;
  replicationEfficiency: number;
  catalyticCoupling: number;
  copyingFidelity: number;
  parasite: boolean;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function entropyDiversity(frequencies: readonly number[]): number {
  const positive = frequencies.filter(value => value > 1e-12);
  if (positive.length <= 1) return 0;
  const entropy = -positive.reduce((sum, value) => sum + value * Math.log(value), 0);
  return clamp(entropy / Math.log(positive.length));
}

function emptyState(originThreshold: number, originReadiness = 0): BiologicalEvolutionState {
  return {
    active: false,
    stage: 'pre-darwinian',
    biologicalAgeYears: 0,
    originReadiness,
    originThreshold,
    darwinianEvolutionIndex: 0,
    heredity: {
      templateReplication: 0,
      copyingFidelity: 0,
      mutationRate: 0,
      compartmentInheritance: 0,
      genotypePhenotypeCoupling: 0,
      heritabilityIndex: 0,
    },
    metabolism: {
      resourceUptake: 0,
      redoxCoupling: 0,
      energyCapture: 0,
      growthCoupling: 0,
    },
    population: {
      abundanceIndex: 0,
      diversityIndex: 0,
      selectionStrength: 0,
      competitionIndex: 0,
      parasiteLoad: 0,
      extinctionRisk: 1,
      generations: 0,
    },
    ecology: {
      spatialStructure: 0,
      nicheDiversity: 0,
      cooperationIndex: 0,
      diversificationIndex: 0,
    },
    variants: [],
  };
}

export class BiologicalEvolutionModel {
  private readonly originThreshold: number;
  private readonly growthFactor: number;
  private readonly selectionFactor: number;
  private readonly fidelityFactor: number;
  private readonly seedVariants: readonly SeedVariant[];

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase8/biological-evolution');
    this.originThreshold = rng.range(0.055, 0.105);
    this.growthFactor = rng.range(0.88, 1.12);
    this.selectionFactor = rng.range(0.85, 1.15);
    this.fidelityFactor = rng.range(0.94, 1.06);
    this.seedVariants = Array.from({ length: 14 }, (_, id): SeedVariant => {
      const parasite = id >= 11;
      return {
        id,
        replicationEfficiency: clamp(rng.range(parasite ? 0.72 : 0.42, parasite ? 1 : 0.88)),
        catalyticCoupling: clamp(rng.range(parasite ? 0.01 : 0.18, parasite ? 0.18 : 0.92)),
        copyingFidelity: clamp(rng.range(0.72, 0.94)),
        parasite,
      };
    });
  }

  stateAt(chemistry: ChemicalEvolutionState, surface: SurfaceEvolutionState): BiologicalEvolutionState {
    if (!chemistry.active || !surface.active || !surface.planet) return emptyState(this.originThreshold);

    const hereditySubstrate = Math.sqrt(
      Math.max(0, chemistry.network.nucleotidePolymers * chemistry.network.compartments),
    );
    const catalyticSubstrate = Math.sqrt(
      Math.max(0, chemistry.network.peptideOligomers * chemistry.network.autocatalyticNetworks),
    );
    const energeticSupport = chemistry.energy.totalGradient * (0.3 + 0.7 * chemistry.suitability);
    const compartmentSupport = chemistry.network.compartments
      * (0.35 + 0.65 * chemistry.network.amphiphiles);
    const originReadiness = clamp(
      0.34 * hereditySubstrate
      + 0.22 * catalyticSubstrate
      + 0.18 * energeticSupport
      + 0.16 * compartmentSupport
      + 0.10 * chemistry.chemicalSelectionPotential,
    );

    if (originReadiness < this.originThreshold) return emptyState(this.originThreshold, originReadiness);

    const excess = clamp((originReadiness - this.originThreshold) / Math.max(0.02, 1 - this.originThreshold));
    const onsetDelayYears = 1.5e6 + 28e6 * (1 - clamp(excess * 4));
    const biologicalAgeYears = Math.max(0, chemistry.chemistryAgeYears - onsetDelayYears);
    if (biologicalAgeYears <= 0) return emptyState(this.originThreshold, originReadiness);

    const templateReplication = clamp(
      chemistry.network.nucleotidePolymers
      * (0.32 + 0.68 * chemistry.network.autocatalyticNetworks)
      * (0.45 + 0.55 * chemistry.energy.totalGradient),
    );
    const compartmentInheritance = clamp(
      chemistry.network.compartments * (0.45 + 0.55 * chemistry.network.amphiphiles),
    );
    const genotypePhenotypeCoupling = clamp(
      Math.sqrt(Math.max(0, chemistry.network.nucleotidePolymers * chemistry.network.peptideOligomers))
      * (0.35 + 0.65 * chemistry.network.autocatalyticNetworks),
    );
    const copyingFidelity = clamp(
      (0.70 + 0.23 * templateReplication + 0.05 * chemistry.mineralCatalysisIndex) * this.fidelityFactor,
      0.62,
      0.985,
    );
    const mutationRate = 1 - copyingFidelity;
    const heritabilityIndex = clamp(
      templateReplication * copyingFidelity * compartmentInheritance
      * (0.35 + 0.65 * genotypePhenotypeCoupling),
    );

    const redoxCoupling = clamp(chemistry.energy.redox + 0.25 * chemistry.energy.geothermal);
    const resourceUptake = clamp(
      0.34 * chemistry.network.simpleOrganics
      + 0.22 * chemistry.feedstocks.carbon
      + 0.18 * chemistry.feedstocks.nitrogen
      + 0.14 * chemistry.feedstocks.phosphorus
      + 0.12 * chemistry.feedstocks.sulfur,
    );
    const energyCapture = clamp(
      0.46 * chemistry.energy.totalGradient
      + 0.28 * redoxCoupling
      + 0.16 * chemistry.network.peptideOligomers
      + 0.10 * chemistry.mineralCatalysisIndex,
    );
    const growthCoupling = clamp(
      Math.sqrt(Math.max(0, resourceUptake * energyCapture))
      * (0.4 + 0.6 * genotypePhenotypeCoupling)
      * this.growthFactor,
    );

    const generations = Math.floor(clamp(Math.log10(1 + biologicalAgeYears) / 9, 0, 1) * 18_000);
    const variantResult = this.evolveVariants(
      generations,
      resourceUptake,
      energyCapture,
      compartmentInheritance,
      mutationRate,
    );
    const diversityIndex = entropyDiversity(variantResult.frequencies);
    const parasiteLoad = variantResult.variants.reduce(
      (sum, variant) => sum + (variant.parasite ? variant.frequency : 0),
      0,
    );
    const meanFitness = variantResult.meanFitness;
    const selectionStrength = clamp(variantResult.fitnessSpread * this.selectionFactor * 2.8);
    const competitionIndex = clamp(
      meanFitness * (0.35 + 0.65 * resourceUptake) * (0.3 + 0.7 * compartmentInheritance),
    );
    const abundanceIndex = clamp(
      (1 - Math.exp(-biologicalAgeYears / 8e6))
      * growthCoupling
      * heritabilityIndex
      * (1 - 0.55 * parasiteLoad),
    );
    const extinctionRisk = clamp(
      0.78
      - 0.34 * heritabilityIndex
      - 0.28 * growthCoupling
      - 0.20 * compartmentInheritance
      + 0.42 * parasiteLoad
      + 0.24 * Math.max(0, mutationRate - 0.18),
    );

    const spatialStructure = clamp(
      0.45 * compartmentInheritance
      + 0.25 * chemistry.routeScores.aqueousMineralPore
      + 0.18 * chemistry.routeScores.hydrothermalInterface
      + 0.12 * chemistry.routeScores.wetDryMineral,
    );
    const cooperationIndex = clamp(
      genotypePhenotypeCoupling * spatialStructure * (1 - parasiteLoad)
      * (0.45 + 0.55 * energyCapture),
    );
    const nicheDiversity = clamp(
      diversityIndex * (0.35 + 0.65 * spatialStructure)
      * (0.4 + 0.6 * chemistry.routeScores.hydrothermalInterface + 0.4 * chemistry.routeScores.aqueousMineralPore),
    );
    const diversificationIndex = clamp(
      (1 - Math.exp(-biologicalAgeYears / 6e7))
      * diversityIndex * selectionStrength * (0.45 + 0.55 * nicheDiversity),
    );

    const darwinianEvolutionIndex = clamp(
      heritabilityIndex
      * (0.30 + 0.70 * selectionStrength)
      * (0.30 + 0.70 * competitionIndex)
      * (1 - 0.45 * extinctionRisk),
    );

    let stage: BiologicalStage = 'replicator-population';
    if (darwinianEvolutionIndex > 0.10 && abundanceIndex > 0.03) stage = 'protocellular-evolution';
    if (diversificationIndex > 0.06 && abundanceIndex > 0.08) stage = 'microbial-ecology';

    return {
      active: darwinianEvolutionIndex > 0.012 && heritabilityIndex > 0.018,
      stage,
      biologicalAgeYears,
      originReadiness,
      originThreshold: this.originThreshold,
      darwinianEvolutionIndex,
      heredity: {
        templateReplication,
        copyingFidelity,
        mutationRate,
        compartmentInheritance,
        genotypePhenotypeCoupling,
        heritabilityIndex,
      },
      metabolism: {
        resourceUptake,
        redoxCoupling,
        energyCapture,
        growthCoupling,
      },
      population: {
        abundanceIndex,
        diversityIndex,
        selectionStrength,
        competitionIndex,
        parasiteLoad,
        extinctionRisk,
        generations,
      },
      ecology: {
        spatialStructure,
        nicheDiversity,
        cooperationIndex,
        diversificationIndex,
      },
      variants: variantResult.variants,
    };
  }

  private evolveVariants(
    generations: number,
    resourceUptake: number,
    energyCapture: number,
    compartmentInheritance: number,
    mutationRate: number,
  ): { variants: ReplicatorVariantState[]; frequencies: number[]; meanFitness: number; fitnessSpread: number } {
    const count = this.seedVariants.length;
    const frequencies = this.seedVariants.map((_, index) => 1 / count * (1 + (index % 3) * 0.02));
    const initialTotal = frequencies.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < count; i += 1) frequencies[i] = (frequencies[i] ?? 0) / initialTotal;

    const steps = Math.min(420, Math.max(1, Math.ceil(generations / 45)));
    const effectiveMutation = clamp(mutationRate * 0.14, 0.002, 0.08);
    let finalFitness = new Array<number>(count).fill(0);

    for (let step = 0; step < steps; step += 1) {
      const fitness = this.seedVariants.map(variant => {
        const catalyticBenefit = variant.catalyticCoupling * energyCapture
          * (0.45 + 0.55 * compartmentInheritance);
        const replicationBenefit = variant.replicationEfficiency * resourceUptake;
        const fidelityBenefit = variant.copyingFidelity * 0.22;
        const parasitePenalty = variant.parasite
          ? 0.24 * compartmentInheritance * catalyticBenefit
          : 0;
        return Math.max(0.001, 0.12 + replicationBenefit + catalyticBenefit + fidelityBenefit - parasitePenalty);
      });
      finalFitness = fitness;
      const weighted = frequencies.map((frequency, index) => frequency * (fitness[index] ?? 0));
      const totalWeighted = Math.max(1e-12, weighted.reduce((sum, value) => sum + value, 0));
      const selected = weighted.map(value => value / totalWeighted);
      const next = new Array<number>(count).fill(0);
      for (let i = 0; i < count; i += 1) {
        const retained = (selected[i] ?? 0) * (1 - effectiveMutation);
        next[i] = (next[i] ?? 0) + retained;
        const mutated = (selected[i] ?? 0) * effectiveMutation;
        next[(i + count - 1) % count] = (next[(i + count - 1) % count] ?? 0) + mutated * 0.5;
        next[(i + 1) % count] = (next[(i + 1) % count] ?? 0) + mutated * 0.5;
      }
      const total = Math.max(1e-12, next.reduce((sum, value) => sum + value, 0));
      for (let i = 0; i < count; i += 1) frequencies[i] = (next[i] ?? 0) / total;
    }

    const meanFitness = finalFitness.reduce(
      (sum, value, index) => sum + value * (frequencies[index] ?? 0),
      0,
    );
    const fitnessSpread = Math.sqrt(finalFitness.reduce(
      (sum, value, index) => sum + (frequencies[index] ?? 0) * (value - meanFitness) ** 2,
      0,
    ));
    const maturation = smoothstep(0, 1500, generations);
    const variants = this.seedVariants.map((variant, index): ReplicatorVariantState => ({
      id: variant.id,
      frequency: frequencies[index] ?? 0,
      replicationEfficiency: variant.replicationEfficiency,
      catalyticCoupling: variant.catalyticCoupling * (0.72 + 0.28 * maturation),
      copyingFidelity: clamp(variant.copyingFidelity + 0.035 * maturation),
      parasite: variant.parasite,
    }));

    return { variants, frequencies, meanFitness, fitnessSpread };
  }
}
