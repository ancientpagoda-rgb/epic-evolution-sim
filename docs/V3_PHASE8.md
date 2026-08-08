# V3 Phase 8 — from chemical evolution to Darwinian biological evolution

Phase 8 introduces the first state that V3 labels **biological life**. It deliberately does not equate complex chemistry, polymers, autocatalysis, or vesicle-like compartments with life by themselves.

The biological flag is activated only after the inherited Phase-7 system supports a combination of:

- informational template replication;
- imperfect copying;
- heritable variation;
- compartment inheritance;
- coupling between inherited template properties and protocell growth/behavior;
- resource and energy capture;
- differential reproductive success among variants.

Below that gate, the simulator can contain replicator-like chemistry and compartments while remaining explicitly `pre-darwinian`.

## Why the gate is stricter than Phase 7

Laboratory and theoretical protocell work separates several ingredients that are often casually collapsed into “life.” Fatty-acid vesicles can grow and divide through physical chemistry; template copying can occur inside model compartments; catalysts can give one vesicle population a competitive growth advantage. Those results show plausible components of a transition, but no single one is sufficient to establish a self-sustaining evolving biosystem.

Phase 8 therefore treats the onset of biology as the onset of sustained Darwinian population dynamics rather than the first appearance of an organic molecule, polymer, membrane, or autocatalytic reaction.

## Inheritance from Phase 7

The Phase-8 model receives directly from the chemical state:

- nucleotide-polymer proxy abundance;
- peptide-like oligomer abundance;
- amphiphile abundance;
- compartment abundance;
- autocatalytic-network state;
- carbon/nitrogen/phosphorus/sulfur resources;
- mineral catalysis;
- UV, geothermal, redox, wet–dry and impact-derived energy gradients;
- environment-route weights;
- chemical age.

It also retains the parent Phase-6 world so biology cannot exist after the planet/environment disappears.

The “nucleotide polymer” variable is an informational-polymer proxy inherited from Phase 7. V3 does not claim that the first genetic system had the exact chemistry of modern RNA or DNA.

## Origin readiness and contingency

`originReadiness` combines inherited template, compartment, catalytic and energetic organization. Each continuum seed also has a deterministic origin threshold.

This is a **contingency device**, not a measured probability of abiogenesis. A chemically rich planet can therefore remain pre-Darwinian indefinitely if its inherited organization never clears the threshold.

The threshold is intentionally distinct from the later Darwinian gate: crossing chemical readiness permits the model to evaluate populations of replicator variants, but V3 still requires sufficient heredity and differential reproductive success before `active = true`.

## Replicator variants

Phase 8 seeds a small deterministic population of variant informational systems. Each variant has:

- replication efficiency;
- catalytic coupling;
- copying fidelity;
- parasite/non-parasite status.

The model then evolves their frequencies using a reduced replicator–mutator process. Faster replicators can increase, catalytic variants can benefit their host compartments, mutations transfer frequency between neighboring model variants, and parasite-like variants can exploit shared resources while contributing less catalytic benefit.

These variants are abstract genotype classes, not explicit nucleotide sequences.

## Copying fidelity and mutation

The simulator never permits perfect primitive copying. Copying fidelity rises with inherited template/catalytic support but stays below 1, and mutation rate is defined as the complementary copying-error fraction.

This is motivated by the general error-threshold problem for early replicators: heritable information cannot be maintained if copying errors overwhelm selective retention, while some error is required for variation.

V3 does **not** attempt to use a universal experimentally measured mutation threshold. The effective mutation values and selection mapping are phenomenological.

## Compartment inheritance

Phase-7 amphiphiles and compartments feed a compartment-inheritance index. Spatial compartmentalization matters because it can couple the products of a functional replicator to the local reproductive success of the protocell containing it, rather than allowing all catalytic benefits to diffuse through a perfectly mixed population.

The model therefore makes compartment inheritance a major part of the biological gate and of parasite suppression.

## Metabolism-like energy coupling

Phase 8 does not assume modern metabolism. It tracks reduced proxies for:

- resource uptake;
- redox coupling;
- usable energy capture;
- coupling of that energy capture to protocell growth.

This represents the minimum idea that an evolving population must persist by using environmental free-energy gradients. It is not a reconstruction of glycolysis, the citric-acid cycle, chemiosmosis, photosynthesis, or any specific primordial metabolic pathway.

## Selection, competition, and parasites

Variant fitness depends on replication efficiency, resource supply, catalytic contribution, fidelity, energy capture, and compartment context.

