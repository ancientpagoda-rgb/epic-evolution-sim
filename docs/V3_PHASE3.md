# V3 Phase 3 — early universe and cosmic structure

Phase 3 replaces the Phase-2 cosmic placeholder with the first state-derived scientific scene.

## Scientific baseline

The background expansion uses a reproducible **Planck-like spatially flat ΛCDM baseline**:

- `H0 = 67.4 km s^-1 Mpc^-1`
- `Omega_m = 0.315`
- `Omega_b = 0.0493`
- `n_s = 0.965`
- `sigma8 = 0.811`
- present CMB temperature `T0 = 2.7255 K`

These are model parameters, not immutable physical constants. In particular, the late-Universe Hubble-constant tension is unresolved, so V3 labels the Planck solution as a baseline rather than claiming the expansion rate controversy is settled.

The background clock integrates

`H(a) = H0 sqrt(Omega_r a^-4 + Omega_m a^-3 + Omega_Lambda)`

numerically in `ln(a)`. With the chosen parameters the integrated present age is approximately 13.79 Gyr.

## Recombination / CMB

NASA's current Universe overview places recombination and release of the observable CMB at about 380,000 years after the Big Bang, when the universe changed from an opaque ionized plasma into a mostly neutral, transparent medium.

V3 uses that age as an observational anchor. The displayed ionization transition is deliberately a smooth phenomenological approximation; it is **not** a recombination solver such as HyRec or CosmoRec.

CMB temperature is calculated from expansion as

`T_CMB(a) = T0 / a`.

At the 380 kyr anchor the reduced background model gives a redshift of roughly 1075 and a radiation temperature of roughly 2930 K, consistent with the expected recombination-era scale.

## Primordial perturbations

The large-scale-structure seed is generated deterministically from a Gaussian Fourier field. Mode power follows a near-scale-invariant `k^n_s` primordial dependence with a deliberately reduced small-scale transfer function because the browser scene does not resolve the full cosmological matter power spectrum.

The same universe seed always generates the same Fourier coefficients.

## Zel'dovich approximation

Particle positions are advanced using a first-order Lagrangian structure-growth approximation:

`x(q,a) = q + D(a) psi(q)`

with Fourier-space displacement proportional to

`psi_k ~ i k delta_k / |k|^2`.

This produces sheets, filaments, nodes, and void-like regions from the initial field instead of drawing arbitrary decorative noise.

It remains a reduced **class-B model**. Shell crossing, nonlinear halo dynamics, baryonic pressure, gas cooling, feedback, hydrodynamics, and detailed dark-matter halo evolution require later or higher-fidelity solvers.

## Baryons and dark matter

Dark matter begins tracing gravitational growth directly after decoupling in the visualization. The ordinary-matter point layer is delayed by the recombination state and preferentially shown in denser regions. This is a pedagogical reduced representation rather than a baryonic hydrodynamics calculation.

## Evidence classes

- **A — established / observational anchor:** universe age scale, CMB existence, recombination at ~380 kyr, observed cosmic-web morphology.
- **B — reduced accepted-physics model:** flat ΛCDM expansion integration, linear growth approximation, Zel'dovich displacement field.
- **C — phenomenological visualization:** smooth ionization transition, simplified baryon lag, visual CMB color amplification.
- **D — speculative:** none required for Phase 3.

## References

- Planck Collaboration, *Planck 2018 results. VI. Cosmological parameters*, A&A 641 A6 (2020): https://www.aanda.org/articles/aa/abs/2020/09/aa33910-18/aa33910-18.html
- NASA Science, *Universe Overview*: https://science.nasa.gov/universe/overview/
- NASA/ESA/Hubble, *Mapping the Cosmic Web*: https://science.nasa.gov/mission/hubble/science/science-highlights/mapping-the-cosmic-web/
