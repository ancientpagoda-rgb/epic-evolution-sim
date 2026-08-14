# V3 Phase 5 — protoplanetary disks and planetary systems

Phase 5 replaces the decorative planetary placeholder with a deterministic system inherited from the selected Phase-4 star and its parent galaxy.

## Causal inheritance

The Phase-5 model receives:

- the exact representative star selected in Phase 4;
- that star's initial mass and cosmic birth time;
- the Phase-4 galaxy model that formed it;
- the galaxy metallicity evaluated at the star's birth epoch.

The disk's heavy-element inventory is therefore frozen from the parent galaxy at stellar birth rather than changing later with the galaxy's continuing enrichment.

## Protoplanetary disk

The initial disk mass is a seeded fraction of stellar mass. The baseline dust-to-gas ratio is approximately 1% at solar metallicity and scales with the inherited birth metallicity. This is a reduced empirical prescription rather than a resolved disk-formation calculation.

NASA observations and summaries commonly describe protoplanetary disks as overwhelmingly gas with a small dust fraction; the dust is nevertheless the raw solid material from which planetesimals and planets form.

Gas decays exponentially and is removed after a seeded lifetime of roughly 2.5–8.5 Myr. This keeps gas-giant formation time-limited: giant cores must become sufficiently massive before the nebular gas disappears.

## Disk temperature and water snow line

The midplane temperature proxy combines two terms:

- stellar irradiation, approximately `T ∝ L_star^(1/4) r^(-1/2)`;
- a decaying viscous-heating term that is strongest in the young disk.

The displayed water snow line is solved numerically where the reduced disk temperature reaches approximately `170 K`.

The snow line is **not** treated as a fixed Solar-System radius. It moves as the young star and disk cool. More sophisticated radiative-transfer, opacity, accretion and MHD models can move the snow region substantially; Phase 5 therefore classifies its exact radius as a reduced model rather than an observational constant.

## Solids and embryos

A deterministic set of radial embryo seeds is distributed from the hot inner disk to the cold outer disk. Their available solid mass depends on:

- total inherited dust mass;
- radial surface-density weighting;
- exponential disk taper;
- enhancement of condensable solids outside the water snow line.

The embryos consume only part of the available dust budget, leaving room for smaller bodies and debris that are not individually resolved.

Core growth is a reduced oligarchic-style timescale proxy: inner, metal-rich regions generally grow more quickly, while distant embryos take longer.

## Gas capture and planet classes

Embryos that acquire sufficiently massive cores while gas remains can capture H/He envelopes. The model produces five display classes:

- rocky;
- water-rich;
- ice-rich;
- ice giant;
- gas giant.

These classes are derived from core mass, volatile fraction and gas-envelope fraction. They are not substitutes for full interior-structure calculations.

NASA's planet-formation overview similarly distinguishes warmer inner regions where rocky planets grow from refractory material and colder outer regions where water ice increases the available solid inventory and facilitates giant-core growth. Gas giants must form early enough to accrete gas before the disk dissipates.

## Dynamical architecture

Phase 5 uses a hybrid reduced-order approach rather than pretending to run a full Myr-scale formation simulation in the browser:

1. closely packed mature candidate cores are merged when their spacing is too small in mutual-Hill-radius units;
2. surviving mature bodies are passed through a short deterministic planar gravitational relaxation using leapfrog-like kicks and drifts in AU / solar-mass / year units;
3. bodies that immediately become unbound, fall into the inner cutoff, or travel beyond the outer cutoff are flagged as ejected;
4. the resulting semimajor axes and eccentricities define the mature visual architecture.

This short N-body pass is a **stability/strong-interaction screen**, not a replacement for long-term integrations, planetesimal dynamics, hydrodynamic migration or giant-impact calculations.

## Selected planet

For the later surface/chemistry phases, the model deterministically selects one surviving low-gas world, preferentially near the irradiation-equivalent distance of the selected star. This is a continuity anchor, not a claim that the planet is inhabited or even habitable.

## Rendering fidelity

Orbital distances use a physical local scale of `0.1 AU` per planetary-frame unit. Planet marker radii are intentionally exaggerated because true planetary radii are far too small to see at system scale. The HUD states this explicitly.

## Evidence classes

- **A — established / observational:** young stars possess gas+dust disks; dust grows into larger solids; water ice is stable only in sufficiently cold disk regions; giant planets require gas capture before disk gas disappears; planetary scattering can eject planets.
- **B — reduced accepted physics:** irradiation temperature scaling, snow-line temperature threshold, Keplerian orbital periods, mutual Hill spacing, direct Newtonian gravitational relaxation.
- **C — phenomenological / empirical:** disk-mass distribution, gas-decay law, dust-metallicity scaling, embryo spacing, solid-budget allocation, growth timescale, gas-capture efficiency, collision/merger proxy.
- **D — speculative:** none are required for the Phase-5 causal history.

## References

- NASA Science, *How Do Planets Form?*: https://science.nasa.gov/exoplanets/how-do-planets-form/
- NASA Science, *Planetary Systems*: https://science.nasa.gov/universe/stars/planetary-system/
- NASA Science, *From Cloud to Disk*: https://science.nasa.gov/exoplanets/resources/life-and-death/chapter-2/
- NASA/Hubble, *Planetary Systems in the Making*: https://science.nasa.gov/asset/hubble/planetary-systems-in-the-making-dust-and-gas-disks-around-young-stars-in-orion-nebula/
- Sasselov & Lecar, *On the Snow Line in Dusty Protoplanetary Disks*: https://arxiv.org/abs/astro-ph/9911390
- Oka, Nakamoto & Ida, *Evolution of Snow Line in Optically Thick Protoplanetary Disks*: https://arxiv.org/abs/1106.2682
