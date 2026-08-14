import { describe, expect, it } from 'vitest';
import {
  REFERENCE_FRAMES,
  SCALE_ORDER,
  adjacentScale,
  physicalScaleRatio,
} from '../src/render/camera/referenceFrames';
import { TRANSITION_ANCHORS, areAdjacentScales } from '../src/render/transitions/anchors';

describe('hierarchical scientific reference frames', () => {
  it('forms one ordered parent chain from cosmic to microscopic', () => {
    expect(REFERENCE_FRAMES.cosmic.parent).toBeNull();
    for (let i = 1; i < SCALE_ORDER.length; i += 1) {
      const child = SCALE_ORDER[i];
      const parent = SCALE_ORDER[i - 1];
      expect(child).toBeDefined();
      expect(REFERENCE_FRAMES[child!].parent).toBe(parent);
    }
  });

  it('decreases physical meters per local unit as the camera moves deeper', () => {
    for (let i = 1; i < SCALE_ORDER.length; i += 1) {
      const broader = SCALE_ORDER[i - 1];
      const deeper = SCALE_ORDER[i];
      expect(broader).toBeDefined();
      expect(deeper).toBeDefined();
      expect(physicalScaleRatio(broader!, deeper!)).toBeGreaterThan(1);
    }
  });

  it('has one continuity anchor for every adjacent scale handoff', () => {
    expect(TRANSITION_ANCHORS).toHaveLength(SCALE_ORDER.length - 1);
    for (let i = 1; i < SCALE_ORDER.length; i += 1) {
      const from = SCALE_ORDER[i - 1];
      const to = SCALE_ORDER[i];
      expect(from).toBeDefined();
      expect(to).toBeDefined();
      expect(areAdjacentScales(from!, to!)).toBe(true);
      expect(TRANSITION_ANCHORS.some(anchor => anchor.from === from && anchor.to === to)).toBe(true);
    }
  });

  it('does not step beyond the ends of the hierarchy', () => {
    expect(adjacentScale('cosmic', -1)).toBeNull();
    expect(adjacentScale('microscopic', 1)).toBeNull();
  });
});
