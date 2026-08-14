export type RandomStream = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, maxInclusive: number) => number;
  fork: (label: string) => RandomStream;
};

function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomStream(seed: string, namespace = 'root'): RandomStream {
  const next = mulberry32(hash32(`${seed}:${namespace}`));
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, maxInclusive) => Math.floor(min + next() * (maxInclusive - min + 1)),
    fork: label => createRandomStream(seed, `${namespace}/${label}`),
  };
}
