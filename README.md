# Epic Evolution Simulator

A seeded, interactive browser simulation inspired by Eric Chaisson's **_Epic of Evolution: Seven Ages of the Cosmos_**.

The project treats cosmic evolution as one connected history rather than seven isolated scenes. It follows the book's central conceptual thread: expansion creates gradients; gradients permit energy flow; open nonequilibrium systems can temporarily build and maintain local order while total entropy continues to rise; chance supplies variation, while physical constraints and selection prune what cannot persist.

## The seven modeled epochs

1. **Particle Epoch — Simplicity Fleeting**  
   Expansion, cooling, atom formation, matter/radiation decoupling, symmetry breaking.
2. **Galactic Epoch — Hierarchy of Structures**  
   Density fluctuations, gravitational collapse, hierarchical clustering and mergers.
3. **Stellar Epoch — Forges for Elements**  
   Gas-cloud collapse, fusion, stellar evolution, supernovae, nucleosynthesis and recycling.
4. **Planetary Epoch — Habitats for Life**  
   Metal-rich disks, temperature/composition gradients, accretion and survival of planetary systems.
5. **Chemical Epoch — Matter Plus Energy**  
   Energy-fed chemistry, bonding constraints, chemical selection, organic networks and protocells.
6. **Biological Epoch — Complexity Sustained**  
   Metabolism, reproduction, variation, inheritance, selection, photosynthesis and ecosystem diversification.
7. **Cultural Epoch — Intelligence to Technology**  
   Learning, symbols, tools, cultural inheritance, technology and rapidly rising energy throughput.

## What is actually simulated

This is a **high-resolution reduced-order scientific visualization**, not a full N-body, stellar-evolution, geochemistry, or population-genetics solver. Version 2 updates chronology and several physical claims against current NASA/ESA/Smithsonian references while retaining Chaisson's seven-epoch conceptual framework. Each seeded universe has hidden traits that alter its ability to cross major thresholds. The user can also change:

- **Density fluctuations** — how strongly early inhomogeneities can seed structure.
- **Energy throughput** — how much usable energy flows through candidate systems. Too little starves complexity; too much can destroy fragile structures.
- **Selection pressure** — how aggressively unstable or poorly adapted structures are pruned.

The model tracks a common chain of prerequisites:

`atoms → galaxies → stars → heavy elements → planets → complex chemistry → life → intelligence → technological culture`

The arrow is causal, not deterministic. A planet does not literally "evolve into" life and a star does not literally "evolve into" a planet. Earlier systems instead create environments in which new kinds of systems can emerge. Some seeds stall before life or culture.

## Energy-rate density

The interface uses **energy-rate density** as the principal cross-epoch comparison: energy passing through a system per unit time per unit mass. The display is normalized to a typical star (`1×`) and shown logarithmically. The relative scale is intentionally conceptual, with the highest throughput appearing in biological brains and technological civilization.


## Version 2: scientific + visual fidelity

- **Ultra 4K** mode targets an ~8.9-megapixel true framebuffer with high-DPI supersampling.
- Epoch boundaries now use **continuous cinematic blends and scale transitions**, rather than hard scene cuts.
- The cosmic age display uses **13.8 billion years** for the present universe and **~380,000 years** for recombination/CMB release.
- First-star timing is moved to the modern **~100–200 Myr** range.
- Heavy-element enrichment now includes multiple stellar/explosive channels rather than treating supernovae as the sole source.
- The origin of life is explicitly **unresolved**; protocell emergence is a model outcome, not a claimed historical fact.
- Biological history now includes atmospheric oxygenation and separates microbial, multicellular, and human/cultural transitions more realistically.
- The Cultural Epoch is anchored to a ~6-million-year human lineage, ~300-kyr Homo sapiens, and ~12-kyr agriculture.

## Run locally

No build step or dependencies are required.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Because the app is fully static, GitHub Pages can serve the repository root directly. In repository settings, choose **Pages → Deploy from a branch → main / root**.

## Controls

- **Play / pause** the arrow of time.
- Choose **Ultra 4K**, Adaptive HD, Native display, or Performance rendering.
- **Scrub** the seven equal-width epoch bands; internally, each band maps to a different span of cosmic time.
- **New universe** produces a new deterministic seed with different hidden thresholds.
- Tune density fluctuations, energy throughput, and selection pressure to explore which structures survive.

## Scientific / interpretive scope

The simulation is designed to represent the conceptual framework in the supplied chapters, especially:

- energy as a unifying currency of change;
- open nonequilibrium systems;
- local complexity increasing while global entropy also increases;
- energy-rate density as a cross-disciplinary comparison;
- hierarchical emergence across particles, galaxies, stars, planets, chemistry, biology, and culture;
- chance plus necessity rather than chance alone;
- selection as nonrandom elimination and environmental filtering;
- no guaranteed endpoint or predetermined evolutionary ladder.

It deliberately avoids reproducing the book text. It is an educational interpretation of its concepts, not an official companion product.

## Project structure

```text
.
├── index.html
├── style.css
├── src/
│   ├── data.js
│   └── simulation.js
└── docs/
    └── model.md
```
