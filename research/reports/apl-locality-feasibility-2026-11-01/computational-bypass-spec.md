# Computational APL condition without exact-contact claims

2026-11-01, prospectively specified after the researcher authorized computational bypasses. This supersedes an endpoint-first requirement for engineering conditions; it does not change frozen biological or memory gates.

## Smallest calculation

Use the existing two APL trees and retained KC/APL contacts as an approximate substrate. For a fixed positive length scale L, compute the uniform-radius spatial kernel

`z(v) = sum_u input(u) * exp(-tree_distance(u,v) / L)`.

This follows the spatial attenuation form in the cached Amin 2020 source; using it on FlyWire, choosing a uniform radius, projecting proxy contacts, and treating filtering as instantaneous are declared computational approximations. No biological time constant or receptor kinetics is inferred. Source applicability remains in [primary data access](primary-data-access.md); the exact source-to-solution adaptation must be registered before learner use.

Compute this in two passes over a rooted tree. Upward: `subtree[p] += a(child) * subtree[child]`. Downward: `z(child) = subtree[child] + a(child) * (z(parent) - a(child) * subtree[child])`, with `a(child)=exp(-edge_length/L)`. This is exact arithmetic for the declared tree kernel, not evidence that the declared tree is exact anatomy. It uses linear state/time, rather than a dense contact-pair matrix. Subdivide existing skeleton edges at contact projections before mapping inputs/outputs; subdivision introduces calculation sites, not biological neurons or graph synapses. Co-located source events sum; do not turn extra mesh vertices into extra physiological input.

First verify the tree calculation against independent all-pair path enumeration on small branched/zero-length fixtures, source superposition, and rejection of malformed/nonfinite inputs. This is disconnected numerical software verification, not a graph diagnostic or memory evidence.

## Uncertainty and learning contract before launch

Keep midpoint projection as the declared primary approximation. Predeclare geometric alternatives independent of association IDs, teacher valence and outcomes: known APL-side projection for every available canonical sample, plus deterministic nearby-segment alternatives selected by geometric residual alone. Preserve and report ambiguous cases; do not silently remove them. A useful computational result must survive its stated uncertainty range, or be reported as geometry-dependent. Exact endpoint acquisition remains an optional accuracy improvement, not a blocking requirement for this condition.

Do not connect the kernel to the frozen learner until the precise contact-to-current normalization, inhibition sign, feedback timing, baseline APL treatment and state persistence are declared. Replacing versus supplementing baseline APL currents must be explicit to prevent double counting. Preserve original graph/root identities and signs. No task labels, saved answers or per-association synapse allocation enter filtering. Test loss of useful signal and saturation as well as reduced harmful shared eligibility.

The first learner campaign must pair informative consequence feedback with matched absent/shuffled/disabled-plasticity arms, original representation and mechanism-disabled controls. Freeze settings and rejection rules before execution. Report every seed/item jointly on acquisition, retention after new learning, declared abstract delay, finite capacity and selective reversal. Failure to acquire is not protection; suppressed activity is not improved memory. No sealed confirmation is opened during this development step. This condition does not solve the separate need for a revisable persistent storage mechanism or independently audited joint success.
