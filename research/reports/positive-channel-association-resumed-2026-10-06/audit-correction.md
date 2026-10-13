# Audit signed-zero correction

The initial independent audit stopped at its DAN-mean check: JSON serializes negative zero as zero, while strict assertion distinguishes their sign. Changed only that equality to mathematical numeric equality, which still rejects unequal finite modulation values. Raw experiments, plasticity, protocols and gates are unchanged. Initial error: `AssertionError: actual 0, expected -0`, audit-positive-channel.mjs line 90. No successful audit file was written before this correction.
