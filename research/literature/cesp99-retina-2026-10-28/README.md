# cesp99 / Carlo Esposito: fly-chess retina (photoreceptor-to-square map)

Accessed 2026-10-28 (Asia/Jakarta) at the researcher's request ("I want to use this, and cite him"). The files in this folder are verbatim copies from commit `3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf` (branch master, the same commit as the 2026-10-07 review); `manifest.jsonl` lists each file's path, SHA-256 and source URL. The code is MIT licensed, © 2026 Carlo Esposito ([LICENSE](LICENSE)); the licence notice must accompany any copy or substantial portion.

## How to cite

- **Software:** Esposito, C. (2026). *fly-chess: the FlyWire connectome as a chess-playing network* [Computer software, MIT License]. GitHub, https://github.com/cesp99/fly-chess, commit 3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf. Retina design: `docs/RETINA.md`.
- **Graph artifact we use:** Esposito, C. (2026). fly-chess graph `graph/full.npz`, Hugging Face https://huggingface.co/cesp99/fly-chess, revision cad733198a14d76a35149ecbe5f68bc6efa97732 (SHA-256 4d63295f...abe2). Derived from FlyWire data, CC BY-NC 4.0.
- **Underlying data, cited as he cites them:**
  - Matsliah, A. *et al.* (2024). Neuronal parts list and wiring diagram for a visual system. *Nature* 634, 166-180. doi:10.1038/s41586-024-07981-1 (optic-lobe column assignment);
  - Dorkenwald, S. *et al.* (2024). *Nature* 634, 124-138. doi:10.1038/s41586-024-07558-y (FlyWire connectome);
  - Schlegel, P. *et al.* (2024). *Nature* 634, 139-152. doi:10.1038/s41586-024-07686-5 (cell types).

## What we take, and what we do not

- **Taken:** his anatomical photoreceptor-to-square placement. It is already stored in our pinned graph `.cache/full.npz` as `retina_idx`, `retina_square`, `retina_uv`, `retina_type` and `retina_eye` (5,543 photoreceptors: R1-6 4,141, R7 654, R8 748; left eye files a-d, right eye e-h; weighted binning; 67-107 photoreceptors per square). Checked 2026-10-28: the per-square counts equal his RETINA.md table exactly. No new data download is needed.
- **Not taken:** his learned `w_ret` and `W_in` projections, homeostatic gain calibration, policy and value heads, and supervised or self-play training. Those are fitted by backpropagation, which the FlyChess endogenous-learning boundary excludes. Any board-to-photoreceptor drive we use must be a fixed, declared rendering (an engineering choice), not trained.

## Planned use (not yet an experiment)

This is the eye route of the input v3 candidate (goal file weakness map, Perception row). The first step is a read-only graph check after smoke r14's audit: render the board onto the photoreceptors with a fixed rule, propagate through the pinned graph, and measure whether board-specific activity reaches the KCs. Only if it does, run the surrogate overlap and transfer checks against cue v2. Any claim must state that the board-to-photoreceptor rendering is engineered.

Addendum 2026-10-31: the fixed rendering now exists as [Eyes v1](../../../documentation/design/chess-input/eyes-v1.md). It uses the stored placement and his mirror-when-Black-moves convention. It has not run on the full graph.
