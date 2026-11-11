**SOURCE NO-GO. Resolve the teaching mechanism before building this primary condition.**

A successful run could demonstrate a computational learner with persistent fly-edge gains. **As written, it cannot establish Property 1**, so passing its numerical gates cannot complete Properties 1 through 3. This verdict concerns this implementation and its source support, not a universal biological limit.

1. **Critical: the paired-trial subtraction creates an extra-circuit teaching signal.**  
   [Proposal §4](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-proposal-2026-11-07.md:35) computes `D` from two separately reset trajectories, retains cue-only KC eligibility, and forces `D=0` when the teacher supplies no positive pulse. The synapse therefore receives information identifying the externally caused component of dopamine, while ignoring sensory-driven dopamine. No modeled circuit or local physiological state performs that separation.

   This differs from [Gkanias equation 1 and its derivation](https://elifesciences.org/articles/75611): its factor represents local dopamine effects, including depression/potentiation components, rather than subtraction between counterfactual trials. Delivering current through identified DANs does not biologically justify the subsequent subtraction. Moving that arithmetic into a memory class would not resolve the issue.

   **Before building:** identify a source-supported, locally available teaching variable and explain its timing, eligibility and treatment of endogenous dopamine. The exact missing evidence is a mechanism supporting the proposed discrimination between sensory and experimentally evoked dopamine, together with the retained cue eligibility. Without that evidence, this condition remains an engineering comparison. Audit replay can verify its arithmetic, but cannot establish Property 1.

2. **High: the APL comparison cannot distinguish locality from weaker inhibition.**  
   Under [proposal §3](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-proposal-2026-11-07.md:19), positive KC inputs are multiplied by `exp(-distance/L)≤1`, without compensating normalization. For identical presynaptic activity, this supplies no more KC-driven current at a local site than the global sum. Thus the intervention changes both spatial structure and inhibition strength. Recurrent effects may be complex; neither reduced overlap nor stabilisation follows automatically.

    [Amin's Appendix 1](https://elifesciences.org/articles/56954) actually favors all-to-all inhibition over self-inhibition for decorrelation in its analyzed models. The [next-mechanism decision](C:/Users/ethan/Documents/fly-chess-research/research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md:17) consequently requires preserved acquisition, useful distinctions and reduced harmful eligibility, not simply lower activity.

   **Before building:** specify the exact discrete recurrence and an inhibition-strength-matched nonlocal comparison. Treat stabilisation as an experimental hypothesis. Activity distributions alone cannot establish its cause.

   Geometry bypasses are authorized. However, the 126 endpoint substitutions and arbitrary 100-nm alternative-segment rule are **stress cases, not uncertainty bounds**. The [attachment result](C:/Users/ethan/Documents/fly-chess-research/research/reports/apl-locality-feasibility-2026-11-01/attachment-result-and-next-gate.md:11) documents a 402.96-µm branch displacement. Passing those finite alternatives cannot validate unsampled attachments or biological locality.

3. **High: distinguish supported identities and preference direction from unsupported learning applicability.**  
    PAM08's gamma4 identity **is resolved** by `.cache/fbbt.obo`, term `FBbt:00111020`; MBON05's contralateral receiving side is also documented. These are not missing facts.

    The negative MBON05 preference is source-motivated: [Aso's behavioral experiments](https://elifesciences.org/articles/04580) support avoidance associated with its activation. They do not establish a calibrated chess score or receptor-specific output polarity. The [sign-provenance report](C:/Users/ethan/Documents/fly-chess-research/research/reports/mbon05-sign-provenance-2026-11-01/README.md:3) shows that the hemispheric graph-sign difference comes from transmitter-label fallback. Averaging the two cells does not resolve its recurrent consequences.

    Also, Gkanias's named gamma4 discharging circuit uses **PAM07**, whereas this proposal stimulates **PAM08**. Sharing a compartment does not by itself establish equivalent teaching dynamics.

   **Before building:** document the source-backed applicability of the selected learning branch to PAM08, separately from the decoder rationale. Preserve the released signs; do not choose replacements using chess results. Gain bounds, numerical step size and normalization are engineering decisions that must be pinned, not presented as measured physiology.

4. **High: Property 2 can pass without demonstrating the required pressure or correction.**
    [Proposal §§6–7](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-proposal-2026-11-07.md:59) counts any repeated gain change toward its 25% pressure thresholds. Tiny recovery changes, including changes too small to alter applied Float32 magnitudes, can satisfy such counts without meaningful competition for useful memory. Report effective magnitude changes, update sizes and demonstrated interference, not just touched edges.

    The ratio of aggregate margin improvements can pass while absolute margins remain negative, and can hide complete losses on individual A boards. `mean(safe scores)−max(other scores)` measures something different from choosing **any** successful action. The retention estimand needs an explicit connection to "A still works."

   The correction check only asks initially wrong rankings to **improve**. A ranking can improve and remain wrong; this also does not test revision of an acquired preference. Omission causes no update, and the proposed chess tape supplies no explicit contingency-reversal test.

   **Before building:** freeze meaningful acquisition/correction outcomes, define the acquired memories whose margin is retained, and specify pressure that challenges them while B learns. Keep the authorized **0.70 retention requirement**; neither edge-touch counts nor a small development pass replaces it.

5. **High: controls and replication remain partly confounded.**  
   [Proposal §§5–7](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-proposal-2026-11-07.md:45) correctly restores all-legal ranking and requires fresh confirmation games. Several details remain material:

   - A shuffled arm receiving mostly inappropriate pulses may deteriorate. Require improvement from the primary arm's own naive checkpoint; merely outperforming a damaged control is insufficient.
   - Define random-capture sampling, including king captures. Otherwise beating it may show king-capture avoidance rather than recapture-sensitive learning. Keep such comparisons diagnostic; added gates must not redefine Properties 1 through 3 completion.
    - Define what the primary seeds actually vary. In [SparseTrainer](C:/Users/ethan/Documents/fly-chess-research/.codebase/src/supervised-baselines/trainer.mjs:26), random initialization affects input/head arrays. With zero external feature input and raw MBON scoring, those arrays do not create different neural trajectories. Identical tapes can therefore produce three identical primary "replicates."
   - Raw/random stores must receive explicitly matched experiences and disclosed outcome information. They are comparisons, not guaranteed upper bounds.

**After those design/source issues are resolved, implementation may precede these checks. Every check must pass before launch:**

1. **Integration correctness:** the existing [ReversalMemory implementation](C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/reversal-memory.mjs:78) reads the current endpoint and enforces an Euler stability bound; it does not implement the proposed paired observations. Preserve the stability check and copy reused endpoint buffers. The tree prototype rejects `Infinity`, so `K=1` needs an explicit implementation. Existing certificate helpers also return `experimentalPulse=true` for failures, and the ledger treats king captures as unknown. Reuse cannot silently reverse the proposed positive-only teaching or certify the new non-king criterion.

2. **Frozen data and audit:** register exact task membership, checkpoint/epoch ordering, seed roles, masks and transitive pins. Check game separation, repeated positions, identical rendered inputs and contradictory-label collisions. Eyes v2's captured-piece image is disclosed and permissible; it does not remove those checks. The independent audit must reconstruct event inputs and state transitions, not merely reproduce the producer's verdict.

3. **Executable resource budget:** clarify whether full all-legal rankings are required before every experience. A static illustration using the earlier datasets' first 32 qualifying boards per group contains 2,464 legal actions: four epochs require 9,856 experiences, but full ranking before each experience requires **388,576 ranking passes per arm/seed**, before other evaluation and audit work. This was not recertified as the new dataset. The 24/72-hour limits are therefore unsubstantiated until exact pass counts and bounded implementation measurements exist. Linear-memory filtering alone does not establish affordable runtime.

**Next: revise §4 with the exact source-supported local teaching mechanism, or record that specific unresolved source gap.**
