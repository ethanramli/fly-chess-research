# 2026-10-07 bound-ray activity screen

The static train/validation input audit established that the bound-ray cue preserves distinct slider/blocker relation tokens within the fixed cue budget. I then ran a frozen read-only full-connectome comparison against relational v3. The protocol uses the same graph initialization and MBON readout for both encoders and reads only the 8 training and 4 validation panels. The old v3 final family was not opened.

The independent replay audit reproduces every readout exactly. All 246 selected bound-ray relation-token entries show positive endpoint KC excess, and every candidate cue changes the fixed MBON score. However, pretraining choice remains weak: v3 ranks 4/8 training and 3/4 validation pairs correctly; bound-ray ranks 4/8 and 2/4. Bound-ray chooses a1a4 on every training panel. This suggests the relation reaches active cells but is not converted into a reliable consequence-sensitive ranking by the current untrained readout. It does not establish that plastic learning can or cannot fix that bridge.

No reinforcement was delivered, no gain or fixed parameter changed, and no Monte Carlo search occurred. This is not learning or transfer. Next, test the same cue and rule with one verified-feedback pass and absent, shuffled, and disabled controls; treat the existing validation set as development-only and prepare a fresh final family before any transfer claim.

See the [frozen protocol and audited result](../../../archive/early-development/research/reports/bound-ray-activity-probe-v1-2026-10-07/README.md).
