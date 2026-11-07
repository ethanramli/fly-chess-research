# Source coverage, novelty boundaries and critical review

Access date: 2026-11-02. Targeted search and repository audit by Codex, no subagents. This is not a systematic review, exhaustive priority claim or meta-analysis. Literature evidence and repository outcomes are distinct. S1–S7 verify the closest relevant precedents; S8 is limited secondary-use theory coverage. Proposals in the companion protocol are engineering/scientific judgments, not numbers copied from these sources.

## Search and reproducibility record

Web queries included: `site.elifesciences.org about aims scope computational models biological insight`; `Drosophila episodic reasoning computational connectome model chess`; `Model-Free Episodic Control nearest neighbor generalization`; exact Shiu, Lappalainen and Bennett titles; `Drosophila visual generalization inference transitive reasoning primary study`; `site.pnas.org Drosophila Context generalization mushroom bodies`; `site.github.com/cesp99/fly-chess training`; exact bounded-synapses title. Include original research on connectome function, learning/control and generalization, plus official venue pages and closest public implementation. Exclude news/social claims as evidence of measured Elo or reasoning. No search-completeness claim, screened-study count or first-ever wording is justified.

Publisher Shiu/Lappalainen opens failed via authentication redirect; PMC access intermittently returned CAPTCHA. Author-hosted episodic PDF timed out; arXiv HTML succeeded. Europe PMC REST fullTextXML retrieved S1/S2/S4, retained here with SHA-256 access manifest. Downloaded full XML is not equivalent to full-paper reading. The extracted body text supports later inspection; the bounded sections below are what was actually read. Supplement PDFs, raw recordings, full equation derivations and figure images were not audited. An attempted PMC1783616 XML retrieval failed HTTP 500; do not treat it as read evidence.

## Primary evidence ledger

