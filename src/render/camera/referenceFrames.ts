export type ScaleDomain =
  | 'cosmic'
  | 'galactic'
  | 'stellar'
  | 'planetary'
  | 'surface'
  | 'microscopic';

export type Vec3Tuple = readonly [number, number, number];

export interface FramePose {
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export interface ReferenceFrameDefinition {
  id: ScaleDomain;
  label: string;
  parent: ScaleDomain | null;
  unitLabel: string;
  metersPerUnit: number;
  rebaseThreshold: number;
  near: number;
  far: number;
  home: FramePose;
  entry: FramePose;
  exit: FramePose;
}

const METERS_PER_MICROMETER = 1e-6;
const METERS_PER_KILOMETER = 1e3;
const METERS_PER_AU = 149_597_870_700;
const METERS_PER_KPC = 3.085677581491367e19;
const METERS_PER_MPC = 3.085677581491367e22;

export const SCALE_ORDER: readonly ScaleDomain[] = [
  'cosmic',
  'galactic',
  'stellar',
  'planetary',
  'surface',
  'microscopic',
] as const;

export const REFERENCE_FRAMES: Readonly<Record<ScaleDomain, ReferenceFrameDefinition>> = {
  cosmic: {
    id: 'cosmic',
    label: 'Cosmic web',
    parent: null,
    unitLabel: 'Mpc',
    metersPerUnit: METERS_PER_MPC,
    rebaseThreshold: 2_000,
    near: 0.05,
    far: 10_000,
    home: { position: [0, 0, 46], target: [0, 0, 0] },
    entry: { position: [0, 0, 24], target: [0, 0, 0] },
    exit: { position: [0, 0, 6], target: [0, 0, 0] },
  },
  galactic: {
    id: 'galactic',
    label: 'Galaxy',
    parent: 'cosmic',
    unitLabel: 'kpc',
    metersPerUnit: METERS_PER_KPC,
    rebaseThreshold: 4_000,
    near: 0.02,
    far: 20_000,
    home: { position: [0, 7, 30], target: [0, 0, 0] },
    entry: { position: [0, 12, 50], target: [0, 0, 0] },
    exit: { position: [0, 2.5, 7], target: [0, 0, 0] },
  },
  stellar: {
    id: 'stellar',
    label: 'Star-forming system',
    parent: 'galactic',
    unitLabel: 'AU',
    metersPerUnit: METERS_PER_AU,
    rebaseThreshold: 2_000,
    near: 0.005,
    far: 8_000,
    home: { position: [0, 4, 18], target: [0, 0, 0] },
    entry: { position: [0, 9, 34], target: [0, 0, 0] },
    exit: { position: [0, 1.4, 5], target: [0, 0, 0] },
  },
  planetary: {
    id: 'planetary',
    label: 'Planetary system',
    parent: 'stellar',
    unitLabel: '0.1 AU',
    metersPerUnit: METERS_PER_AU / 10,
    rebaseThreshold: 12_000,
    near: 0.01,
    far: 40_000,
    home: { position: [0, 65, 220], target: [0, 0, 0] },
    entry: { position: [0, 130, 430], target: [0, 0, 0] },
    exit: { position: [0, 8, 28], target: [0, 0, 0] },
  },
  surface: {
    id: 'surface',
    label: 'Generated planet',
    parent: 'planetary',
    unitLabel: 'km',
    metersPerUnit: METERS_PER_KILOMETER,
    rebaseThreshold: 2_000_000,
    near: 1,
    far: 2_000_000,
    home: { position: [0, 14_000, 70_000], target: [0, 0, 0] },
    entry: { position: [0, 35_000, 155_000], target: [0, 0, 0] },
    exit: { position: [0, 8_000, 36_000], target: [0, 0, 0] },
  },
  microscopic: {
    id: 'microscopic',
    label: 'Microscopic chemistry',
    parent: 'surface',
    unitLabel: 'µm',
    metersPerUnit: METERS_PER_MICROMETER,
    rebaseThreshold: 2_000,
    near: 0.0005,
    far: 5_000,
    home: { position: [0, 2, 10], target: [0, 0, 0] },
    entry: { position: [0, 5, 22], target: [0, 0, 0] },
    exit: { position: [0, 1.2, 5], target: [0, 0, 0] },
  },
};

export function getReferenceFrame(domain: ScaleDomain): ReferenceFrameDefinition {
  return REFERENCE_FRAMES[domain];
}

export function scaleIndex(domain: ScaleDomain): number {
  return SCALE_ORDER.indexOf(domain);
}

export function adjacentScale(domain: ScaleDomain, direction: -1 | 1): ScaleDomain | null {
  const next = scaleIndex(domain) + direction;
  return SCALE_ORDER[next] ?? null;
}

export function metersPerLocalUnit(domain: ScaleDomain): number {
  return getReferenceFrame(domain).metersPerUnit;
}

export function physicalScaleRatio(from: ScaleDomain, to: ScaleDomain): number {
  return metersPerLocalUnit(from) / metersPerLocalUnit(to);
}
