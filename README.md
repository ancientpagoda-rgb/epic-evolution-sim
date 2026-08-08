# Epic Evolution Simulator V3 — development branch

V3 rebuilds the simulator as a typed, GPU-accelerated 3D scientific continuum while keeping the deployed V2 protected on `main` and `v2-stable`.

## Completed development phases

### Phase 1 — GPU foundation

- Vite + TypeScript
- Three.js `WebGPURenderer` with automatic WebGL2 fallback
- deterministic named random streams
- fixed-step simulation clock
- exact 3840×2160 Ultra 4K framebuffer target
- V3 CI with typecheck, tests, and production build

### Phase 2 — multi-scale continuum

- hierarchical local frames from Mpc to micrometers
- floating-origin precision infrastructure
- guided scale transitions that begin from the user's actual camera pose
- deterministic parent/child continuity anchors

### Phase 3 — early universe + cosmic structure

- reduced flat ΛCDM background expansion
- recombination/CMB state around the ~380 kyr observational anchor
- deterministic Gaussian primordial perturbations
- Zel’dovich first-order structure growth
- distinct dark-matter and baryonic visualization layers
- cosmic-time scrubber and live redshift/CMB/ionization/growth readouts

### Phase 4 — halo → galaxy → stars

- the guided galaxy is derived from the densest resolved Phase-3 density peak
- the cosmic structure view is recentered on that selected halo for the actual scale handoff
- halo mass assembly, spin, baryon retention, gas reservoir, and empirical star-formation-efficiency proxy
- molecular-gas/star-formation visualization tied to model state
- Kroupa-like broken-power-law representative stellar population
- mass-dependent stellar lifetimes, luminosities, radii, temperatures, and remnant states
- separate AGB, core-collapse, Type Ia, and rare r-process enrichment contribution indices
- the selected stellar-system anchor is one deterministic member of that same population
- Phase-4 inspector for halo mass, stellar mass, SFR, gas metallicity, selected star, stellar stage, and enrichment channels

### Phase 5 — selected star → planetary system

- the selected Phase-4 star now owns a deterministic protoplanetary disk
- the disk's heavy-element inventory is frozen from the parent galaxy's metallicity at the star's birth epoch
- seeded disk mass, dust-to-gas ratio, radial scale, outer radius, gas lifetime and dust retention
- stellar-irradiation + reduced viscous-heating disk temperature profile
- a moving water snow line solved near the ~170 K condensation threshold
- radial embryo seeds fed by the inherited solid budget, with extra condensable material outside the snow line
- reduced core growth and time-limited nebular gas capture
- rocky, water-rich, ice-rich, ice-giant and gas-giant outcome classes
- mutual-Hill crowding mergers followed by a short deterministic Newtonian gravitational relaxation to screen immediate instability/ejection
- a deterministic surviving low-gas world selected as the continuity anchor for the later surface phase
- planetary-frame orbital distances use a physical `0.1 AU` local unit; only planet marker radii are exaggerated for visibility
- live Phase-5 inspector for disk state/mass, snow line, birth metallicity, worlds, selected planet, planet mass, mergers, ejections and remaining gas
- regression tests for deterministic inheritance, snow-line cooling/migration, disk dispersal, mature bound architecture, mass budget and physical reference scale

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

The seven epochs are not separate games or slides. V3 uses hierarchical spatial reference frames and transition anchors so the selected halo comes from the cosmic density field, its galaxy inherits that halo, the selected star belongs to that galaxy, and the Phase-5 planetary system inherits that exact star and its birth environment. Later surface, chemical, biological and cultural systems will continue that same causal history.

## Scientific scope

V3 distinguishes observational anchors from reduced physics and phenomenological models. The browser simulation is not a replacement for Boltzmann/recombination codes, cosmological N-body + hydrodynamics, detailed stellar-structure codes, radiative-transfer disk calculations, planetesimal hydrodynamics or long-term planetary integrations. Approximate subsystems are documented in `docs/V3_PHASE3.md`, `docs/V3_PHASE4.md` and `docs/V3_PHASE5.md` rather than being presented as precision calculations.
