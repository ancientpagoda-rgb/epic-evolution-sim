# V3 Phase 7 — inherited prebiotic chemical evolution

Phase 7 replaces the generic microscopic placeholder with a reduced chemical-evolution model driven by the selected Phase-6 world's actual generated environment.

## Causal inheritance

The Phase-7 chemistry state receives directly from Phase 6:

- surface temperature;
- atmospheric pressure and CO2 fraction;
- stellar forcing;
- retained liquid water and ice;
- ocean coverage;
- weathering;
- volcanism and internal heat;
- declining impact activity.

Those inherited quantities determine feedstock proxies, environmental-route weights, energy gradients, mineral-interface strength, and the time available for chemical evolution. Phase 7 does not reset the simulation to an assumed early-Earth laboratory mixture.

## Multiple environment routes

The origin of life is unresolved, and different proposed environments solve different chemical problems. Phase 7 therefore computes four simultaneous route weights:

- **hydrothermal interface** — liquid water + internal heat + volcanism + mineral/redox gradients;
- **wet–dry mineral environment** — exposed or intermittently exposed aqueous mineral surfaces capable of concentration/dehydration cycling;
- **aqueous mineral pore** — water-rock interfaces and confined mineral surfaces;
- **ice/brine** — cold concentrated aqueous microenvironments.

The highest score is displayed as the current primary environment, but all four weights remain visible and all can contribute to the reaction model. This is intentional: the simulator does not claim that one route is the known historical origin of terrestrial life.

NASA astrobiology material discusses many candidate settings, including rocky surfaces, hot springs, shallow and deep hydrothermal systems, lakes, lagoons, seas, and icy environments. NASA-supported research also highlights mineral-organic interfaces, wet–dry cycling, and shallow-sea alkaline vents as chemically interesting possibilities.

## Feedstocks

Phase 7 carries normalized feedstock indices rather than pretending the Phase-6 atmosphere is a complete chemical-speciation model:

- carbon availability depends primarily on atmospheric CO2 and volcanism;
- nitrogen availability is a broad atmospheric/reactive-nitrogen proxy;
- phosphorus availability increases with water-rock weathering and volcanism;
- sulfur is associated primarily with volcanic/hydrothermal activity;
- iron availability increases at reactive mineral/water interfaces;
- amphiphile precursors are tied to accumulated carbon chemistry and mineral interfaces.

These are **relative availability indices**, not molar concentrations or measured elemental abundances.

## Energy and disequilibrium

Chemical evolution requires usable free-energy gradients rather than energy alone. The reduced model tracks contributions from:

- ultraviolet irradiation after atmospheric shielding;
- geothermal energy;
- mineral/hydrothermal redox gradients;
- wet–dry cycling;
- declining impact/electrical energy.

The displayed `totalGradient` is a normalized availability index. It is conceptually consistent with the project's larger Chaisson-inspired emphasis on usable energy flow, but it is not an energy-rate-density measurement.

## Mineral interfaces, pH, and ionic conditions

Mineral surfaces can concentrate, select, organize, and catalyze organic molecules. NASA-supported origins research has emphasized that mineral-organic interfaces are plausible contributors to prebiotic synthesis, while also noting that the mineral repertoire of the prebiotic Earth differed substantially from today's biologically modified mineral diversity.

Phase 7 therefore exposes:

- a mineral-catalysis index;
- an ionic-strength proxy;
- a pH proxy influenced by CO2, volcanism, and hydrothermal-route weight.

The pH value is **not** produced by aqueous equilibrium/speciation calculations and should be read only as a local geochemical-state indicator.

## Reduced reaction network

The browser model integrates eight normalized reservoirs:

1. simple organics;
2. amino-acid-like precursors;
3. nucleotide-like precursors;
4. amphiphiles;
5. peptide-like oligomers;
6. nucleotide-polymer proxies;
7. compartments;
8. autocatalytic-network proxies.

The network is integrated deterministically from the same continuum seed. Production depends on inherited feedstocks, environment-route weights, energy gradients, mineral interfaces, water availability, and previous network state. Every reservoir is bounded from 0–1.

