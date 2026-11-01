// Drives three memory rules through seeded random frames and checks sampled gains against [0.2, 1].
import { buildFixture, mulberry32 } from '../../../../.codebase/src/neural-learning/memory-assay-fixture.mjs';
import { createRule, registerRule } from '../../../../.codebase/src/neural-learning/memory-assay-adapters.mjs';
import { register } from '../../../../.codebase/src/neural-learning/memory-assay-rule-local-gated.mjs';

const FRAMES = 20000, SAMPLE_EVERY = 100, EPS = 1e-12, LOW = 0.2, HIGH = 1;
const DAN_LEVELS = [0, 0.375, 0.75, 1.125, 1.5];

register(registerRule);
const fixture = buildFixture({ seed: 1001, q: 0, relation: 'congruent', w: 0, bg: 0 });
const result = { pass: true };

for (const name of ['ReversalMemory', 'AlphaLobeMemory', 'local-gated-v1']) {
  const row = { minGain: Infinity, maxGain: -Infinity, framesDriven: 0, countAboveOne: 0 };
  try {
    const rule = createRule(name, fixture), rng = mulberry32(7), kcH = new Float64Array(fixture.nKC);
    for (let frame = 1; frame <= FRAMES; frame++) {
      for (let i = 0; i < kcH.length; i++) kcH[i] = rng() < 0.1 ? 1.5 * rng() : 0;
      const danP = DAN_LEVELS[Math.floor(rng() * DAN_LEVELS.length)];
      const danR = DAN_LEVELS[Math.floor(rng() * DAN_LEVELS.length)];
      rule.frame({ kcH, danP, danR, dt: 1 });
      row.framesDriven = frame;
      if (frame % SAMPLE_EVERY) continue;
      const { P, R } = rule.gains();
      for (const g of [...P, ...R]) {
        row.minGain = Math.min(row.minGain, g);
        row.maxGain = Math.max(row.maxGain, g);
        if (g > HIGH + EPS) row.countAboveOne++;
      }
    }
  } catch (error) {
    row.error = error.message;
  }
  // Negated comparisons so a NaN gain fails the row.
  row.ok = !row.error && row.minGain >= LOW - EPS && row.maxGain <= HIGH + EPS;
  result[name] = row;
  result.pass = result.pass && row.ok;
}

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
