# V3 Phase 4 — galaxies, stars, and chemical enrichment

Phase 4 replaces the pre-made galaxy and stellar placeholders with a causal chain derived from the same seeded Phase-3 structure field.

## Causal handoff

1. Phase 3 creates one deterministic Gaussian perturbation field.
2. The densest resolved peak is selected as the parent halo seed for the guided continuum path.
3. The cosmic structure layer is recentered on that evolving selected peak, so the cosmic → galaxy camera target is geometrically the same halo feeding the galaxy model.
4. That peak receives a reduced halo assembly history, spin parameter, baryon reservoir, and merger index.
5. The halo state determines gas retention, stellar mass, star-formation rate, disk/bulge balance, and molecular-gas availability.
6. A deterministic representative stellar population is born from that galaxy history.
7. The selected stellar-system anchor is one actual member of that representative population, chosen near a long-lived roughly solar-mass regime for later planetary phases.

The scene therefore no longer jumps from the cosmic web to an unrelated decorative galaxy.

## Halo and galaxy model

The halo mass history is a reduced exponential mass-assembly model in redshift, seeded by the selected density peak. It is **not** a merger-tree or full N-body halo finder.

The cosmic baryon fraction is inherited from the Phase-3 Planck-like baseline. Gas retention is suppressed in very small halos, while the stellar-to-halo efficiency is represented with an empirical bell-shaped proxy that peaks near halo masses of about `10^12 M_sun`. Observational stellar-to-halo work finds this characteristic efficiency peak, but its exact normalization and redshift evolution are model dependent.

Galaxy morphology is not assigned as a random label. Disk fraction depends on the seeded halo spin and merger index; the renderer then uses that state to determine the thickness and radial structure of the representative stellar distribution.

## Molecular clouds and star formation

NASA describes stars as forming in cold molecular clouds, where dense pockets collapse gravitationally to form protostars. Phase 4 therefore ties the visible cloud layer to the modeled cold/molecular gas reservoir and star-formation rate rather than drawing a constant nebula.

The star-formation rate uses a reduced gas-depletion-time model. Feedback, radiative transfer, turbulence, magnetic fields, explicit molecular chemistry, and resolved cloud collapse are not yet simulated.

## Initial mass function

The default representative population uses a **Kroupa-like two-part power-law IMF**:

- `alpha = 1.3` from `0.08–0.5 M_sun`
- `alpha = 2.3` from `0.5–120 M_sun`

with continuity at the break.

This is a reproducible baseline, not a claim that the IMF is perfectly universal. Recent and historical observations continue to investigate environmental and metallicity-dependent IMF variation.

## Stellar evolution

Each representative star stores:

- initial mass;
- cosmic birth time;
- disk/bulge placement parameters;
- a reduced binary/remnant flag for neutron-rich enrichment events.

Mass determines an approximate main-sequence lifetime, luminosity, radius, and effective temperature. Stars then progress through reduced stages:

`main sequence → giant/AGB or massive supergiant → white dwarf / neutron star / black hole`

This is not a MESA-style stellar-structure calculation. The goal is to preserve the strongest mass-dependent lifecycle differences while remaining interactive in-browser.

NASA's current stellar overview notes that stellar lifetimes range from millions to trillions of years, massive stars can fuse successively heavier nuclei up to iron before core collapse, and expelled stellar material enriches later generations of stars and planets.

## Enrichment channels

Phase 4 tracks separate normalized contribution indices for:

- **AGB return** — delayed carbon/nitrogen-rich mass return from intermediate/low-mass evolved stars;
- **core-collapse supernovae** — rapid enrichment from massive stars;
- **Type Ia supernovae** — delayed thermonuclear contribution represented by a small eligible white-dwarf population and delay time;
- **r-process proxy** — rare neutron-rich events associated with suitable massive-star remnants.

These are contribution indices, not precision elemental abundance yields.

Neutron-star mergers are established sites for production of very heavy nuclei such as gold and platinum. Current research also continues to evaluate other sources: a 2025 NASA-highlighted study found evidence that magnetar giant flares may contribute to the heavy-element inventory. V3 therefore intentionally does not claim that one channel alone accounts for all r-process material.

## Metallicity

The bulk gas metallicity display uses a reduced leaky/closed-box-style proxy from gas consumption and is normalized to a solar heavy-element mass fraction of `Z_sun ≈ 0.0142` for display purposes.

The channel indices answer a different question: which stellar populations have had enough time to return material. A later fidelity phase may replace the bulk proxy with explicit element-by-element yield tables.

## Evidence classes

- **A — established / observational:** stars form in molecular clouds; stellar lifetime strongly depends on mass; massive stars undergo core collapse; stellar material is recycled; neutron-star mergers produce r-process material.
- **B — reduced accepted-physics:** mass-dependent stellar lifetime/luminosity/radius relations; remnant categories; causal halo-to-galaxy inheritance.
- **C — phenomenological / empirical:** halo assembly law, gas-retention curve, stellar-to-halo efficiency proxy, gas depletion time, morphology mapping, bulk metallicity proxy, Type-Ia/r-process event fractions.
- **D — speculative:** none are required as mandatory historical events; rare enrichment routes remain explicitly uncertain.

## References

- NASA Science, *Stars*: https://science.nasa.gov/universe/stars/
- NASA Science, *Dark Matter Simulation in Milky Way Halo*: https://science.nasa.gov/asset/hubble/dark-matter-simulation-in-milky-way-halo/
- Shuntov et al. 2022, *COSMOS2020: The cosmic evolution of the stellar-to-halo mass relation*: https://arxiv.org/abs/2203.10895
- Kroupa, *On the variation of the Initial Mass Function*: https://arxiv.org/abs/astro-ph/0009005
- NASA Science, *Stellar Explosions*: https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-stellar-explosions/
- NASA Science, *Where Does Gold Come From? NASA Data Has Clues*: https://science.nasa.gov/universe/stars/neutron-stars/magnetars/where-does-gold-come-from-nasa-data-has-clues/
