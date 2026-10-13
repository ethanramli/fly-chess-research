// Independent post-run audit. Read-only over a completed run; never loads the graph.
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { streamRows } from '../../src/runtime/storage.mjs';
import { auditAssayRecords, loadLastCheckpoint, publishAtomicJson } from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';
import { completePreflight, verifyOneExperience } from './train-bidirectional-plasticity-assay.mjs';

const protocol = JSON.parse(readFileSync('research/data/bidirectional-plasticity-assay-v3/protocol.json', 'utf8'));
const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' },
  'anatomy-report': { type: 'string' } } });

async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk);
  return hash.digest('hex');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!args.run || !args.out || !args['anatomy-report']) {
    console.error('Usage requires --run COMPLETED_RUN_DIR --anatomy-report REPORT --out NEW_AUDIT_JSON.');
    process.exit(2);
  }
  const runDir = resolve(args.run), output = resolve(args.out);
  const outputRelative = relative(runDir, output);
  if (!existsSync(runDir) || existsSync(output) || !outputRelative || (!isAbsolute(outputRelative)
    && outputRelative !== '..' && !outputRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))) {
    console.error('Refused: require an existing completed run and a new audit file outside it.'); process.exit(2);
  }
  const preflight = await completePreflight(protocol, args['anatomy-report']);
  if (!preflight.passed) {
    console.error(JSON.stringify({ refused: true, preflight,
      reason: 'Independent audit requires the same passing frozen-input/certificate/mapping/anatomy preflight as the run.' }, null, 2));
    process.exit(2);
  }
  const checkpoint = loadLastCheckpoint(runDir, protocol.identity);
  if (checkpoint.state.coordinatorState.conditionIndex !== protocol.conditions.length
    || checkpoint.state.pendingReceipt !== null) throw new Error('Run checkpoint is not fully completed/acknowledged');
  const recordsByCondition = {};
  const recordHashes = {};
  for (const condition of protocol.conditions) {
    const path = `${runDir}/${condition}.jsonl`;
    if (!existsSync(path)) throw new Error(`Missing published arm log: ${condition}`);
    recordHashes[condition] = await hashFile(path);
    recordsByCondition[condition] = [];
    for await (const record of streamRows(path)) {
      if (recordsByCondition[condition].length >= protocol.budgets.maxLogEntries)
        throw new Error(`${condition}: JSONL bound exceeded`);
      recordsByCondition[condition].push(record);
    }
  }
  const audit = await auditAssayRecords({ protocol, schedule: protocol.schedule, experiences: protocol.experiences,
    recordsByCondition, verify: verifyOneExperience });
  const report = { schema: 'plasticity-mechanism-assay-independent-audit-v1', protocol: protocol.identity.protocol,
    identity: protocol.identity, runDir, recordHashes, checkpointSequence: checkpoint.manifest.sequence, audit,
    scope: 'Independent static receipt/control audit only; no graph activity or learning claim' };
  publishAtomicJson(output, report);
  console.log(JSON.stringify({ passed: audit.passed, output, checkpointSequence: checkpoint.manifest.sequence,
    arms: audit.arms, gates: audit.gates.gates, scope: report.scope }, null, 2));
}