**S1. Shiu, P. K., et al. (2024). A Drosophila computational brain model reveals sensorimotor processing. Nature.** [DOI](https://doi.org/10.1038/s41586-024-07763-9); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/); [raw XML](source-evidence/PMC11446845.xml).

Coverage: abstract/search, main-section opening, Connectome models, Drosophila taste coding limitations, computational-model Methods opening and availability text; selected section excerpts, not complete article. Whole-brain modeling and circuit-function prediction are established precedents. Their leaky integrate-and-fire implementation differs from FlyChess's finite-step rate model. Their biological comparisons are a more relevant novelty standard than neuron count. Author-acknowledged limitation, Drosophila taste coding: morphology/receptor dynamics and other physiological processes are omitted; connectivity does not uniquely determine mechanism. This supports careful assumptions and circuit predictions, not validation of our memory or chess reasoning.

**S2. Lappalainen, J. K., et al. (2024). Connectome-constrained networks predict neural activity across the fly visual system. Nature.** [DOI](https://doi.org/10.1038/s41586-024-07939-3); [raw XML](source-evidence/PMC11525180.xml).

Coverage: search/full-text excerpts; beginnings of “DMN ensemble predicts known activity”, “Connectome and task are both necessary”, “Predictions cluster across DMN ensemble” and “Predicted mechanism of T4 and T5 tuning”. Connectome constraints combined with task optimization yield testable neural predictions; ensembles and constraint ablations are prior art. Reader-inferred scope limit: their neural-prediction result cannot establish chess-transfer value for our frozen feature map. Different model solutions and connectivity/parameter assumptions must be tested rather than calling all connectome models equivalent. Full supplements, fitting pipeline and all activity validation data not checked.

**S3. Blundell, C., et al. (2016). Model-Free Episodic Control.** [arXiv HTML](https://arxiv.org/html/1606.04460). Preprint, not verified here as a peer-reviewed journal article.

Coverage: sections 2–3, algorithm/equations 1–2, experimental setup and generalization paragraphs in §4, discussion; source PDF open failed. Exact-state memory and novel-state inference are separate operations: the latter averages neighbours in an explicit representation. The paper also discusses directly storing current returns rather than a nondecreasing maximum. Author-acknowledged scope, §2: the maximum-return estimator is unsuitable as general stochastic-value learning. Our current exact-only newest-binary-event store omits neighbour inference. Proposed candidate-level descriptors, latest evidence, small capacity, distance rule and certificate contract are adaptations, not a reproduction or fly physiological mechanism. No VAE or pretrained representation is proposed.

**S4. Bennett, J. E. M., Philippides, A., & Nowotny, T. (2021). Learning with reinforcement prediction errors in a model of the Drosophila mushroom body. Nature Communications, 12, 2569.** [DOI](https://doi.org/10.1038/s41467-021-22592-4); [raw XML](source-evidence/PMC8105414.xml).

Coverage: PMC abstract/introduction, model figure text, Methods opening (task stages, KC→MBON and KC→DAN assumptions) and selected Results opening. Prediction-error learning and conditioning/control comparisons in reduced mushroom-body models are established prior art. Author-acknowledged assumption, abstract/Methods: additional connectivity is postulated and some pathways assumed. This does not authorize arbitrary error-to-DAN mapping or validate our compartment parameters. No complete equation/supplement replication was done, and no rule from this paper was adopted here.

**S5. Ganguly, I., Heckman, E. L., Litwin-Kumar, A., Clowney, E. J., & Behnia, R. (2024). Diversity of visual inputs to Kenyon cells of the Drosophila mushroom body. Nature Communications, 15, 5698.** [Primary article](https://www.nature.com/articles/s41467-024-49616-z).

Coverage: abstract and introduction, including visual-KC input organization and the distinction between known behavioral paradigms. Anatomy motivates a sparse/combinatorial visual representation; it does not demonstrate that FlyChess's renderer or rank relay preserves useful chess relations. No method-level weakness assessment from this limited coverage; reconstruction methods, raw data and panel images not checked. Context generalization and the need for mammalian-style concepts cannot be inferred from this anatomical source alone.

**S6. eLife official scope and process.** [Aims and scope](https://elifesciences.org/about/aims-scope), [Submit your research](https://elifesciences.org/about/submit-your-research).

Coverage: substantive scope categories and complete process text. Supports a biological-insight standard for computational work and editorial selection before review. The absence of post-review accept/reject decisions does not remove selection. These pages do not promise a venue for a hybrid chess system or require new animal experiments universally. Editorial suitability remains a judgment; neither our matrix nor a formal gate pass guarantees it. No fees or future policy stability are assumed in the proposal.

**S7. Esposito, C. / cesp99. fly-chess, public engineering repository.** [Repository](https://github.com/cesp99/fly-chess).

Coverage: current README architecture, training/self-play/checkpoint and evaluation descriptions from search/full page excerpts; no new source-code audit of the remote implementation. Local scientific-contribution note also records pinned earlier commit `3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf`; current remote page is not assumed byte-identical to that pin. Fly wiring plus chess already exists. Gradient learning versus local updates is a methodological distinction, not automatic evidence of reasoning or superiority. No reported rating is independently validated here. Preserve upstream licenses and credit retina placement/simulation adaptations explicitly; import no weights.

**S8. Fusi, S., & Abbott, L. F. (2007). Limits on the memory storage capacity of bounded synapses. Nature Neuroscience.** [Publisher](https://www.nature.com/articles/nn1859), [author-hosted PDF](https://www.columbia.edu/cu/neurotheory/Larry/FusiNatNeuro07.pdf).

Coverage: bibliographic/search excerpts only; methods and proof not assessed. Bounded-synapse memory limitations have prior theoretical treatment. No numerical capacity, timescale, theorem or proof from it is applied here. Volume 4 needs its own explicit assumptions and independently checked proof before citing a theorem as explaining these experiments.

**S9. FIDE Laws of Chess, Article 3.7.** [Official rule URL](https://handbook.fide.com/chapter/E012023). Current direct fetch timed out; this session did not re-read the official text. The [prior primary-source prerequisite review](../overnight-eyes-reader-repair-2026-11-01/eye-prerequisites.md) and [F03 diagnosis/checks](../overnight-memory-plasticity-2026-10-31/pre-data-corrections.md) record the immediate-double-push requirement. The replacement proposal is supported by that documented rule argument and preserved fixtures; prospective exceptional-move checker cross-validation and fresh official text access remain execution prerequisites. It is not presented as independently reverified law in this session.

Search leads not promoted to findings: “Context and occasion setting in Drosophila visual learning” (PMC1783616, full-text access failed), neural episodic-control extensions and later connectome-prediction models surfaced in search. Check these before making a broad claim about all fly generalization or all episodic methods. No priority claim relies on their unread methods.

## Repository coverage and authority resolution

Read AGENTS.md and applicable deep-research workflow/quality rules; performed scoping, verification, synthesis and adversarial review personally. User instruction overrides the skill's agent team and intermediate confirmation steps. No independent panel or systematic-review certification is claimed.

Read the starting report, current-status (including later closeout), full five-volume plan, restart plan (input/reader/memory/comparators/eye and A/B/C gates), exact engineered-memory authorization, Volume 3 workspace/transfer chapter, engineered replay protocol/report, live integration protocol/report, F03/F04 correction draft, overnight closeout and eye prerequisites, interference diagnosis report/next-mechanism decision, research-goal/scientific-contribution notes and relevant navigation/log tails. Directly inspected the complete short memory/policy implementation for query/arbitration semantics. The long historical feedback direction and source register were selectively read; archival experiments and all linked raw runs were not re-audited. Numerical outcomes are report-backed, not newly regenerated. No sealed data were read.

Some initial combined terminal reads exceeded output limits. Re-read the operative restart/input/gates, complete correction draft, live protocol/report, closeout, engineered protocol, five-volume/authorization and policy/memory files in smaller bounded commands. Source read coverage remains selected sections where stated, never inferred from downloaded bytes. No claim to have independently re-audited all 767 tests, full graph trajectories, source proofs or five manuscripts.

Authority order: latest explicit researcher authorization → approved restart requirements for unchanged scope → prospective drafts → historical reports. Current-status contains older “active” and memory-prerequisite paragraphs alongside newer completed/superseding statements; they do not establish a current live process. No graph dependency was changed here, so no live-process check or experimental authorization was inferred. Before any future graph work inspect authoritative processes anew.

## Critical checkpoints and unresolved objections

Scoping challenge: selecting a biologically attractive paper could replace the user's reasoning goal. Resolution: compare both candidates, recommend reasoning-first, leave paper scope for explicit adoption. Biological-memory repair is separated from the engineered route.

Mechanism challenge: exact lookup does not transfer values to genuinely new keys. Resolution: prove its conditional miss behavior from source; propose an explicit similarity candidate and all matching retrieval controls. Unresolved: graph features may not place chess consequences close together. Negative transfer on counterfactual near-neighbours is an expected falsifier.

Attribution challenge: shadow-graph lookup baseline cannot establish independence from graph perception. Resolution: distinguish descriptor contribution from online score contribution; add identical-controller raw/random/rewired representations and targeted ablation/restoration. Unresolved: null graphs may alter dynamic range; null validity and normalization must be specified before data.

Measurement challenge: changing 1.8 to 1.0 does not yield the old usable-choice test; linear separability is not equivalent to nonlinear downstream accessibility. Resolution: F04-A defines a scoped synthetic sensitivity statistic; F04-B tests a distinct hybrid directly. Both require approval, and neither retroactively passes the original gate. Remaining objection: synthetic norm sensitivity may be large but task-irrelevant, which is why it is not a learning criterion.

Statistical challenge: one seed and many frames are pseudoreplication. Resolution: game/family clustering and seed-level reporting, explicit distinction between computational and anatomical replication, no fabricated power. Unresolved: three seeds may yield imprecise comparisons; report infeasibility/inconclusiveness rather than automatic scaling.

Novelty/editorial challenge: sparse simulation, episodic lookup, prediction-error learning and visual connectome models already exist. Resolution: propose one causal representation/transfer insight; no first-ever claim. Remaining gap: broader up-to-date competitor/source-code review and an independent scientist's evaluation before submission. A correct null result may still lack enough biological insight for eLife.

Integrity check: all new choices are proposals; historical failures remain; evidence strength and signal delivered are separate; AI drafting disclosed. No animal/human data are proposed to be collected in this document task. No external unpublished data were sent to another agent/provider. All literature searches used public terms.

AI assistance: Codex carried out searches, bounded reading, source inspection and drafting. Same-agent critical checkpoints do not have independent errors. The researcher must verify scientific interpretation and adopt the final question; external independent review remains required for stronger claims.
