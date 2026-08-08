import { createRandomStream, type RandomStream } from '../../core/random';
import { SI } from '../cosmology/constants';
import { FlatLambdaCDMModel } from '../cosmology/model';
import type { CosmologyState } from '../cosmology/model';
import type { GalaxyFormationModel, GalaxyState } from '../galaxies/model';
import {
  mainSequenceLuminositySolar,
  type RepresentativeStar,
  type StellarSnapshot,
} from '../stars/model';

const EARTH_MASS_PER_SOLAR_MASS = 332_946;
const EARTH_MASS_IN_SOLAR = 1 / EARTH_MASS_PER_SOLAR_MASS;
const G_AU3_PER_SOLAR_MASS_YEAR2 = 4 * Math.PI * Math.PI;
const WATER_SNOW_TEMPERATURE_K = 170;
const LOCAL_UNITS_PER_AU = 10; // planetary frame uses 0.1 AU per local unit

export type PlanetComposition = 'rocky' | 'water-rich' | 'ice-rich' | 'ice-giant' | 'gas-giant';
export type PlanetStatus = 'embryo' | 'planet' | 'ejected';

export interface DiskState {
  active: boolean;
  ageYears: number;
  initialMassSolar: number;
  gasMassSolar: number;
  initialDustMassEarth: number;
  dustMassEarth: number;
  dustToGasRatio: number;
  gasFractionRemaining: number;
  characteristicRadiusAu: number;
  outerRadiusAu: number;
  temperatureAt1AuK: number;
  snowLineAu: number;
  lifetimeYears: number;
  stellarLuminositySolar: number;
  birthMetallicitySolar: number;
}

export interface PlanetBodyState {
  id: number;
  massEarth: number;
  coreMassEarth: number;
  radiusEarth: number;
  semimajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  meanLongitudeRadians: number;
  composition: PlanetComposition;
  gasEnvelopeFraction: number;
  iceFraction: number;
  formationProgress: number;
  status: PlanetStatus;
}

export interface PlanetarySystemState {
  starAgeYears: number;
  disk: DiskState;
  bodies: readonly PlanetBodyState[];
  selectedPlanet: PlanetBodyState | null;
  selectedPlanetId: number | null;
  totalBoundPlanetMassEarth: number;
  collisionCount: number;
  ejectionCount: number;
  mature: boolean;
}

interface EmbryoSeed {
  id: number;
  initialSemimajorAxisAu: number;
  finalSemimajorAxisAu: number;
  finalEccentricity: number;
  inclinationDeg: number;
  phaseRadians: number;
  coreTargetEarth: number;
  gasTargetEarth: number;
  iceFraction: number;
  composition: PlanetComposition;
  growthTimescaleYears: number;
  ejected: boolean;
}

interface CandidateBody {
  id: number;
  a: number;
  massEarth: number;
  phase: number;
  iceFraction: number;
  inclinationDeg: number;
  composition: PlanetComposition;
  coreTargetEarth: number;
  gasTargetEarth: number;
}

