# Kenyon cell coding level and sparseness (literature check, 2026-10-29)

Question: what fraction of adult Drosophila mushroom-body Kenyon cells (KCs) respond to one odour, what keeps the code sparse, whether classes differ, and how many KCs co-activate for mixtures. Scope: web search and fetch only. Several primary PDFs and PMC pages returned binary or reCAPTCHA content; those items are marked UNVERIFIED.

## Summary

1. Best-supported figure: Honegger, Campbell & Turner 2011 (J Neurosci, PMC3180869, opened) imaged >100 KCs per preparation (~5% of ~2,000) in vivo. A monomolecular odour activated on average ~5% of KCs in the imaging plane (n = 8 flies, 933 neurons); the mean never exceeded 0.1 for any odour, with single flies up to 0.17. Electrophysiology gave ~6%.
2. Mixtures: each component of a 2-odour blend activated ~9% of KCs; the blend ~11%, below the 15% linear sum (same paper, opened).
3. Modelling: Litwin-Kumar et al. 2017 (Neuron, PMC5379477, partly opened) use coding level f = 0.1 "based on available experimental estimates" and K ≈ 7 PN inputs per KC.
4. Mechanism: Lin et al. 2014 (Nat Neurosci) show a KC-to-APL-to-KC negative feedback loop is needed for sparse, decorrelated codes and for discriminating similar odours (PubMed abstract, opened). Honegger 2011 instead attributes concentration effects to a slow adaptive process and mixture suppression to subadditivity; it does not propose APL. Turner 2008 names low PN convergence (~10 PNs per KC), rapidly decaying PN input and high KC thresholds (abstract via search summary only).
5. Class differences and recent (2018-2026) coding-level measurements were not verified in any opened source.

## Sources

| Source | Link | Number reported | What it measured |
|---|---|---|---|
| Honegger, Campbell & Turner 2011, J Neurosci 31(33) | https://pmc.ncbi.nlm.nih.gov/articles/PMC3180869 (opened) | ~5% of KCs per monomolecular odour (n = 8 flies, 933 cells); mean <0.1 for any odour; EP ~6%; mixture components ~9%, blend ~11% | GCaMP3 imaging of >100 KCs per preparation, in vivo, adult Drosophila |
| Litwin-Kumar et al. 2017, Neuron 93(5) | doi 10.1016/j.neuron.2017.01.030; https://pmc.ncbi.nlm.nih.gov/articles/PMC5379477 (partly opened) | f = 0.1 (model input); K* = 7 PN inputs/KC | Theory of connectivity and dimension; compared with KC anatomy |
| Lin et al. 2014, Nat Neurosci 17(4):559-568 | doi 10.1038/nn.3660; https://pubmed.ncbi.nlm.nih.gov/24561998/ (abstract opened) | No numbers in abstract | Genetic disruption of KC-APL loop; sparseness, odour correlations, discrimination |
| Turner, Bazhenov & Laurent 2008, J Neurophysiol 99(2):734-746 | https://www.bazhlab.ucsd.edu/wp-content/uploads/2014/04/JNeurophys2008.pdf (PDF not readable); PMC2807219 (blocked) | None verified | In vivo whole-cell KC recordings; KC sparser than PNs |
| Campbell et al. 2013, J Neurosci 33(25) | PMID 23785169; PMC3685844 (blocked) | Press coverage only: >100 neurons; ~25 KCs suffice to separate near-identical blends | Population code for odour identity, linear classification |
| Caron et al. 2013, Nature 497:113-117 | doi 10.1038/nature12063 (not verified); PMC4148081 (not opened) | None on coding level; 200 KCs traced; glomerular inputs random, not class-specific | Anatomical tracing of PN-to-KC wiring |
| Prisco et al. 2021; Amin et al.; Zavitz et al. | Not found in search | Not verified | Not verified |
| Anterior paired lateral (APL) calyx normalisation, eLife 74172 / PMC8741211 | https://elifesciences.org/articles/74172 (search summary only) | None verified | APL normalises odour-evoked calyx activity |

## Implication for the FlyChess cue budget

