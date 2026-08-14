import { describe, expect, it } from 'vitest';
import { BiosphereEvolutionModel } from '../src/science/biology/biosphere';
import type { BiologicalEvolutionState } from '../src/science/biology/model';
import type { ChemicalEvolutionState } from '../src/science/chemistry/model';
import type { SurfaceEvolutionState } from '../src/science/surface/model';

const biology = {
  active: true, stage: 'microbial-ecology', biologicalAgeYears: 2.4e9,
  originReadiness: 0.8, originThreshold: 0.08, darwinianEvolutionIndex: 0.56,
  heredity: { templateReplication: 0.82, copyingFidelity: 0.96, mutationRate: 0.04, compartmentInheritance: 0.86, genotypePhenotypeCoupling: 0.78, heritabilityIndex: 0.72 },
  metabolism: { resourceUptake: 0.82, redoxCoupling: 0.75, energyCapture: 0.79, growthCoupling: 0.76 },
  population: { abundanceIndex: 0.8, diversityIndex: 0.76, selectionStrength: 0.62, competitionIndex: 0.68, parasiteLoad: 0.08, extinctionRisk: 0.16, generations: 16000 },
  ecology: { spatialStructure: 0.78, nicheDiversity: 0.74, cooperationIndex: 0.7, diversificationIndex: 0.72 },
  variants: [],
} satisfies BiologicalEvolutionState;

const chemistry = {
  active: true, environment: 'aqueous-mineral-pore',
  routeScores: { hydrothermalInterface: 0.28, wetDryMineral: 0.22, aqueousMineralPore: 0.42, iceBrine: 0.08 },
  temperatureK: 292, pressureBar: 1.2, pHProxy: 7.3, ionicStrengthProxy: 0.6, mineralCatalysisIndex: 0.72,
  chemistryAgeYears: 2.8e9, suitability: 0.84,
  feedstocks: { carbon: 0.78, nitrogen: 0.76, phosphorus: 0.72, sulfur: 0.68, iron: 0.7, amphiphilePrecursors: 0.78 },
  energy: { uv: 0.62, geothermal: 0.48, redox: 0.7, wetDryCycling: 0.45, impactElectrical: 0.03, totalGradient: 0.68 },
  network: { simpleOrganics: 0.88, aminoPrecursors: 0.82, nucleotidePrecursors: 0.8, amphiphiles: 0.86, peptideOligomers: 0.78, nucleotidePolymers: 0.8, compartments: 0.84, autocatalyticNetworks: 0.76 },
  polymerizationIndex: 0.79, compartmentIndex: 0.84, chemicalSelectionPotential: 0.58, protocellLikeIndex: 0.7, complexityIndex: 0.82,
} satisfies ChemicalEvolutionState;

const surface = {
  active: true,
  planet: { id: 3, massEarth: 1, coreMassEarth: 0.7, radiusEarth: 1, semimajorAxisAu: 1, eccentricity: 0.02, inclinationDeg: 1, meanLongitudeRadians: 0.2, composition: 'water-rich', gasEnvelopeFraction: 0.001, iceFraction: 0.15, formationProgress: 1, status: 'planet' },
  ageYears: 3e9, radiusKm: 6371, gravityEarth: 1, escapeVelocityKmS: 11.2, stellarFluxEarth: 1, equilibriumTemperatureK: 255, surfaceTemperatureK: 289, albedo: 0.3, climate: 'temperate',
  interior: { differentiated: true, differentiationProgress: 1, coreMassFraction: 0.3, coreRadiusFraction: 0.52, mantleTemperatureK: 1700, heatFluxEarth: 0.8, convectionIndex: 0.55, tectonicMobilityIndex: 0.5, tectonicRegime: 'episodic', volcanismIndex: 0.28, dynamoIndex: 0.6, crustThicknessKm: 30, impactFluxIndex: 0.03 },
  atmosphere: { retainedFraction: 0.86, surfacePressureBar: 1.1, co2Fraction: 0.02, waterVaporFraction: 0.02, greenhouseDeltaK: 34 },
  hydrosphere: { initialWaterEarthOceans: 1.4, retainedWaterEarthOceans: 1.2, liquidWaterFraction: 0.92, iceFraction: 0.04, oceanCoverage: 0.62, weatheringIndex: 0.74 },
} satisfies SurfaceEvolutionState;

describe('Phase 9 biosphere', () => {
  it('requires active biology', () => {
    const off = { ...biology, active: false, stage: 'pre-darwinian' as const };
    expect(new BiosphereEvolutionModel('p9-off').stateAt(off, chemistry, surface).active).toBe(false);
  });

  it('separates oxygen production from retained atmospheric oxygen', () => {
    const state = new BiosphereEvolutionModel('p9-o2').stateAt(biology, chemistry, surface);
    expect(state.feedback.oxygenSinkCapacity).toBeGreaterThan(0);
    expect(state.feedback.oxygenFraction).toBeLessThanOrEqual(0.35);
  });

  it('keeps exchange bounded', () => {
    const state = new BiosphereEvolutionModel('p9-net').stateAt(biology, chemistry, surface);
    for (const value of Object.values(state.horizontalExchange)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(state.horizontalExchange)) expect(value).toBeLessThanOrEqual(1);
  });

  it('requires the complex-cell transition before multicellularity can establish', () => {
    const state = new BiosphereEvolutionModel('p9-order').stateAt(biology, chemistry, surface);
    if (!state.eukaryogenesis.established) expect(state.multicellularity.established).toBe(false);
  });

  it('is deterministic', () => {
    const a = new BiosphereEvolutionModel('p9-repeat').stateAt(biology, chemistry, surface);
    const b = new BiosphereEvolutionModel('p9-repeat').stateAt(biology, chemistry, surface);
    expect(a).toEqual(b);
  });
});
