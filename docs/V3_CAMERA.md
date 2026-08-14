# V3 multi-scale camera architecture

V3 does **not** attempt to store megaparsec, AU, kilometer, meter, and micrometer coordinates in one global floating-point scene. Each scale domain owns a local coordinate frame whose unit is chosen for the objects being rendered there.

The current hierarchy is:

`cosmic (Mpc) → galactic (kpc) → stellar (AU) → planetary (10³ km) → surface (km) → microscopic (µm)`

## Why this exists

Trying to keep a chemical compartment and a galaxy in one ordinary GPU coordinate space would destroy useful numerical precision at one end or the other. V3 instead treats the transition between scales as a parent/child handoff.

Each handoff has a `TransitionAnchor`. The parent scene identifies the object or location being approached; the child scene is generated from the state owned by that parent object. During a transition both detail levels can be rendered together while the camera moves through normalized local poses. The active numerical reference frame changes during the handoff, not by multiplying coordinates across dozens of orders of magnitude.

## Floating origin

Within a single frame, free camera motion can still travel far enough to reduce precision. `FloatingOrigin` recenters the camera when it crosses a frame-specific threshold, shifts the local scene roots and control target by the same vector, and records the cumulative local offset.

## Phase 2 prototype limitation

The Phase 2 scene uses deterministic placeholder geometry to prove the camera/reference-frame machinery. The continuity anchors are architectural contracts. Later science phases will replace the placeholder cosmic, galactic, stellar, planetary, surface, and microscopic groups with state-derived scenes while retaining the same handoff API.
