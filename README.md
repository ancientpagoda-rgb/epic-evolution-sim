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

- selected galaxy derived from the densest resolved Phase-3 density peak
- halo mass assembly, spin, baryon retention, gas reservoir, and star-formation-efficiency proxy
- Kroupa-like representative stellar population
- mass-dependent stellar evolution/remnants and multiple enrichment channels
- selected stellar-system anchor is one deterministic member of that population
- live Phase-4 inspector and regressions

### Phase 5 — selected star → planetary system

- selected Phase-4 star owns a deterministic protoplanetary disk
- inherited birth metallicity, disk mass, dust/gas, temperature and moving snow line
- radial embryo growth, time-limited gas capture and planetary composition outcomes
- mutual-Hill crowding mergers plus short Newtonian gravitational relaxation
- deterministic surviving low-gas world becomes the continuity anchor
- physical `0.1 AU` planetary frame with visual-only planet-radius exaggeration
- live Phase-5 inspector and regressions

### Phase 6 — selected planet → active world

- exact selected Phase-5 planet becomes the surface-frame object
- planetary → surface transition recenters on that generated world
- physical `1 km` surface frame and generated model radius
- mass/radius-derived gravity and escape velocity
- reduced accretional, secular and radiogenic thermal history
- differentiation, convection, volcanism, dynamo potential and impact flux
- tectonic mobility regimes without assuming Earth-like plate tectonics
- outgassing × retention atmosphere and inherited water/ocean/ice state
- zero-dimensional stellar-flux/albedo/greenhouse climate
- state-driven high-resolution globe, inspector and regressions

### Phase 7 — generated environment → prebiotic chemical evolution

- microscopic chemistry inherits the exact Phase-6 world
- simultaneous hydrothermal, wet–dry mineral, aqueous mineral-pore and ice/brine route scores
- reduced C/N/P/S/Fe/amphiphile feedstock indices
- UV, geothermal, redox, wet–dry and impact energy-gradient proxies
- mineral-catalysis, ionic-strength and pH proxies
- deterministic reduced network for organics, precursor chemistry, amphiphiles, polymers, compartments and autocatalytic networks
- chemical-selection and protocell-like indices explicitly do **not** count as biological life
- physical `1 µm` frame with mineral, water, organic, polymer, energy and compartment rendering
- live Phase-7 inspector and regressions

### Phase 8 — prebiotic chemistry → Darwinian biological evolution

- biology inherits the exact Phase-7 chemical state and the same Phase-6 world
- explicit origin-readiness threshold makes biological emergence contingent rather than scheduled
- complex chemistry, polymers, autocatalysis and compartments can remain permanently `pre-darwinian`
- life activates only after sufficient template replication, compartment inheritance, heredity and differential reproductive success
- deterministic population of abstract replicator variants with replication efficiency, catalytic coupling and copying fidelity
- imperfect copying is mandatory; mutation rate remains nonzero
- reduced replicator–mutator population dynamics update variant frequencies under selection
- parasite-like fast replicators compete with catalytically useful variants
- resource uptake, redox coupling, energy capture and growth coupling provide a metabolism-like energetic bridge without assuming a modern pathway
- population observables include abundance, diversity, selection, competition, parasite load, extinction risk and modeled generations
- early ecology adds spatial structure, niche diversity, cooperation and diversification
- biological stages progress from `pre-darwinian` → `replicator-population` → `protocellular-evolution` → `microbial-ecology`
- Phase-8 cells/replicators overlay the existing Phase-7 chemistry in the same physical micrometer frame rather than replacing it with a disconnected scene
- live Phase-8 inspector and regression tests distinguish chemical selection from true Darwinian evolution
- completed Phase-8 source passed dependency install, TypeScript typecheck, the full Vitest suite, and production Vite build in V3 CI

## Phase 9 development

Phase 9 is actively extending the Biological Epoch into microbial guilds, planetary biosphere feedback, oxygenation, horizontal exchange, complex-cell symbiosis and multicellular ecosystem transitions on `v3-dev`.

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

The epochs are not separate games or slides. V3 uses inherited state and hierarchical spatial frames so the selected halo comes from the cosmic density field, its galaxy inherits that halo, the selected star belongs to that galaxy, its planetary system inherits its birth environment, Phase 6 evolves one surviving planet, Phase 7 inherits that planet's geochemistry, and Phase 8 can become biological only through the organized chemical state that actually evolved there.

## Scientific scope

V3 distinguishes observational/experimental anchors from reduced physics, theoretical models and phenomenological bridges. It is not a replacement for cosmological N-body/hydrodynamics, stellar-structure codes, planetary formation integrations, high-pressure interior models, atmospheric photochemistry, climate GCMs, aqueous-speciation packages, experimentally calibrated prebiotic kinetics, explicit sequence-level molecular evolution or population-genetic inference. Approximate subsystems are documented in `docs/V3_PHASE3.md` through `docs/V3_PHASE8.md` rather than being presented as precision calculations.
