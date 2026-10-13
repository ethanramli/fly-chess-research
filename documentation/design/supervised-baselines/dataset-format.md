# Supervised baseline dataset: streaming and split contract

Run the existing command with `--dataset PATH`. The directory must contain `manifest.json`, `train.jsonl` and `validation.jsonl`. The trainer streams the files. Final-test files are not opened by this command.

## Manifest

```json
{
  "encoding": "white-fen-1280-v1",
  "criteria": ["criterion_one", "criterion_two", "criterion_three"],
  "files": {
    "train": {"pairs": 1000, "sha256": "ACTUAL_LOWERCASE_SHA256_OF_TRAIN_FILE"},
    "validation": {"pairs": 200, "sha256": "ACTUAL_LOWERCASE_SHA256_OF_VALIDATION_FILE"}
  }
}
```

Replace counts and hashes with actual values. There must be 1–32 unique nonempty criterion names. Criterion order defines output order. The manifest and accompanying dataset documentation should define every target's perspective, units, normalization, label source and known limitations. The trainer checks dimensions and hashes; it cannot establish whether labels are scientifically valid.

## Rows

Each nonempty JSONL line contains one pair:

```json
{
  "id": "pair-unique-id",
  "group": "source-family-id",
  "split": "train",
  "fenA": "LEGAL_FEN_A",
  "fenB": "LEGAL_FEN_B",
  "targetA": [0.1, -0.2, 0.3],
  "targetB": [0.2, -0.1, 0.0]
}
```

Use `validation` for validation rows. Both target arrays must contain one finite number per criterion. The chess library checks FEN syntax and structure; legal reachability remains a dataset responsibility. Lines are limited to 64 KiB. Every criterion is currently required for every position; missing-label masks are not implemented.

Keep whole source families and duplicate positions out of other splits. The trainer trusts a dataset's split assignment; preparing and independently auditing leakage remains a dataset responsibility. Do not use final-test families for label weighting, sampling, calibration or checkpoint selection.

## Training and resume

```powershell
node --max-old-space-size=256 .codebase/scripts/train-pilot.mjs --dataset data/my-dataset --out runs/my-run --optimizer adam --learning-rate 0.001 --cpu-duty 0.5 --max-pairs 1000
```

`--max-pairs` caps pairs processed in this invocation, and `--epochs` caps epochs completed from the saved cursor. The default pair cap is 72; set it deliberately for a larger dataset. Resume into a new output directory with `--resume runs/my-run/final` and the same dataset, seed, learning rate and algorithm options. Checkpoints bind graph/file hashes, encoding and ordered criterion names. Older checkpoints without schema metadata are accepted only with the original two pilot criteria; resaving adds explicit schema metadata.

For optional `--balance-criteria`, weights come only from training-label variances. Near-constant criteria are rejected for that option. This is a changed training objective, not an automatic improvement in learning.

## Using a saved evaluator

```powershell
node .codebase/scripts/evaluate-position.mjs --checkpoint runs/my-run/final --fen "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
```

The result contains named numeric predictions in the target units. It does not select moves, run search, or establish playing strength. Predictions from the small pilot checkpoints remain weak; use held-out results to decide whether a checkpoint is useful.