interface RelaxedBody extends CandidateBody {
  finalA: number;
  finalE: number;
  ejected: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian(rng: RandomStream): number {
  const u1 = Math.max(Number.EPSILON, rng.next());
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function radiusEarthFor(massEarth: number, composition: PlanetComposition, gasEnvelopeFraction: number): number {
  const mass = Math.max(0.01, massEarth);
  if (composition === 'gas-giant') return clamp(7.5 + Math.log10(1 + mass) * 1.8, 7.5, 13.5);
  if (composition === 'ice-giant') return clamp(2.6 * mass ** 0.12, 2.4, 6.5);
  const rockyRadius = mass ** 0.27;
  const volatileBoost = composition === 'water-rich' ? 1.1 : composition === 'ice-rich' ? 1.18 : 1;
  return clamp(rockyRadius * volatileBoost * (1 + 0.22 * gasEnvelopeFraction), 0.18, 4.2);
}

function compositionFrom(coreMassEarth: number, gasTargetEarth: number, iceFraction: number): PlanetComposition {
  const finalMass = coreMassEarth + gasTargetEarth;
  const gasFraction = gasTargetEarth / Math.max(1e-9, finalMass);
  if (gasFraction > 0.55 && finalMass > 25) return 'gas-giant';
  if (gasFraction > 0.12 && finalMass > 8) return 'ice-giant';
  if (iceFraction > 0.55) return 'ice-rich';
  if (iceFraction > 0.18) return 'water-rich';
  return 'rocky';
}

function mutualHillRadiusAu(a1: number, a2: number, massEarth1: number, massEarth2: number, starMassSolar: number): number {
  const meanA = (a1 + a2) * 0.5;
  const planetMassSolar = (massEarth1 + massEarth2) * EARTH_MASS_IN_SOLAR;
  return meanA * (planetMassSolar / (3 * starMassSolar)) ** (1 / 3);
}

function mergeCloseCandidates(candidates: CandidateBody[], starMassSolar: number): { bodies: CandidateBody[]; collisions: number } {
  const working = [...candidates].sort((a, b) => a.a - b.a);
  let collisions = 0;
  let changed = true;
  while (changed && working.length > 1) {
    changed = false;
    for (let i = 0; i < working.length - 1; i += 1) {
      const left = working[i]!;
      const right = working[i + 1]!;
      const hill = mutualHillRadiusAu(left.a, right.a, left.massEarth, right.massEarth, starMassSolar);
      const spacingHill = (right.a - left.a) / Math.max(1e-6, hill);
      if (spacingHill >= 5.5) continue;

      const totalMass = left.massEarth + right.massEarth;
      const leftWeight = left.massEarth / totalMass;
      const rightWeight = right.massEarth / totalMass;
      const coreTargetEarth = left.coreTargetEarth + right.coreTargetEarth;
      const gasTargetEarth = left.gasTargetEarth + right.gasTargetEarth;
      const iceFraction = left.iceFraction * leftWeight + right.iceFraction * rightWeight;
      const merged: CandidateBody = {
        id: Math.min(left.id, right.id),
        a: left.a * leftWeight + right.a * rightWeight,
        massEarth: totalMass,
        phase: left.phase * leftWeight + right.phase * rightWeight,
        iceFraction,
        inclinationDeg: left.inclinationDeg * leftWeight + right.inclinationDeg * rightWeight,
        composition: compositionFrom(coreTargetEarth, gasTargetEarth, iceFraction),
        coreTargetEarth,
        gasTargetEarth,
      };
      working.splice(i, 2, merged);
      collisions += 1;
      changed = true;
      break;
    }
  }
  return { bodies: working, collisions };
}

function relaxWithShortNBody(bodies: CandidateBody[], starMassSolar: number): { bodies: RelaxedBody[]; ejections: number } {
  // A short symplectic-like gravitational relaxation in AU / solar-mass / year
  // units. It tests the generated mature architecture for immediate strong
  // interactions; it does NOT replace Myr-scale formation or stability studies.
  const count = bodies.length;
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const massesSolar = new Float64Array(count);
  const active = new Uint8Array(count);
  active.fill(1);

  let minimumPeriodYears = Infinity;
  for (let i = 0; i < count; i += 1) {
    const body = bodies[i]!;
    x[i] = Math.cos(body.phase) * body.a;
    y[i] = Math.sin(body.phase) * body.a;
    const speed = Math.sqrt(G_AU3_PER_SOLAR_MASS_YEAR2 * starMassSolar / body.a);
    vx[i] = -Math.sin(body.phase) * speed;
    vy[i] = Math.cos(body.phase) * speed;
    massesSolar[i] = body.massEarth * EARTH_MASS_IN_SOLAR;
    minimumPeriodYears = Math.min(minimumPeriodYears, Math.sqrt(body.a ** 3 / starMassSolar));
  }

  const dt = clamp(minimumPeriodYears / 90, 0.0008, 0.018);
  const steps = 3600;
  const ax = new Float64Array(count);
  const ay = new Float64Array(count);

  const computeAcceleration = (): void => {
    ax.fill(0);
    ay.fill(0);
    for (let i = 0; i < count; i += 1) {
      if (!active[i]) continue;
      const r2 = x[i]! * x[i]! + y[i]! * y[i]! + 1e-10;
      const invR3 = 1 / (r2 * Math.sqrt(r2));
      ax[i] = -G_AU3_PER_SOLAR_MASS_YEAR2 * starMassSolar * x[i]! * invR3;
      ay[i] = -G_AU3_PER_SOLAR_MASS_YEAR2 * starMassSolar * y[i]! * invR3;
    }
    for (let i = 0; i < count; i += 1) {
      if (!active[i]) continue;
      for (let j = i + 1; j < count; j += 1) {
        if (!active[j]) continue;
        const dx = x[j]! - x[i]!;
        const dy = y[j]! - y[i]!;
        const r2 = dx * dx + dy * dy + 1e-8;
        const invR3 = 1 / (r2 * Math.sqrt(r2));
        const scale = G_AU3_PER_SOLAR_MASS_YEAR2 * invR3;
        ax[i] += scale * massesSolar[j]! * dx;
        ay[i] += scale * massesSolar[j]! * dy;
        ax[j] -= scale * massesSolar[i]! * dx;
        ay[j] -= scale * massesSolar[i]! * dy;
      }
    }
  };

  computeAcceleration();
  for (let step = 0; step < steps; step += 1) {
    for (let i = 0; i < count; i += 1) {
      if (!active[i]) continue;
      vx[i] += ax[i]! * dt * 0.5;
      vy[i] += ay[i]! * dt * 0.5;
      x[i] += vx[i]! * dt;
      y[i] += vy[i]! * dt;
    }
    computeAcceleration();
    for (let i = 0; i < count; i += 1) {
      if (!active[i]) continue;
      vx[i] += ax[i]! * dt * 0.5;
      vy[i] += ay[i]! * dt * 0.5;
      const radius = Math.hypot(x[i]!, y[i]!);
      if (radius > 120 || radius < 0.025 || !Number.isFinite(radius)) active[i] = 0;
    }
  }

  let ejections = 0;
  const relaxed: RelaxedBody[] = [];
  for (let i = 0; i < count; i += 1) {
    const body = bodies[i]!;
    if (!active[i]) {
      ejections += 1;
      relaxed.push({ ...body, finalA: body.a, finalE: 1, ejected: true });
      continue;
    }
    const r = Math.hypot(x[i]!, y[i]!);
    const v2 = vx[i]! * vx[i]! + vy[i]! * vy[i]!;
    const mu = G_AU3_PER_SOLAR_MASS_YEAR2 * (starMassSolar + massesSolar[i]!);
    const energy = v2 / 2 - mu / r;
    if (energy >= 0) {
      ejections += 1;
      relaxed.push({ ...body, finalA: body.a, finalE: 1, ejected: true });
      continue;
    }
    const finalA = -mu / (2 * energy);
    const angularMomentum = x[i]! * vy[i]! - y[i]! * vx[i]!;
    const eccentricitySquared = clamp(1 + (2 * energy * angularMomentum * angularMomentum) / (mu * mu), 0, 4);
    const finalE = Math.sqrt(eccentricitySquared);
    const ejected = !Number.isFinite(finalA) || finalA > 100 || finalE >= 1;
    if (ejected) ejections += 1;
    relaxed.push({
      ...body,
      finalA: ejected ? body.a : clamp(finalA, 0.03, 100),
      finalE: ejected ? 1 : clamp(finalE, 0, 0.95),
      ejected,
    });
  }
  return { bodies: relaxed, ejections };
}

export class PlanetFormationModel {
  readonly birthMetallicitySolar: number;
  readonly initialDiskMassSolar: number;
  readonly initialDustToGasRatio: number;
  readonly diskLifetimeYears: number;
  readonly characteristicRadiusAu: number;
  readonly outerRadiusAu: number;
  readonly selectedPlanetId: number | null;
  private readonly embryos: readonly EmbryoSeed[];
  private readonly collisionCountValue: number;
  private readonly ejectionCountValue: number;
  private readonly starMassSolar: number;
  private readonly baselineLuminositySolar: number;

  constructor(
    seed: string,
    readonly star: RepresentativeStar,
    galaxyModel: GalaxyFormationModel,
  ) {
    this.starMassSolar = star.massSolar;
    this.baselineLuminositySolar = mainSequenceLuminositySolar(star.massSolar);

    const birthCosmology = new FlatLambdaCDMModel().stateAtAge(star.birthAgeYears * SI.secondsPerJulianYear);
    const birthGalaxy = galaxyModel.stateAtCosmology(birthCosmology);
    this.birthMetallicitySolar = clamp(birthGalaxy.metallicitySolar, 0.03, 2.5);

    const diskRng = createRandomStream(seed, 'phase5/protoplanetary-disk');
    const diskFraction = clamp(Math.exp(Math.log(0.055) + gaussian(diskRng) * 0.38), 0.018, 0.16);
    this.initialDiskMassSolar = diskFraction * this.starMassSolar;
    this.initialDustToGasRatio = clamp(0.01 * this.birthMetallicitySolar, 0.0015, 0.03);
    this.diskLifetimeYears = diskRng.range(2.5e6, 8.5e6);
    this.characteristicRadiusAu = diskRng.range(18, 46) * this.starMassSolar ** 0.25;
    this.outerRadiusAu = clamp(this.characteristicRadiusAu * diskRng.range(1.7, 2.5), 30, 120);

    const referenceSnowLine = this.snowLineAuAtAge(1e6);
    const initialDustMassEarth = this.initialDiskMassSolar * EARTH_MASS_PER_SOLAR_MASS * this.initialDustToGasRatio;
    const candidateRng = createRandomStream(seed, 'phase5/embryos');
    const rawCandidates: CandidateBody[] = [];
    const candidateCount = 12;
    const radialMin = 0.18;
    const radialMax = Math.min(42, this.outerRadiusAu * 0.72);
    const logSpan = Math.log(radialMax / radialMin);
    const radialWeights: number[] = [];

    for (let i = 0; i < candidateCount; i += 1) {
      const fraction = (i + 0.5) / candidateCount;
      const jittered = clamp(fraction + candidateRng.range(-0.035, 0.035), 0.015, 0.985);
      const a = radialMin * Math.exp(logSpan * jittered);
      const iceFraction = a > referenceSnowLine
        ? clamp(0.55 + candidateRng.range(-0.12, 0.22), 0.35, 0.9)
        : clamp(candidateRng.range(0.005, 0.12), 0, 0.18);
      const localWeight = Math.sqrt(a) * Math.exp(-a / this.characteristicRadiusAu) * (1 + iceFraction * 1.7);
      radialWeights.push(localWeight);
      rawCandidates.push({
        id: i,
        a,
        massEarth: 0,
        phase: candidateRng.range(0, Math.PI * 2),
        iceFraction,
        inclinationDeg: Math.abs(gaussian(candidateRng)) * 0.9,
        composition: 'rocky',
        coreTargetEarth: 0,
        gasTargetEarth: 0,
      });
    }

    const totalWeight = radialWeights.reduce((sum, value) => sum + value, 0) || 1;
    const coreBudgetEarth = initialDustMassEarth * 0.63;
    let gasBudgetEarth = this.initialDiskMassSolar * EARTH_MASS_PER_SOLAR_MASS * 0.12;
    for (let i = 0; i < rawCandidates.length; i += 1) {
      const candidate = rawCandidates[i]!;
      const weight = radialWeights[i] ?? 0;
      const coreTarget = clamp(coreBudgetEarth * weight / totalWeight, 0.04, 34);
      const gasEligible = candidate.a > referenceSnowLine * 0.75 && coreTarget > 4.5;
      let gasTarget = 0;
      if (gasEligible) {
        const runaway = smoothstep(5, 12, coreTarget) * candidateRng.range(0.25, 1);
        const desired = clamp(coreTarget * candidateRng.range(1.5, 20) * runaway, 0, 320);
        gasTarget = Math.min(desired, gasBudgetEarth);
        gasBudgetEarth -= gasTarget;
      }
      candidate.coreTargetEarth = coreTarget;
      candidate.gasTargetEarth = gasTarget;
      candidate.massEarth = coreTarget + gasTarget;
      candidate.composition = compositionFrom(coreTarget, gasTarget, candidate.iceFraction);
    }

    const merged = mergeCloseCandidates(rawCandidates, this.starMassSolar);
    const relaxed = relaxWithShortNBody(merged.bodies, this.starMassSolar);
    this.collisionCountValue = merged.collisions;
    this.ejectionCountValue = relaxed.ejections;

    this.embryos = relaxed.bodies.map(body => {
      const growthTimescaleYears = clamp(
        2.5e5 * body.a ** 1.45 / Math.max(0.15, this.birthMetallicitySolar) * (1 + 0.18 * body.coreTargetEarth),
        1.2e5,
        8e7,
      );
      return {
        id: body.id,
        initialSemimajorAxisAu: body.a,
        finalSemimajorAxisAu: body.finalA,
        finalEccentricity: body.finalE,
        inclinationDeg: body.inclinationDeg,
        phaseRadians: body.phase,
        coreTargetEarth: body.coreTargetEarth,
        gasTargetEarth: body.gasTargetEarth,
        iceFraction: body.iceFraction,
        composition: body.composition,
        growthTimescaleYears,
        ejected: body.ejected,
      };
    });

    this.selectedPlanetId = this.chooseSelectedPlanetId();
  }

  stateAt(
    cosmology: CosmologyState,
    starSnapshot: StellarSnapshot,
    galaxyState: GalaxyState,
  ): PlanetarySystemState {
    const cosmicAgeYears = cosmology.ageSeconds / SI.secondsPerJulianYear;
    const starBorn = starSnapshot.stage !== 'unborn' && cosmicAgeYears >= this.star.birthAgeYears;
    const starAgeYears = starBorn ? Math.max(0, cosmicAgeYears - this.star.birthAgeYears) : 0;
    const disk = this.diskStateAtAge(starAgeYears, starBorn);
    const architectureBlend = smoothstep(this.diskLifetimeYears * 0.8, Math.max(1e8, this.diskLifetimeYears * 12), starAgeYears);

    const bodies: PlanetBodyState[] = this.embryos.map(embryo => {
      if (!starBorn) {
        return {
          id: embryo.id,
          massEarth: 0,
          coreMassEarth: 0,
          radiusEarth: 0,
          semimajorAxisAu: embryo.initialSemimajorAxisAu,
          eccentricity: 0,
          inclinationDeg: embryo.inclinationDeg,
          meanLongitudeRadians: embryo.phaseRadians,
          composition: embryo.composition,
          gasEnvelopeFraction: 0,
          iceFraction: embryo.iceFraction,
          formationProgress: 0,
          status: 'embryo',
        };
      }

      const coreProgress = 1 - Math.exp(-starAgeYears / embryo.growthTimescaleYears);
      const coreMassEarth = embryo.coreTargetEarth * clamp(coreProgress, 0, 1);
      const gasStartYears = embryo.growthTimescaleYears * 0.55;
      const gasProgress = embryo.gasTargetEarth > 0
        ? smoothstep(gasStartYears, this.diskLifetimeYears, Math.min(starAgeYears, this.diskLifetimeYears))
        : 0;
      const gasMassEarth = embryo.gasTargetEarth * gasProgress;
      const massEarth = coreMassEarth + gasMassEarth;
      const gasEnvelopeFraction = gasMassEarth / Math.max(1e-9, massEarth);
      const semimajorAxisAu = mix(embryo.initialSemimajorAxisAu, embryo.finalSemimajorAxisAu, architectureBlend);
      const eccentricity = embryo.ejected && architectureBlend > 0.8
        ? 1
        : embryo.finalEccentricity * architectureBlend;
      const periodYears = Math.sqrt(Math.max(1e-6, semimajorAxisAu ** 3 / this.starMassSolar));
      const orbitalTurns = periodYears > 0 ? (starAgeYears % periodYears) / periodYears : 0;
      const meanLongitudeRadians = (embryo.phaseRadians + orbitalTurns * Math.PI * 2) % (Math.PI * 2);
      const formationProgress = clamp((coreProgress + gasProgress) / (embryo.gasTargetEarth > 0 ? 2 : 1), 0, 1);
      const composition = compositionFrom(coreMassEarth, gasMassEarth, embryo.iceFraction);
      const ejected = embryo.ejected && architectureBlend > 0.8;
      return {
        id: embryo.id,
        massEarth,
        coreMassEarth,
        radiusEarth: radiusEarthFor(massEarth, composition, gasEnvelopeFraction),
        semimajorAxisAu,
        eccentricity,
        inclinationDeg: embryo.inclinationDeg,
        meanLongitudeRadians,
        composition,
        gasEnvelopeFraction,
        iceFraction: embryo.iceFraction,
        formationProgress,
        status: ejected ? 'ejected' : formationProgress < 0.86 ? 'embryo' : 'planet',
      };
    });

    const selectedPlanet = this.selectedPlanetId === null
      ? null
      : bodies.find(body => body.id === this.selectedPlanetId && body.status !== 'ejected') ?? null;
    const bound = bodies.filter(body => body.status !== 'ejected');
    const totalBoundPlanetMassEarth = bound.reduce((sum, body) => sum + body.massEarth, 0);
    void galaxyState; // birth metallicity is frozen from the parent galaxy at stellar birth.

    return {
      starAgeYears,
      disk,
      bodies,
      selectedPlanet,
      selectedPlanetId: this.selectedPlanetId,
      totalBoundPlanetMassEarth,
      collisionCount: this.collisionCountValue,
      ejectionCount: this.ejectionCountValue,
      mature: starAgeYears >= 1e8,
    };
  }

  diskStateAtAge(ageYears: number, starBorn = true): DiskState {
    const age = Math.max(0, ageYears);
    const tau = this.diskLifetimeYears / 2.7;
    const gasFractionRemaining = starBorn && age < this.diskLifetimeYears
      ? clamp(Math.exp(-age / tau), 0, 1)
      : 0;
    const initialDustMassEarth = this.initialDiskMassSolar * EARTH_MASS_PER_SOLAR_MASS * this.initialDustToGasRatio;
    const dustRetention = starBorn ? clamp(0.15 + 0.85 * Math.exp(-age / (this.diskLifetimeYears * 1.8)), 0.08, 1) : 0;
    const stellarLuminositySolar = this.youngStellarLuminositySolar(age);
    const temperatureAt1AuK = this.diskTemperatureK(1, age, stellarLuminositySolar);
    return {
      active: starBorn && age < this.diskLifetimeYears,
      ageYears: age,
      initialMassSolar: this.initialDiskMassSolar,
      gasMassSolar: this.initialDiskMassSolar * (1 - this.initialDustToGasRatio) * gasFractionRemaining,
      initialDustMassEarth,
      dustMassEarth: initialDustMassEarth * dustRetention,
      dustToGasRatio: this.initialDustToGasRatio,
      gasFractionRemaining,
      characteristicRadiusAu: this.characteristicRadiusAu,
      outerRadiusAu: this.outerRadiusAu,
      temperatureAt1AuK,
      snowLineAu: this.snowLineAuAtAge(age),
      lifetimeYears: this.diskLifetimeYears,
      stellarLuminositySolar,
      birthMetallicitySolar: this.birthMetallicitySolar,
    };
  }

  diskTemperatureK(radiusAu: number, ageYears: number, luminositySolar = this.youngStellarLuminositySolar(ageYears)): number {
    const r = Math.max(0.03, radiusAu);
    const irradiation = 280 * luminositySolar ** 0.25 * r ** -0.5;
    const viscous = 620
      * this.starMassSolar ** 0.2
      * Math.exp(-Math.max(0, ageYears) / 1.4e6) ** 0.25
      * r ** -0.75;
    return (irradiation ** 4 + viscous ** 4) ** 0.25;
  }

  snowLineAuAtAge(ageYears: number): number {
    let low = 0.04;
    let high = Math.min(80, this.outerRadiusAu || 80);
    for (let i = 0; i < 48; i += 1) {
      const mid = (low + high) * 0.5;
      if (this.diskTemperatureK(mid, ageYears) > WATER_SNOW_TEMPERATURE_K) low = mid;
      else high = mid;
    }
    return (low + high) * 0.5;
  }

  localUnitsFromAu(au: number): number {
    return au * LOCAL_UNITS_PER_AU;
  }

  private youngStellarLuminositySolar(ageYears: number): number {
    const preMainBoost = 1 + 1.8 * Math.exp(-Math.max(0, ageYears) / 2.2e6);
    return this.baselineLuminositySolar * preMainBoost;
  }

  private chooseSelectedPlanetId(): number | null {
    const habitableDistanceAu = Math.sqrt(Math.max(0.02, this.baselineLuminositySolar));
    let bestId: number | null = null;
    let bestScore = Infinity;
    for (const embryo of this.embryos) {
      if (embryo.ejected) continue;
      const finalMass = embryo.coreTargetEarth + embryo.gasTargetEarth;
      const finalGasFraction = embryo.gasTargetEarth / Math.max(1e-9, finalMass);
      if (finalMass < 0.18 || finalMass > 12 || finalGasFraction > 0.12) continue;
      const distanceScore = Math.abs(Math.log(embryo.finalSemimajorAxisAu / habitableDistanceAu));
      const massScore = Math.abs(Math.log(Math.max(0.1, finalMass))) * 0.22;
      const volatilePenalty = Math.max(0, embryo.iceFraction - 0.65) * 0.6;
      const score = distanceScore + massScore + volatilePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestId = embryo.id;
      }
    }
    if (bestId !== null) return bestId;
    return this.embryos.find(body => !body.ejected)?.id ?? null;
  }
}
