import { describe, expect, it } from 'vitest';
import { createRandomStream } from '../src/core/random';

function sample(seed: string, namespace: string): number[] {
  const rng = createRandomStream(seed, namespace);
  return Array.from({ length: 5 }, () => rng.next());
}

describe('deterministic random streams', () => {
  it('repeats exactly for the same seed and namespace', () => {
    expect(sample('chaisson-734221', 'galaxy')).toEqual(sample('chaisson-734221', 'galaxy'));
  });

  it('isolates named streams', () => {
    expect(sample('chaisson-734221', 'galaxy')).not.toEqual(sample('chaisson-734221', 'biology'));
  });
});
