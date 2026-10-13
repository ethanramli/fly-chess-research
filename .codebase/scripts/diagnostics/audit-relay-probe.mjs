// Independent record checks: does not import the probe runner or model kernel.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
const root = 'research/reports/relay-probe-2026-10-05';
const report = JSON.parse(readFileSync(`${root}/report.json`));
const resumed = JSON.parse(readFileSync('research/reports/relay-probe-resumed-2026-10-05/report.json'));
const protocol = JSON.parse(readFileSync('research/data/relay-probe-v1/protocol.json'));
const anatomy = JSON.parse(readFileSync('research/reports/instinct-design-2026-10-05/anatomy-with-relay.json'));
const g = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const checks = [];
function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); }
for (const [path, hash] of Object.entries(report.identity.inputs)) check(`input hash: ${path}`, await sha256(path) === hash);
for (const [path, hash] of Object.entries(report.identity.sources)) check(`source hash: ${path}`, await sha256(path) === hash);
check('root identity for every readout', report.cells.every(c => ids[c.index]?.toString() === c.rootId));
check('all requested types present', protocol.readTypes.every(t => report.cells.some(c => c.type === t)));
const expected = ['rest'];
for (const type of protocol.individualStimulusTypes) for (const c of report.cells.filter(c => c.type === type).sort((a, b) => a.index - b.index)) for (const current of protocol.currents) expected.push(`${type}/${c.rootId}/${current}`);
for (const type of protocol.groupStimulusTypes) for (const current of protocol.currents) expected.push(`${type}/all/${current}`);
if (protocol.includeDirectGFControl) for (const current of protocol.currents) expected.push(`GF/direct-control/${current}`);
check('completed frozen schedule', report.complete && report.totalProbes === expected.length && report.observations.length === expected.length && report.nextProbe === expected.length);
const observed = report.observations.map((o, i) => i === 0 ? o.stimulus.group : `${o.stimulus.group}/${o.stimulus.current}`);
check('every mapped stimulus and dose in order', JSON.stringify(observed) === JSON.stringify(expected));
check('stimulus indices match named populations', report.observations.every((o, i) => {
  if (i === 0) return o.stimulus.current === 0 && o.stimulus.indices.length === 0;
  const [type, name] = o.stimulus.group.split('/');
  const selected = report.cells.filter(c => c.type === type && (name === 'all' || name === 'direct-control' || c.rootId === name)).map(c => c.index).sort((a, b) => a - b);
  return selected.length > 0 && JSON.stringify([...o.stimulus.indices].sort((a, b) => a - b)) === JSON.stringify(selected);
}));
check('readout identity, finite response and exact rest subtraction', report.observations.every(o => o.cells.length === report.cells.length && o.cells.every((c, i) => c.rootId === report.cells[i].rootId && Number.isFinite(c.response) && c.deltaFromRest === c.response - report.observations[0].cells[i].response)));
for (const e of anatomy.candidateRelay.edges.filter(e => e.fromType === 'MBON12' && e.toType === 'PAM02')) {
  const receiver = report.cells.find(c => c.rootId === e.to), sender = report.cells.find(c => c.rootId === e.from);
  check(`existing relay edge ${e.edgeIndex}`, receiver && sender && e.edgeIndex >= g.row[receiver.index] && e.edgeIndex < g.row[receiver.index + 1] && g.col[e.edgeIndex] === sender.index && g.sign[e.edgeIndex] === e.fixedSign && g.initial[e.edgeIndex] === e.anatomicalCount);
}
check('recorded fixed-state checks hold in both invocations', report.allParametersAndGraphPreserved && resumed.allParametersAndGraphPreserved);
check('exact final checkpoint after interrupted prefix', readFileSync(`${root}/probe-034/state.json`, 'utf8') === readFileSync('research/reports/relay-probe-resumed-2026-10-05/probe-034/state.json', 'utf8'));
const output = { allChecksPassed: checks.every(c => c.passed), checks,
  reportSHA256: await sha256(`${root}/report.json`), resumedReportSHA256: await sha256('research/reports/relay-probe-resumed-2026-10-05/report.json'),
  scope: 'Record/identity/CSR-edge/replay consistency; no independent physiological or learning validation' };
const path = args.out ?? `${root}/audit.json`;
if (existsSync(path)) throw Error('Audit exists; preserve original');
writeFileSync(path, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(output));
if (!output.allChecksPassed) process.exitCode = 2;
