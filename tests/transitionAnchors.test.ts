import { describe, expect, it } from 'vitest';
import { SCALE_ORDER } from '../src/render/camera/referenceFrames';
import { getTransitionAnchor } from '../src/render/transitions/anchors';

describe('transition continuity anchors', () => {
  it('resolves every forward and reverse adjacent handoff', () => {
    for (let i = 1; i < SCALE_ORDER.length; i += 1) {
      const parent = SCALE_ORDER[i - 1];
      const child = SCALE_ORDER[i];
      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      const forward = getTransitionAnchor(parent!, child!);
      expect(forward.from).toBe(parent);
      expect(forward.to).toBe(child);

      const reverse = getTransitionAnchor(child!, parent!);
      expect(reverse.from).toBe(child);
      expect(reverse.to).toBe(parent);
    }
  });
});
