# Protected reservoirs with an evidence buffer

2026-10-31, before implementation or results. No numerical development-cycle end stop; original failures, thresholds, exposure, seals and graph/chess boundaries remain. This is a structural revision within the metaplastic family, not a parameter sweep.

## What the preceding result identifies

The cascade improves paired A margin after B/C by .032285 but reduces reversal margins by .078954/.090760/.118292. Its efficacy switch from a deep state remains a memoryless event with probability .5 per opportunity. A rare contradiction can switch efficacy directly, while repeated contradictions do not first increase susceptibility. The next test changes that transition structure, not the gate.

## Primary source and scope

Khorsand and Soltani (2017), *Optimal structure of metaplasticity for adaptive learning*, DOI10.1371/journal.pcbi.1005630, [publisher text](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005630). Access2026-10-31: Results on reservoirs/buffers and the one-parameter family; Methods on ordered, symmetric transition matrices; Figure6, especially panel d, visually inspected at full resolution. [Downloaded Figure6](reservoir-source/figure-6.png) is retained with source/CC-BY attribution. Their four-state diagram supplies the transition topology: opposite feedback first shifts a reservoir into its same-efficacy buffer; a subsequent opposite event switches the buffer directly into the opposite reservoir. Consistent feedback moves a buffer into its reservoir. Their probability-estimation results do not validate our correlated own-choice task or visual fly physiology.

Iigaya2016 [publisher text](https://elifesciences.org/articles/18073), Results/Methods on surprise detection, also motivates dynamic susceptibility, but its extra surprise system has no verified project circuit. Do not install an external task-change detector or provide phase labels to the learner.

## Fixed local adaptation

Keep four local masses in the existing order S0(buffer), S1(reservoir), W0(buffer), W1(reservoir), initially S0=1. Visible gain remains .2+.8*(S0+S1). Keep original eligibility, eta=.5 and per-frame probabilities pd/pu from the preceding cascade. No extra parameter, new input, label or readout change.

Simultaneous transfers from the old state:

```
S0' = (1-pd-pu)*S0 + pd*S1
S1' = (1-pd)*S1 + pu*(S0+W0)
W0' = (1-pd-pu)*W0 + pu*W1
W1' = (1-pu)*W1 + pd*(W0+S0)
```

These conserve mass and preserve nonnegativity because pd+pu<=1. A reservoir needs two opportunities to cross efficacy, and a completed switch consolidates directly. This is a deterministic population approximation with at most one transition/frame, not molecular identification or biological-time retention. Shared cells can still carry conflicting evidence; success is uncertain.

## Test fixed before data

Same q=.25/conflicting/w=0/bg=0, twelve original development seeds,144 trials/arm, informative/absent/matched-shuffled/disabled arms, original G1-G6 and declared one-cell shuffled diagnostic. No held-out access. Compare the audited cascade and original zero-coupling ablation without presenting reused controls as fresh independent samples. Failure at any joint gate remains failure.

Reuse the phase-record producer and separate auditor unchanged. Register a versioned adapter/CLI and snapshot every mass. Check transitions against independent Monte Carlo sampling, mass/bounds, actual two-event reservoir response, no-event/disabled behavior, restore/wiring and one-seed all-arm replay before the main experiment. Run npm test after core math. Heap256MiB, RSS2048MiB, free256MiB, duty.5, each main run/audit<=300s. No graph or chess run.
