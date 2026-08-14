# V3 Phase 2 — Multi-scale camera

Phase 2 establishes the numerical and visual handoff system required for seamless travel across orders of magnitude.

Implemented:

- hierarchical local frames from Mpc to micrometers;
- frame-specific near/far clipping and precision envelopes;
- deterministic parent/child transition anchors;
- guided camera transitions that begin from the user's actual free-orbit pose;
- placeholder overlapping scenes for cosmic, galactic, stellar, planetary, surface, and microscopic scales;
- floating-origin infrastructure;
- button and keyboard scale navigation;
- regression tests for frame ordering and forward/reverse transition anchors;
- GitHub Actions typecheck/test/build validation.

The placeholder scenes are not the scientific model. Phase 3 replaces the cosmic placeholder with the first real science layer: cosmological expansion, recombination/CMB state, seeded density perturbations, and reduced large-scale-structure growth.
