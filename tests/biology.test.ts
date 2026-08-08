import { describe, expect, it } from 'vitest';
import { BiologicalEvolutionModel } from '../src/science/biology/model';
import type { ChemicalEvolutionState } from '../src/science/chemistry/model';
import type { SurfaceEvolutionState } from '../src/science/surface/model';

function surfaceFixture(): SurfaceEvolutionState {
  return {
    active: true,
    planet: {
      id: 4,
      massEarth: 1.02,
      coreMassEarth: 0.73,
      radiusEarth: 1.01,
      semimajorAxisAu: 1.0,
      eccentricity: 0.02,
      inclinationDeg: 0.8,
      meanLongitudeRadians: 0.4,
      composition: 'water-rich',
      gasEnvelopeFraction: 0.001,
      iceFraction: 0.18,
      formationProgress: 1,
      status: 'planet',
    },
    ageYears: 1.5e9,
    radiusKm: 6435,
    gravityEarth: 1.0,
    escapeVelocityKmS: 11.3,
    stellarFluxEarth: 1,
    equilibriumTemperatureK: 255,
    surfaceTemperatureK: 295,
    albedo: 0.3,
    climate: 'temperate',
    interior: {
      differentiated: true,
      differentiationProgress: 1,
      coreMassFraction: 0.28,
      coreRadiusFraction: 0.52,
      mantleTemperatureK: 1780,
      heatFluxEarth: 0.95,
      convectionIndex: 0.58,
      tectonicMobilityIndex: 0.52,
      tectonicRegime: 'episodic',
      volcanismIndex: 0.42,
      dynamoIndex: 0.6,
      crustThicknessKm: 28,
      impactFluxIndex: 0.08,
    },
    atmosphere: {
      retainedFraction: 0.84,
      surfacePressureBar: 1.1,
      co2Fraction: 0.025,
      waterVaporFraction: 0.02,
      greenhouseDeltaK: 36,
    },
    hydrosphere: {
      initialWaterEarthOceans: 1.6,
      retainedWaterEarthOceans: 1.3,
      liquidWaterFraction: 0.9,
      iceFraction: 0.05,
      oceanCoverage: 0.58,
      weatheringIndex: 0.7,
    },
  };
}

function chemistryFixture(ageYears = 9e8): ChemicalEvolutionState {
  return {
    active: true,
    environment: 'aqueous-mineral-pore',
    routeScores: {
      hydrothermalInterface: 0.26,
      wetDryMineral: 0.24,
      aqueousMineralPore: 0.38,
      iceBrine: 0.12,
    },
    temperatureK: 295,
    pressureBar: 1.1,
    pHProxy: 7.4,
    ionicStrengthProxy: 0.62,
    mineralCatalysisIndex: 0.74,
    chemistryAgeYears: ageYears,
    suitability: 0.82,
    feedstocks: {
      carbon: 0.78,
      nitrogen: 0.7,
      phosphorus: 0.64,
      sulfur: 0.56,
      iron: 0.68,
      amphiphilePrecursors: 0.73,
    },
    energy: {
      uv: 0.38,
      geothermal: 0.57,
      redox: 0.66,
      wetDryCycling: 0.48,
      impactElectrical: 0.08,
      totalGradient: 0.62,
    },
    network: {
      simpleOrganics: 0.86,
      aminoPrecursors: 0.74,
      nucleotidePrecursors: 0.72,
      amphiphiles: 0.8,
      peptideOligomers: 0.69,
      nucleotidePolymers: 0.76,
      compartments: 0.79,
      autocatalyticNetworks: 0.67,
    },
    polymerizationIndex: 0.73,
    compartmentIndex: 0.79,
    chemicalSelectionPotential: 0.48,
    protocellLikeIndex: 0.61,
    complexityIndex: 0.76,
  };
}

