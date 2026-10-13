// Numerical falsification assay only: no released neurons or graph learning.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

const out = process.argv[process.argv.indexOf('--out') + 1];
if (!process.argv.includes('--out') || !out) throw Error('Required --out NEW_DIRECTORY');
await mkdir(out); // Refuse overwriting an earlier run.
const sha = value => createHash('sha256').update(value).digest('hex');
const design = await readFile('documentation/design/puzzle-learning/verified-consequence-lessons.md');
const source = await readFile(new URL(import.meta.url));
const protocol = { schema: 'selective-credit-prerequisite-v1', scope: 'synthetic local equation; NOT anatomical or chess-learning evidence',
  eta: 0.5, tau: 1, dt: 1, delay: 1, minimumGain: 0.2, cycles: 32, pulsesPerPhase: 8,
  reversalMargin: 0.05, recoveryGate: 'gain must increase after reward omission on the previously depressed edge',
  controls: ['informative', 'no-channel', 'matched-shuffled', 'disabled-plasticity'],
  shuffle: 'fixed four-event permutation [1,3,0,2] per acquisition/reversal pair; preserves channel counts and magnitudes; anti-correlated degenerate two-cue schedule, not a general shuffle assay',
  designSha256: sha(design), sourceSha256: sha(source), limitations: ['synthetic rates, not measured graph activity', 'no sequence receiver', 'no biological timing', 'no transfer test'] };
await writeFile(`${out}/protocol.json`, JSON.stringify(protocol, null, 2));
await writeFile(`${out}/design-before-test.md`, design);
await writeFile(`${out}/assay-source.mjs`, source);
const started = performance.now();
const task = { objective: 'capture-retention', plies: 1 };
const experiences = ['6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1', '6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1'].map(fen => {
  const board = new Chess(fen), proof = certifyCaptureRetention(board, 'a1a4');
  return { ...verifiedExperience(board, 'a1a4', task, proof), proof, fen, task };
});
await writeFile(`${out}/certified-contexts.json`, JSON.stringify(experiences, null, 2));
// Two abstract opponent channels. Semantic channel assignment is stipulated,
// never presented as a verified PAM/PPL identity or a measured neural readout.
const update = (gain, eligibility, rate) => protocol.minimumGain + (gain - protocol.minimumGain)
  * Math.exp(-protocol.eta * eligibility * rate * protocol.dt);
const tag = (1 - Math.exp(-protocol.dt / protocol.tau)) * Math.exp(-protocol.delay / protocol.tau);
const summaries = [], records = [];
for (const arm of protocol.controls) {
  const gains = [[1, 1], [1, 1]], margins = [];
  for (let cycle = 0; cycle < protocol.cycles; cycle++) {
    // Contingency reversal here is an abstract association assay. It does not
    // relabel the fixed chess certificates, which remain separate provenance checks.
    const schedule = [0, 1, 1, 0];
    const delivered = arm === 'matched-shuffled' ? [schedule[1], schedule[3], schedule[0], schedule[2]] : schedule;
    for (let phase = 0; phase < 2; phase++) {
      for (let pulse = 0; pulse < protocol.pulsesPerPhase; pulse++) {
        for (let cue = 0; cue < 2; cue++) {
          const channel = delivered[phase * 2 + cue], before = gains[cue][channel];
          if (arm !== 'disabled-plasticity') gains[cue][channel] = update(before, tag, arm === 'no-channel' ? 0 : 1);
          records.push({ arm, cycle, phase, pulse, cue, expectedChannel: schedule[phase * 2 + cue], channel,
            eligibility: tag, before, after: gains[cue][channel] });
        }
      }
      const phaseMargins = gains.map((g, cue) => (schedule[phase * 2 + cue] === 0 ? 1 : -1) * (g[1] - g[0]));
      margins.push({ cycle, phase, margins: phaseMargins, pass: phaseMargins.every(m => m >= protocol.reversalMargin) });
    }
  }
  const beforeOmission = gains[0][0], afterOmission = update(beforeOmission, tag, 0);
  summaries.push({ arm, gains, firstAcquisition: margins[0], firstReversal: margins[1], lastReversal: margins.at(-1),
    passedPhases: margins.filter(m => m.pass).length, totalPhases: margins.length,
    recovery: { beforeOmission, afterOmission, pass: afterOmission > beforeOmission },
    inactiveEdgeUnchanged: update(1, 0, 1) === 1 });
}
await writeFile(`${out}/events.jsonl`, records.map(r => JSON.stringify(r)).join('\n') + '\n');
const result = { protocolSha256: sha(JSON.stringify(protocol)), summaries, events: records.length,
  elapsedSeconds: (performance.now() - started) / 1000, peakRssMiB: process.resourceUsage().maxRSS / 1024,
  verdict: 'REJECT complete receiver claim: no omission recovery; repeated opposite conditioning saturates the stipulated readout',
  graphPresentations: 0, certifiedContexts: experiences.map(e => e.status), biologicalValidation: false };
await writeFile(`${out}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
