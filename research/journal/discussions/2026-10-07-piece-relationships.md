# Piece usefulness and how long to investigate tactics

2026-10-07, Asia/Jakarta. Researcher discussion; no new simulation result.

The researcher explicitly asked for the model to learn how pieces work together, avoid blunders, and decide how long to investigate forcing lines. They were concerned that the system evaluates every legal move when it need not, or spends too long on forcing lines. Their examples were an underdeveloped knight contributing 1.2 instead of its nominal value of 3, an active attacking knight contributing 4.7, and a passive rook sometimes being worth sacrificing.

These express intended behavior, not fixed target scores. Their suggestion that these abilities suffice for 2000 Elo remains untested. Unfamiliar and counterfactual consequence-sensitive decisions must distinguish learning from handcrafted activity bonuses and engineered search. No externally sourced solution was introduced.

See the [accepted scope](../../../documentation/design/research-goals/piece-relationships-and-selective-investigation.md). Acquisition, contextual assessment, learned investigation allocation and calibrated playing strength remain separate evidence requirements.