This is **not** a mechanistic reaction network with experimentally measured rate constants, activation energies, explicit molecules, solvent activities, side reactions, degradation products, or mass balance. It is a reduced causal bridge from planetary geochemistry to increasingly organized chemistry.

## Polymerization

Wet–dry cycling, mineral interfaces, and concentrated cold/brine conditions can all increase the reduced dehydration/polymerization drive. NASA-supported experiments have shown that wet–dry cycles can promote formation of peptide-like oligomers from plausible precursor mixtures.

The model separately tracks peptide-like oligomers and nucleotide-polymer proxies because there is no justification for assuming that one modern biopolymer system appeared first or alone.

## Compartments

Amphiphiles plus water availability produce a reduced compartment index. The renderer visualizes this as vesicle-like boundaries.

A compartment is not automatically a cell. Compartment formation, encapsulation, permeability, growth, division, and coupled internal chemistry are distinct scientific problems. Phase 7 therefore uses the term **protocell-like index** only for a model state combining compartments, polymers, and network activity.

## Chemical selection

`chemicalSelectionPotential` increases only when compartments, autocatalytic-network proxies, and usable gradients coexist. It represents the possibility of differential persistence/amplification among chemical organizations.

It is deliberately not called biological natural selection. Phase 7 contains no genome, heritable genotype, organism, metabolism, or confirmed self-replication.

## RNA and cofactors

RNA-world-like chemistry is one important research family, but Phase 7 does not hard-code an RNA-first history. NASA-supported work has explored how Fe2+ could have supported RNA folding/catalysis under ancient anoxic conditions, illustrating how geological chemistry can influence possible biopolymer function without establishing one unique origin pathway.

## Rendering

The microscopic reference frame remains physical at `1 µm` per local unit. The renderer shows:

- mineral interface geometry;
- an aqueous particle field;
- organic-network particles;
- polymer-segment proxies;
- energy-gradient particles;
- vesicle-like compartments;
- hydrothermal structures when that environment route is important.

Individual particles are visualization proxies, not literal atoms at correct molecular radii.

## Evidence classes

- **A — established / observational/experimental:** organic molecules can form abiotically; mineral-organic interactions affect chemistry; wet–dry cycles can concentrate reactants and promote some polymer-forming reactions; amphiphiles can self-assemble into compartments; redox/thermal/photon gradients can drive chemistry.
- **B — reduced accepted chemistry:** reaction rates depend on reactant availability and environment; concentration/dehydration can favor condensation reactions; compartments and catalysts alter accessible reaction networks.
- **C — phenomenological:** feedstock indices, environment scoring, pH/ionic proxies, normalized reaction equations, rate multipliers, autocatalytic-network index, protocell-like index, chemical-selection potential.
- **D — unresolved/speculative:** which environment or molecular system actually produced the first terrestrial life, the historical sequence of polymers/compartments/metabolism/replication, and whether comparable pathways occur on other planets.

## References

- NASA Science, *Where could life have gotten started on Earth?*: https://science.nasa.gov/astrobiology/learning-resources/alp/where-life-got-started/
- NASA Astrobiology, *Minerals, Organics, and the Origin of Life*: https://astrobiology.nasa.gov/news/minerals-organics-and-the-origin-of-life/
- NASA Astrobiology, *Regulating the Flood: Deliquescence in Prebiotic Environments*: https://astrobiology.nasa.gov/news/regulating-the-flood-deliquescence-in-prebiotic-environments/
- NASA Astrobiology, *Origins of Life in a Drying Puddle*: https://astrobiology.nasa.gov/news/origins-of-life-in-a-drying-puddle/
- NASA Astrobiology, *Prebiotic Chemistry around Shallow-Sea Vents*: https://astrobiology.nasa.gov/news/prebiotic-chemistry-around-shallow-sea-vents/
- NASA Astrobiology, *Chemical Evolution and the Origins of Life*: https://astrobiology.nasa.gov/news/chemical-evolution-and-the-origins-of-life/
- NASA Astrobiology, *RNA, Fe2+, and the Origins of Life*: https://astrobiology.nasa.gov/news/rna-fesup2sup-and-the-origins-of-life/