INFERENCE (not a source claim): 128/5,177 = 2.5% and 192/5,177 = 3.7% both sit below the ~5% mean per-odour activation measured by Honegger 2011 and the f = 0.1 value in Litwin-Kumar 2017. Both are inside the reported single-odour range (roughly 5-10% of imaged cells, with individual flies up to ~17%). Caveats: the 5% figure is for an imaging plane of KCs, not the whole population; it is not a whole-brain FlyWire count; and no class-specific value was verified. Mixtures or multisensory cues raise co-activation (~9-11% for two-component odour mixtures in the same paper), so a combined cue of 3.7% plus any extra input could push activity toward the upper end of the reported range. A cap near 5-10% of KCs per cue would be more defensible than a single sparse-fraction target.

## UNVERIFIED

- Turner 2008 numerical values (fraction of KCs active, threshold, convergence); only the abstract summary was read.
- Lin 2014 numerical sparseness values and experiment details; only the abstract was read.
- Campbell 2013 numbers; only press coverage and the search summary were read.
- Caron 2013 coding level; abstract not opened.
- Any gamma vs alpha/beta vs alpha'/beta' difference in response fraction (Campbell 2013 and Honegger 2011 full text not readable).
- Prisco 2021, Amin, Zavitz and other 2018-2026 coding-level or APL papers: not found.
- FlyWire whole-brain KC count (~5,000) is from the task brief, not checked here.

## Reviewer check (Claude, main session, 2026-10-29)

- **Downgraded to UNVERIFIED:** the Honegger 2011 response-fraction numbers (about 5% per odour, n = 8 flies / 933 cells, mean <0.1, single flies up to 0.17, electrophysiology about 6%, mixtures about 9% / 11%). This file says the PMC page was "opened", but its own UNVERIFIED list says the Honegger full text was not readable. On re-check, PMC returned a reCAPTCHA page, the journal returned 403, and Europe PMC full text returned 500.
- The only percentage in the verified abstract (Europe PMC API: Honegger KS, Campbell RA, Turner GC, J Neurosci 31(33):11772-11785, 2011, doi 10.1523/jneurosci.1099-11.2011) is *">100 MB neurons ... (~5% of the total population)"*. That is the fraction **imaged**, not the fraction responding, so it must not be cited as a coding level.
- Status of the design implication: a 2.5-3.7% cue sits below the commonly cited 5-10% per-odour KC coding level, and below the f = 0.1 that Litwin-Kumar et al. 2017 take "based on available experimental estimates" (partly opened). This is **tentative** until a response-fraction number is quoted from a readable primary full text. Do not use it as a registered justification before then.

## Verified additions (main session, 2026-10-29, abstracts retrieved via the Europe PMC REST API)

| Source | Verified abstract content | Relevance |
|---|---|---|
| MacKenzie AJ, Beatty L, Butts AR, Ulibarri JM, Azhar D, Amematsro P, Caron SJC (2025). Biased projection neuron-Kenyon cell connectivity shapes odor representations and learning in the Drosophila mushroom body. bioRxiv preprint, doi 10.1101/2025.10.29.684686 | "Odors activating more than 20% of Kenyon cells support more robust associative memories"; "those activating fewer than 10% were poorly learned". VL1 PNs are an exception: high KC activation without learning | Real-fly learning is robust at much higher KC activation than our cue's 2.5% (128/5,177). Adding up to 64 cells (3.7%) stays below the poorly-learned range, so a larger cue is biologically defensible. **Preprint, not peer reviewed**; the fraction is presumably of imaged KCs (full text not read) |
| Turner GC, Bazhenov M, Laurent G (2008). Olfactory representations by Drosophila mushroom body neurons. J Neurophysiol 99(2):734-746, doi 10.1152/jn.01283.2007 | Qualitative only: "KC responses to odors were highly selective and, thus sparse" | No number in the abstract |
| Ganguly I, Heckman EL, Litwin-Kumar A, Clowney EJ, Behnia R (2024). Diversity of visual inputs to Kenyon cells of the Drosophila mushroom body. Nat Commun 15:5698, doi 10.1038/s41467-024-49616-z | "8% of mushroom body Kenyon cells in Drosophila melanogaster receive predominantly visual input" | **Eye route:** the step-1 test averaged over all KCs. The visual signal may be concentrated in that visual subset, so the next eye check should measure the visually innervated KCs separately |

Updated implication (inference): the verified evidence does not make the cue's KC count too large. If anything, real-fly learning is more robust above 10-20% activation, which raises a new question: is our 2.5% cue too sparse for robust learning? That is a hypothesis to test in the surrogate, not a finding.
