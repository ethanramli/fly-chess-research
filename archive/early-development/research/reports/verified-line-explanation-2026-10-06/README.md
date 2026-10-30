# Verified line explanations: teacher-only examples

[Raw report](report.json) includes five-node success and 22-node failure certificates, independently replay-checked before explanations are produced. Source hashes and copies in `source/` preserve the run. These are composed engineering examples used in tests, not held-out transfer data. No graph, fly inference, neural teaching or learning ran.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-verified-lines.mjs --out research/reports/verified-line-explanation-2026-10-06
```

The supported-king position verifies `Rf8+ Rxf8 Qxh7#`, with a temporary five-unit material concession. The changed king support prevents that move from forcing mate at the same horizon. The positive position has another immediate mating option; neither necessity nor unique-best-play is claimed. Fixed material units describe an illustrative checked branch and are not physiological reward units or a strategic neural assessment.

All 75 tests pass, including both actor perspectives, unknown and forged-certificate rejection. Initial handwritten compositions were illegal because pawns attacked the white king; rules checks caught them before evidence generation. The [design](../../../documentation/design/search-and-feedback/line-explanations.md) records corrections, scope and unfinished learning integration.
