export type EpochId =
  | 'particle'
  | 'galactic'
  | 'stellar'
  | 'planetary'
  | 'chemical'
  | 'biological'
  | 'cultural';

export interface UniverseState {
  seed: string;
  ageSeconds: number;
  epoch: EpochId;
  thermodynamics: {
    specificPowerWkg: number;
    freeEnergyGradient: number;
    entropyProductionIndex: number;
  };
}

export const INITIAL_UNIVERSE_STATE: UniverseState = {
  seed: 'chaisson-734221',
  ageSeconds: 1e-12,
  epoch: 'particle',
  thermodynamics: {
    specificPowerWkg: 0,
    freeEnergyGradient: 0,
    entropyProductionIndex: 0,
  },
};
