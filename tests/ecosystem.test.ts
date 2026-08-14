import { describe, expect, it } from 'vitest';
import { MatureEcosystemModel } from '../src/science/biology/ecosystem';
import type { BiosphereEvolutionState } from '../src/science/biology/biosphere';
import type { ChemicalEvolutionState } from '../src/science/chemistry/model';
import type { SurfaceEvolutionState } from '../src/science/surface/model';

const biosphere = {
  active: true,
  stage: 'multicellular-ecosystem',
  biosphereAgeYears: 2.8e9,
  guilds: { fermentation: 0.72, methanogenesis: 0.28, anoxygenicPhototrophy: 0.34, sulfurMetabolism: 0.52, nitrogenCycling: 0.76, oxygenicPhotosynthesis: 0.78, aerobicRespiration: 0.68 },
  horizontalExchange: { transferRate: 0.58, networkConnectivity: 0.62, ecologicalContact: 0.7, innovationIndex: 0.57 },
  feedback: { primaryProductivity: 0.72, oxygenProduction: 0.68, oxygenSinkCapacity: 0.34, oxygenFraction: 0.18, oxygenOasisIndex: 0.74, methaneIndex: 0.22, co2DrawdownIndex: 0.6, ozoneIndex: 0.68 },
  eukaryogenesis: { archaealHostComplexity: 0.7, syntrophyIndex: 0.62, endosymbiosisPotential: 0.66, mitochondrialIntegration: 0.64, cellularComplexity: 0.7, established: true },
  multicellularity: { adhesion: 0.7, clonalDevelopment: 0.72, differentiation: 0.62, clusterSize: 0.66, groupSelection: 0.58, established: true },
  ecosystem: { biomassIndex: 0.72, biodiversityIndex: 0.68, producerIndex: 0.7, consumerIndex: 0.54, decomposerIndex: 0.66, trophicComplexity: 0.58, extinctionPressure: 0.16, resilienceIndex: 0.62 },
} satisfies BiosphereEvolutionState;

const chemistry = {
  active: true, environment: 'aqueous-mineral-pore',
  routeScores: { hydrothermalInterface: 0.28, wetDryMineral: 0.22, aqueousMineralPore: 0.42, iceBrine: 0.08 },
  temperatureK: 292, pressureBar: 1.2, pHProxy: 7.3, ionicStrengthProxy: 0.6, mineralCatalysisIndex: 0.72,
  chemistryAgeYears: 3e9, suitability: 0.84,
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

describe('Phase 10 mature ecosystem', () => {
  it('requires an active parent biosphere', () => {
    const off = { ...biosphere, active: false };
    expect(new MatureEcosystemModel('p10-off').stateAt(off, chemistry, surface).active).toBe(false);
  });

  it('keeps C/N/P cycling and nutrient support bounded', () => {
    const state = new MatureEcosystemModel('p10-cycles').stateAt(biosphere, chemistry, surface);
    const bounded = [state.cycles.carbonAvailability, state.cycles.nitrogenAvailability, state.cycles.phosphorusAvailability, state.cycles.recyclingEfficiency, state.cycles.nutrientSupport];
    for (const value of bounded) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of bounded) expect(value).toBeLessThanOrEqual(1);
    expect(['nitrogen', 'phosphorus', 'co-limited']).toContain(state.cycles.limitingNutrient);
  });

  it('uses a bounded, environment-sensitive trophic transfer efficiency', () => {
    const model = new MatureEcosystemModel('p10-trophic');
    const temperate = model.stateAt(biosphere, chemistry, surface);
    const hot = model.stateAt(biosphere, chemistry, { ...surface, surfaceTemperatureK: 380 });
    expect(temperate.foodWeb.trophicTransferEfficiency).toBeGreaterThanOrEqual(0.03);
    expect(temperate.foodWeb.trophicTransferEfficiency).toBeLessThanOrEqual(0.22);
    expect(hot.foodWeb.trophicTransferEfficiency).toBeLessThanOrEqual(temperate.foodWeb.trophicTransferEfficiency);
    expect(temperate.foodWeb.trophicLevels).toBeGreaterThanOrEqual(1);
    expect(temperate.foodWeb.trophicLevels).toBeLessThanOrEqual(4);
  });

  it('models repeated multicellular lineage trials rather than one predetermined clade', () => {
    const state = new MatureEcosystemModel('p10-lineages').stateAt(biosphere, chemistry, surface);
    expect(state.lineages).toHaveLength(6);
    expect(new Set(state.lineages.map(lineage => lineage.pathway)).size).toBeGreaterThan(1);
    for (const lineage of state.lineages) {
      expect(lineage.originScore).toBeGreaterThanOrEqual(0);
      expect(lineage.originScore).toBeLessThanOrEqual(1);
      if (lineage.established) expect(lineage.groupIntegrity).toBeGreaterThan(0.12);
    }
  });

  it('keeps disturbance and recovery state bounded', () => {
    const state = new MatureEcosystemModel('p10-recovery').stateAt(biosphere, chemistry, surface);
    for (const value of [state.turnover.pulseIntensity, state.turnover.biodiversityReduction, state.turnover.trophicCascadeRisk, state.turnover.recoveryProgress, state.turnover.successionIndex]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed and inherited state', () => {
    const a = new MatureEcosystemModel('p10-repeat').stateAt(biosphere, chemistry, surface);
    const b = new MatureEcosystemModel('p10-repeat').stateAt(biosphere, chemistry, surface);
    expect(a).toEqual(b);
  });
});