describe('Phase 8 Darwinian threshold', () => {
  it('does not call low-organized chemistry biological life', () => {
    const chemistry = chemistryFixture();
    chemistry.network.nucleotidePolymers = 0.003;
    chemistry.network.compartments = 0.004;
    chemistry.network.autocatalyticNetworks = 0.003;
    chemistry.network.peptideOligomers = 0.01;
    chemistry.chemicalSelectionPotential = 0.002;
    const state = new BiologicalEvolutionModel('bio-gated').stateAt(chemistry, surfaceFixture());
    expect(state.active).toBe(false);
    expect(state.stage).toBe('pre-darwinian');
    expect(state.darwinianEvolutionIndex).toBe(0);
  });

  it('requires a parent chemical and planetary environment', () => {
    const chemistry = chemistryFixture();
    chemistry.active = false;
    const state = new BiologicalEvolutionModel('bio-parent').stateAt(chemistry, surfaceFixture());
    expect(state.active).toBe(false);
    expect(state.variants).toHaveLength(0);
  });

  it('crosses into a heritable replicator population under favorable inherited chemistry', () => {
    const state = new BiologicalEvolutionModel('bio-favorable').stateAt(chemistryFixture(), surfaceFixture());
    expect(state.originReadiness).toBeGreaterThan(state.originThreshold);
    expect(state.heredity.templateReplication).toBeGreaterThan(0);
    expect(state.heredity.compartmentInheritance).toBeGreaterThan(0);
    expect(state.heredity.copyingFidelity).toBeGreaterThan(0.6);
    expect(state.heredity.mutationRate).toBeGreaterThan(0);
    expect(state.population.generations).toBeGreaterThan(0);
    expect(state.variants.length).toBeGreaterThan(2);
    expect(state.active).toBe(true);
  });
});

describe('Phase 8 population evolution', () => {
  it('keeps variant frequencies normalized after selection and mutation', () => {
    const state = new BiologicalEvolutionModel('bio-frequencies').stateAt(chemistryFixture(), surfaceFixture());
    const total = state.variants.reduce((sum, variant) => sum + variant.frequency, 0);
    expect(total).toBeCloseTo(1, 10);
    for (const variant of state.variants) {
      expect(variant.frequency).toBeGreaterThanOrEqual(0);
      expect(variant.frequency).toBeLessThanOrEqual(1);
    }
  });

  it('preserves imperfect copying rather than error-free heredity', () => {
    const state = new BiologicalEvolutionModel('bio-mutation').stateAt(chemistryFixture(), surfaceFixture());
    expect(state.heredity.copyingFidelity).toBeLessThan(1);
    expect(state.heredity.mutationRate).toBeCloseTo(1 - state.heredity.copyingFidelity, 12);
  });

  it('tracks competing parasite variants inside protocells', () => {
    const state = new BiologicalEvolutionModel('bio-parasites').stateAt(chemistryFixture(), surfaceFixture());
    expect(state.variants.some(variant => variant.parasite)).toBe(true);
    expect(state.population.parasiteLoad).toBeGreaterThanOrEqual(0);
    expect(state.population.parasiteLoad).toBeLessThanOrEqual(1);
  });

  it('is deterministic for the same continuum seed', () => {
    const chemistry = chemistryFixture();
    const surface = surfaceFixture();
    const a = new BiologicalEvolutionModel('bio-determinism').stateAt(chemistry, surface);
    const b = new BiologicalEvolutionModel('bio-determinism').stateAt(chemistry, surface);
    expect(a.stage).toBe(b.stage);
    expect(a.darwinianEvolutionIndex).toBe(b.darwinianEvolutionIndex);
    expect(a.variants).toEqual(b.variants);
  });

  it('accumulates more generations with more biological time under identical conditions', () => {
    const model = new BiologicalEvolutionModel('bio-time');
    const early = model.stateAt(chemistryFixture(8e7), surfaceFixture());
    const late = model.stateAt(chemistryFixture(1.4e9), surfaceFixture());
    expect(late.biologicalAgeYears).toBeGreaterThan(early.biologicalAgeYears);
    expect(late.population.generations).toBeGreaterThanOrEqual(early.population.generations);
  });

  it('keeps normalized biological indices bounded', () => {
    const state = new BiologicalEvolutionModel('bio-bounds').stateAt(chemistryFixture(), surfaceFixture());
    const indices = [
      state.originReadiness,
      state.darwinianEvolutionIndex,
      state.heredity.templateReplication,
      state.heredity.copyingFidelity,
      state.heredity.mutationRate,
      state.heredity.compartmentInheritance,
      state.heredity.genotypePhenotypeCoupling,
      state.heredity.heritabilityIndex,
      state.metabolism.resourceUptake,
      state.metabolism.redoxCoupling,
      state.metabolism.energyCapture,
      state.metabolism.growthCoupling,
      state.population.abundanceIndex,
      state.population.diversityIndex,
      state.population.selectionStrength,
      state.population.competitionIndex,
      state.population.parasiteLoad,
      state.population.extinctionRisk,
      state.ecology.spatialStructure,
      state.ecology.nicheDiversity,
      state.ecology.cooperationIndex,
      state.ecology.diversificationIndex,
    ];
    for (const value of indices) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
