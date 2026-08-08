# Epic Evolution Simulator V3 — development branch

V3 rebuilds the simulator as a typed, GPU-accelerated 3D scientific continuum while keeping the deployed V2 protected on `main` and `v2-stable`.

## Foundation milestone

This branch currently establishes:

- Vite + TypeScript
- Three.js `WebGPURenderer` with automatic WebGL2 fallback
- deterministic named random streams
- fixed-step simulation clock
- real high-DPI quality budgets, including an exact 3840×2160 Ultra 4K target
- simulation-worker scaffold
- a deterministic 3D continuum seed scene
- Vitest determinism regression test

## Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm test
npm run build
```

## Architecture rule

The seven epochs are not separate games or slides. V3 will use hierarchical spatial reference frames and transition anchors so the galaxy contains the selected star, the star contains the disk, the disk generates the planet, and later chemistry/biology/culture inherit state from that same causal history.
