# V3 Phase 6 — differentiated worlds, atmospheres, water, and climate

Phase 6 replaces the generic surface placeholder with the selected Phase-5 planet itself. The surface frame inherits the planet's generated mass, radius, semimajor axis, volatile proxy, stellar parent, and evolutionary age.

## Causal handoff

1. Phase 5 selects one surviving low-gas world from the generated planetary architecture.
2. During the planetary → surface transition, the planetary-system renderer recenters on that exact orbiting body.
3. The surface frame then resolves the same body's physical radius in kilometers.
4. Interior, atmospheric, hydrospheric and climate state are calculated from that inherited world rather than from an Earth preset.

## Differentiation

NASA's InSight material describes rocky-planet accretion as a strong heat source: as material gathers, pressure and temperature rise, melting permits dense material to sink and lighter material to rise, producing core, mantle and crust differentiation.

Phase 6 therefore models a mass-dependent differentiation timescale driven by early accretional heating. A bulk core fraction is assigned from the Phase-5 composition class and converted into a reduced core-radius proxy as differentiation proceeds.

This is not a mineral-physics or high-pressure equation-of-state calculation. Exact core size/composition would require detailed bulk elemental abundances and pressure-dependent material models.

## Interior heat and mantle dynamics

The reduced thermal history contains three declining contributions:

- rapidly decaying accretion/impact heat;
- secular cooling;
- a longer-lived radiogenic proxy.

The resulting mantle-temperature and heat-flux proxies drive a normalized convection index.

USGS work supports the physical link between internal heat loss, mantle convection and plate-tectonic driving on Earth. However, whether a particular exoplanet develops long-lived mobile plates depends on many poorly constrained properties. Phase 6 therefore exposes a **tectonic mobility index** and regime rather than assuming Earth-style plate tectonics.

Possible display regimes are:

- magma ocean;
- stagnant lid;
- episodic mobility;
- mobile lid;
- cold lid.

`mobile-lid` is a reduced model outcome, not a claim that plate tectonics has been observationally detected on the generated planet.

## Volcanism and dynamo

Volcanism scales with differentiation, convection and interior heat. The dynamo index requires a differentiated iron-rich core plus an age/heat-loss window that permits convective core cooling.

Both are qualitative normalized indices. Magnetic-field generation depends on core phase, composition, thermal conductivity, rotation and convective power; V3 does not yet solve a core-energy or magnetohydrodynamic model.

## Atmosphere

The atmosphere is a reduced secondary-atmosphere model:

- differentiation and volcanism provide an outgassing-pressure proxy;
- surface gravity and escape velocity come directly from generated planet mass/radius;
- stellar irradiation and time produce a thermal-escape stress proxy;
- retained atmospheric pressure is the outgassed inventory multiplied by the retention factor.

The displayed CO2 and H2O fractions are climate-state variables, not a photochemical network. The simulator does not yet include XUV history, stellar winds, impact erosion, nonthermal escape, atmospheric chemistry or condensation chemistry in detail.

## Water inventory

The Phase-5 volatile/ice proxy is converted into an initial bulk-water inventory. Retention then depends on atmospheric escape stress.

NASA Earth-observatory material notes that volcanic emissions are thought to have contributed water to Earth's early surface reservoir, but Phase 6 does not assume volcanic outgassing was the sole source of water on all rocky worlds. The inherited Phase-5 volatile inventory can represent material incorporated during planetary assembly.

Water state is divided into:

- retained bulk water in Earth-ocean equivalents;
- liquid-water fraction;
- ice fraction;
- global ocean-coverage proxy;
- weathering index.

Ocean coverage is a reduced topographic filling model, not a solved basin/crust model.

## Climate

Phase 6 uses a zero-dimensional energy-balance approximation.

Stellar flux follows the selected star's luminosity and the generated planet's actual semimajor axis. Equilibrium temperature includes a bulk albedo. A reduced greenhouse term depends on atmospheric pressure, CO2 partial pressure and water availability.

The model classifies the result as one of:

- airless cold;
- snowball;
- temperate;
- steam greenhouse;
- hot dry.

These are broad physical states, not Earth climate simulations. Clouds, circulation, latitudinal transport, seasons, ocean circulation, photochemistry, carbonate-silicate cycling and runaway-greenhouse radiative transfer remain simplified or absent.

## Rendering

The surface reference frame uses `1 km` per local unit. The globe therefore has a physical radius of `planet.radiusEarth × 6371 km`.

Seeded terrain relief is kept small relative to planetary radius. Its exact mountain/basin geography is procedural because Phase 6 does not yet run a resolved crustal deformation model. Ocean/ice coloring is derived from the global water state; haze, cloud points and volcanic markers respond to atmospheric water and volcanism.

## Evidence classes

- **A — established / observational:** accretion heats forming rocky planets; melted bodies differentiate by density; rocky planets have layered interiors; internal heat drives mantle convection on Earth; atmospheres can be lost or retained depending on gravity/irradiation; surface water strongly affects climate.
- **B — reduced accepted physics:** `g = M/R²` scaling, escape-velocity scaling, inverse-square stellar flux, radiative-equilibrium temperature scaling, decaying interior heat, density differentiation.
- **C — phenomenological / empirical:** exact differentiation timescale, radiogenic normalization, tectonic-mobility mapping, volcanism/dynamo indices, atmospheric outgassing inventory, escape law, volatile-to-ocean conversion, greenhouse parameterization and global ocean-coverage function.
- **D — speculative:** no specific tectonic, magnetic, atmospheric or ocean history is imposed as mandatory.

## References

- NASA Science, *A Rocky Planet Forms*: https://science.nasa.gov/resource/a-rocky-planet-forms/
- USGS, *The Interior of the Earth*: https://pubs.usgs.gov/gip/interior/
- Frost et al. 2022, *Multidisciplinary constraints on the thermal-chemical boundary between Earth's core and mantle*: https://www.usgs.gov/publications/multidisciplinary-constraints-thermal-chemical-boundary-between-earths-core-and-mantle
- NASA Earth Observatory, *The Water Cycle*: https://science.nasa.gov/earth/earth-observatory/the-water-cycle/
- NASA Webb, *Webb Rules Out Thick Carbon Dioxide Atmosphere for Rocky Exoplanet*: https://science.nasa.gov/missions/webb/webb-rules-out-thick-carbon-dioxide-atmosphere-for-rocky-exoplanet/
