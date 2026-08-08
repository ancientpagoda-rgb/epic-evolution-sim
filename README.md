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

- the selected Phase-4 star owns a deterministic protoplanetary disk
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
- live Phase-5 inspector and regression tests

### Phase 6 — selected planet → active world

- the selected Phase-5 planet becomes the actual surface-frame object rather than a generic Earth-like placeholder
- planetary → surface transition recenters the outgoing system on that exact generated world
- physical surface frame uses `1 km` per local unit and the generated planet's model radius
- gravity and escape speed derive directly from generated mass/radius
- accretional heating, secular cooling and long-lived radiogenic heating feed a reduced thermal history
- density differentiation yields evolving core/mantle/crust structure proxies
- convection, volcanism, dynamo potential and impact flux evolve with age/interior heat
- tectonic behavior is represented as a mobility index/regime rather than assuming Earth-style plate tectonics
- atmospheric pressure is a reduced outgassing × retention model
- volatile inheritance from Phase 5 becomes retained water inventory, ocean/ice fractions and weathering
- zero-dimensional climate combines actual stellar flux/orbit, albedo and a reduced pressure/CO₂/H₂O greenhouse term
- high-resolution state-driven globe, live inspector and regression tests

### Phase 7 — generated environment → prebiotic chemical evolution

- the microscopic placeholder is replaced by chemistry inherited directly from the Phase-6 world
- local chemistry keeps Phase-6 temperature, atmospheric pressure, stellar forcing, water/ice state, weathering, volcanism, heat and impact activity
- four plausible environment routes are scored simultaneously: hydrothermal interface, wet–dry mineral environment, aqueous mineral pore, and ice/brine
- the dominant route is displayed without erasing the other routes or claiming a uniquely known historical origin pathway
- reduced feedstock indices track carbon, nitrogen, phosphorus, sulfur, iron and amphiphile precursors
- energy-gradient state combines UV, geothermal, redox, wet–dry and impact/electrical contributions
- mineral-catalysis, ionic-strength and pH proxies link planetary geochemistry to local reaction conditions
- deterministic reduced reaction network tracks simple organics, amino-like precursors, nucleotide-like precursors, amphiphiles, peptide-like oligomers, nucleotide-polymer proxies, compartments and autocatalytic-network proxies
- polymerization and compartment formation respond to route-specific concentration/dehydration and aqueous conditions
- `chemicalSelectionPotential` represents differential persistence/amplification potential, not biological natural selection
- `protocellLikeIndex` requires compartments plus polymer/network organization and is explicitly not treated as proof of life
- physical microscopic frame remains `1 µm` per local unit
- renderer shows mineral interfaces, aqueous media, organics, polymers, energy gradients, vesicle-like compartments and hydrothermal structures when relevant
- Phase-7 inspector exposes route weights, local conditions, energy gradients, mineral catalysis, organics, polymers, compartments and chemical-selection state
- regression tests cover pre-surface gating, exact pressure/temperature inheritance, mixed route normalization, determinism, bounded network state, time-dependent complexity and micrometer scaling

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

The seven epochs are not separate games or slides. V3 uses hierarchical spatial reference frames and transition anchors so the selected halo comes from the cosmic density field, its galaxy inherits that halo, the selected star belongs to that galaxy, the Phase-5 planetary system inherits that exact star and birth environment, Phase 6 evolves one actual surviving planet, and Phase 7 inherits that planet's generated geochemical environment rather than resetting to a generic primordial-soup preset.

## Scientific scope

V3 distinguishes observational anchors from reduced physics and phenomenological models. The browser simulation is not a replacement for Boltzmann/recombination codes, cosmological N-body + hydrodynamics, detailed stellar-structure codes, radiative-transfer disk calculations, planetesimal hydrodynamics, long-term planetary integrations, high-pressure interior models, atmospheric photochemistry, general-circulation climate models, aqueous speciation software, or experimentally calibrated prebiotic reaction networks. Approximate subsystems are documented in `docs/V3_PHASE3.md` through `docs/V3_PHASE7.md` rather than being presented as precision calculations.