The renderer/model also includes fast-replicating low-catalysis parasite variants. This is important because cooperative replicator systems face exploitation problems; compartment-level selection and spatial structure can make cooperative catalytic systems more robust than they would be in a single well-mixed pool.

`selectionStrength`, `competitionIndex`, and `parasiteLoad` are normalized model observables, not direct biological measurements.

## Biological activation criterion

The raw Darwinian index combines:

- heritability;
- differential fitness/selection;
- competition;
- extinction pressure.

V3 labels the state biological only if both the Darwinian index and heritability exceed explicit minimums. Otherwise:

- `active = false`;
- `stage = pre-darwinian`;
- `darwinianEvolutionIndex = 0`.

This allows pre-Darwinian replicators to exist without silently redefining every self-copying chemical system as life.

## Stages

Once active, the reduced Phase-8 state can progress through:

1. **replicator population** — heritable competing variants exist;
2. **protocellular evolution** — inherited functions measurably affect protocell growth and population persistence;
3. **microbial ecology** — sustained diversity, spatial structure and ecological diversification emerge.

These labels are broad model regimes. They are not claims that the simulator has recreated any particular historical organism or LUCA.

## Early ecology

Phase 8 tracks four early ecological indices:

- spatial structure;
- niche diversity;
- cooperation;
- diversification.

They arise from inherited environmental heterogeneity, compartmentalization, variant diversity and differential fitness. The model does not yet simulate explicit trophic webs, predation, oxygenic photosynthesis, eukaryogenesis or multicellularity.

## Extinction

An extinction-risk index increases with parasite burden and excessive copying error, and decreases with stronger heredity, energy-coupled growth and compartment inheritance.

This makes biological emergence reversible in principle: crossing the origin gate does not guarantee indefinite success.

## Rendering

Phase 8 remains in the same physical `1 µm` local frame as Phase 7. That is deliberate: the visual handoff is chemistry → organized replicators in the same microscopic environment, not a hard scene cut.

The renderer overlays:

- protocell-like bodies;
- internal informational-polymer strands;
- variant-dependent colors;
- resource particles;
- energy-coupling particles;
- population abundance and diversity changes.

The underlying Phase-7 chemical environment remains visible beneath the biological layer.

Individual rendered cells and strands are visualization proxies. Their geometry is not literal molecular/cellular ultrastructure.

## Evidence classes

- **A — experimental:** fatty-acid model protocells can grow/divide; informational polymers can be copied inside model vesicles under some chemistries; encapsulated catalysts can alter protocell competitive growth.
- **B — established evolutionary logic:** imperfect heritable replication plus differential reproductive success permits Darwinian evolution; copying errors create both variation and an information-maintenance problem; compartmentalization can link beneficial catalysts to host-level selection.
- **C — reduced/theoretical:** the exact V3 origin threshold, fitness equation, mutation mapping, population sizes, parasite penalties, ecological indices and extinction-risk equation.
- **D — unresolved:** the actual first genetic polymer, first metabolic network, historical order of heredity versus metabolism, exact environment of terrestrial abiogenesis, and whether life originated independently elsewhere.

## Primary research references

- Adamala & Szostak, 2013, *Competition between model protocells driven by an encapsulated catalyst*: https://pmc.ncbi.nlm.nih.gov/articles/PMC4041014/
- Zhu & Szostak, 2009, *Coupled Growth and Division of Model Protocell Membranes*: https://pmc.ncbi.nlm.nih.gov/articles/PMC2669828/
- Prywes et al., 2016, *Nonenzymatic copying of RNA templates containing all four letters is catalyzed by activated oligonucleotides*: https://pmc.ncbi.nlm.nih.gov/articles/PMC4959843/
- O'Flaherty et al., 2019, *Nonenzymatic Template-Directed Synthesis ... Inside Model Protocells*: https://pmc.ncbi.nlm.nih.gov/articles/PMC7547854/
- Bianconi et al., 2013, *Selection for Replicases in Protocells*: https://pmc.ncbi.nlm.nih.gov/articles/PMC3649988/
- Koonin et al., 2023, *Coevolution of reproducers and replicators at the origin of life and the conditions for the origin of genomes*: https://pmc.ncbi.nlm.nih.gov/articles/PMC10083607/
- Nunes Palmeira et al., 2026, *Selection for growth drives the emergence of genetic heredity in protocells*: https://pmc.ncbi.nlm.nih.gov/articles/PMC13056260/
