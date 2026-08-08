import { SCALE_ORDER, type ScaleDomain, type Vec3Tuple } from '../camera/referenceFrames';

export interface TransitionAnchor {
  from: ScaleDomain;
  to: ScaleDomain;
  label: string;
  continuity: string;
  parentAnchor: Vec3Tuple;
  childAnchor: Vec3Tuple;
}

export const TRANSITION_ANCHORS: readonly TransitionAnchor[] = [
  {
    from: 'cosmic',
    to: 'galactic',
    label: 'density peak → selected dark-matter halo',
    continuity: 'A luminous node in the cosmic web becomes the selected halo and galaxy.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'galactic',
    to: 'stellar',
    label: 'spiral-arm cloud → collapsing stellar core',
    continuity: 'The camera enters one gas-rich region belonging to the selected galaxy.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'stellar',
    to: 'planetary',
    label: 'young star → protoplanetary disk',
    continuity: 'The same forming star remains at the center while the disk resolves into bodies.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'planetary',
    to: 'surface',
    label: 'selected rocky world → atmosphere and surface',
    continuity: 'One generated planet becomes the parent frame for surface environments.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'surface',
    to: 'microscopic',
    label: 'wet mineral environment → chemical compartment',
    continuity: 'A selected local environment becomes the microscopic chemistry frame.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
] as const;

export function getTransitionAnchor(from: ScaleDomain, to: ScaleDomain): TransitionAnchor {
  const anchor = TRANSITION_ANCHORS.find(candidate => candidate.from === from && candidate.to === to);
  if (anchor) return anchor;

  const reverse = TRANSITION_ANCHORS.find(candidate => candidate.from === to && candidate.to === from);
  if (reverse) {
    return {
      from,
      to,
      label: reverse.label,
      continuity: reverse.continuity,
      parentAnchor: reverse.childAnchor,
      childAnchor: reverse.parentAnchor,
    };
  }

  throw new Error(`No transition anchor registered for ${from} → ${to}`);
}

export function areAdjacentScales(from: ScaleDomain, to: ScaleDomain): boolean {
  return Math.abs(SCALE_ORDER.indexOf(from) - SCALE_ORDER.indexOf(to)) === 1;
}
