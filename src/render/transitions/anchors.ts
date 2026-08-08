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
    continuity: 'The selected cosmic-web peak is the parent halo of the generated galaxy.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'galactic',
    to: 'stellar',
    label: 'star-forming region → selected stellar system',
    continuity: 'The camera enters the parent galaxy and resolves one actual member of its representative stellar population.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'stellar',
    to: 'planetary',
    label: 'selected star → inherited protoplanetary disk',
    continuity: 'The same Phase-4 star remains central while its inherited gas, dust, snow line, embryos and planets resolve around it.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'planetary',
    to: 'surface',
    label: 'selected generated world → physical kilometer globe',
    continuity: 'The outgoing planetary system recenters on the exact selected Phase-5 body before its inherited radius, interior, atmosphere, water and climate resolve in Phase 6.',
    parentAnchor: [0, 0, 0],
    childAnchor: [0, 0, 0],
  },
  {
    from: 'surface',
    to: 'microscopic',
    label: 'generated geochemistry → chemical networks → conditional Darwinian life',
    continuity: 'Phase 7 inherits the Phase-6 world and resolves prebiotic chemistry. Phase 8 stays in the same physical microscopic environment and overlays biological populations only if heritable imperfect replication and differential reproductive success clear the explicit Darwinian gate.',
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
