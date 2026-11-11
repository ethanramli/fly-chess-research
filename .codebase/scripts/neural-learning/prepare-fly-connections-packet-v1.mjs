#!/usr/bin/env node
// Prepares a fly-connections-packet-v1 from a JSON config: frozen group membership, first eligible board per game,
// board-key and rendered-input collision checks, seeded tapes, and a before/terminal manifest.
// Graph-free: the graph file is opened only by loadRetina. No propagation, no run after preparation.
// Usage (from repo root): node .codebase/scripts/neural-learning/prepare-fly-connections-packet-v1.mjs --config PATH [--cpu-duty 1]
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { BOARD_SCHEMA, CAPTURE_CRITERION, GROUPS, PACKET_SCHEMA, R_CRITERION, TASK, TIE_RULE, buildBoardRecord, buildExperienceTape } from '../../src/neural-learning/fly-connections-packet-v1.mjs';

const SHA = /^[0-9a-f]{64}$/;
const sha256Text = text => createHash('sha256').update(text).digest('hex');
const fileSha256 = path => new Promise((done, fail) => {
  const h = createHash('sha256');
  createReadStream(path).on('data', chunk => h.update(chunk)).on('error', fail).on('end', () => done(h.digest('hex')));
});
const writeAtomic = (path, text) => { writeFileSync(`${path}.partial`, text); renameSync(`${path}.partial`, path); };
async function* lines(path) { yield* createInterface({ input: createReadStream(path), crlfDelay: Infinity }); }
// Answer used for collision labels: chess outcome, or the R phase pattern (the R switch is phase-specific).
const answerOf = (record, move) => (record.group === 'R'
  ? `${move === record.rTargets[0]}|${move === record.rTargets[1]}`
  : String(record.outcomes[move]));

export function parseArgs(argv) {
  const out = { config: null, cpuDuty: '1' };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    if (value === undefined) throw Error(`${flag} needs a value`);
    if (flag === '--config') out.config = value;
    else if (flag === '--cpu-duty') out.cpuDuty = value;
    else throw Error(`Unknown argument ${flag}`);
  }
  if (!out.config) throw Error('--config PATH is required');
  if (out.cpuDuty !== '1') throw Error('--cpu-duty must be 1: this preparation runs no graph propagation');
  return out;
}

// Config shape: see the packet-prep documentation in the final report. Throws on the first violation.
export function validateConfig(config) {
  const fail = message => { throw Error(`config: ${message}`); };
  if (!['development', 'confirmation'].includes(config.purpose)) fail('purpose must be development or confirmation');
  if (config.sealed !== (config.purpose === 'confirmation')) fail('sealed must be true for confirmation and false for development');
  if (config.purpose === 'confirmation' && !(config.exclusions?.sources?.length > 0)) fail('confirmation needs new-source exclusion inputs in exclusions.sources');
  for (const key of ['run', 'positions', 'pgn', 'graph']) if (typeof config.paths?.[key] !== 'string') fail(`paths.${key} is required`);
  for (const key of ['positions', 'pgn', 'graph']) if (!SHA.test(config.pins?.[key] ?? '')) fail(`pins.${key} must be a sha256`);
  if (existsSync(resolve(config.paths.run))) fail('paths.run must be a fresh directory');
  const ids = [];
  for (const group of GROUPS) {
    const list = config.groupGameIds?.[group];
    if (!Array.isArray(list)) fail(`groupGameIds.${group} must be an array`);
    ids.push(...list);
    const want = config.desiredCounts?.[group];
    if (!Number.isSafeInteger(want) || want < 0 || list.length < want) fail(`desiredCounts.${group} must be an integer no larger than its game list`);
    if (['A', 'B', 'R'].includes(group) && want < 1) fail(`desiredCounts.${group} must be at least 1`);
  }
  if (new Set(ids).size !== ids.length) fail('groupGameIds must be disjoint and unique');
  if (!Array.isArray(config.seeds) || !config.seeds.length || !config.seeds.every(Number.isSafeInteger)) fail('seeds must be integers');
  return config;
}

async function checkPins(inputs, pins, when) {
  for (const key of Object.keys(inputs)) {
    const actual = await fileSha256(inputs[key]);
    if (actual !== pins[key]) throw Error(`${key} hash ${when} run is ${actual}, pinned ${pins[key]}`);
  }
}

// Streams the source PGN and keeps only the text of wanted games.
export async function readGames(path, wanted) {
  const games = new Map();
  let text = null;
  const flush = () => {
    if (text === null) return;
    const id = /^\[GameId "([^"]+)"\]/m.exec(text)?.[1];
    if (id && wanted.has(id)) {
      if (games.has(id)) throw Error(`source PGN repeats game ${id}`);
      games.set(id, `${text.trim()}\n`); // drop the blank separator line that follows each game
    }
  };
  for await (const line of lines(path)) {
    if (line.startsWith('[Event ')) { flush(); text = ''; }
    if (text !== null) text += `${line}\n`;
  }
  flush();
  return games;
}

async function run(config, paths, eyes, note) {
  const inputs = { positions: paths.positions, pgn: paths.pgn, graph: paths.graph };
  await checkPins(inputs, config.pins, 'before');
  const excludedGames = new Set(config.exclusions?.gameIds ?? []);
  const excludedBoards = new Set(config.exclusions?.boardIds ?? []);
  for (const source of config.exclusions?.sources ?? []) {
    const path = resolve(source.path);
    if (await fileSha256(path) !== source.sha256) throw Error(`exclusion source hash mismatch: ${source.path}`);
    for await (const line of lines(path)) if (line.trim()) excludedGames.add(JSON.parse(line).gameId);
  }
  const groupOf = new Map(GROUPS.flatMap(g => config.groupGameIds[g].map(id => [id, g])));
  const games = await readGames(paths.pgn, new Set(groupOf.keys()));
  for (const id of groupOf.keys()) if (!excludedGames.has(id) && !games.has(id)) throw Error(`source PGN has no game ${id}`);

  const want = config.desiredCounts;
  const selected = Object.fromEntries(GROUPS.map(g => [g, []]));
  const usedGames = new Set(), boardKeys = new Map(), inputOwner = new Map(), tally = {};
  const exclude = (group, row, reason, detail) => {
    tally[reason] = (tally[reason] ?? 0) + 1;
    note({ type: 'excluded', group, gameId: row.gameId, boardId: `${row.gameId}:${row.ply}`, reason, ...(detail ? { detail } : {}) });
  };
  for await (const line of lines(paths.positions)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const group = groupOf.get(row.gameId);
    if (!group || selected[group].length >= want[group] || usedGames.has(row.gameId)) continue;
    if (excludedGames.has(row.gameId) || excludedBoards.has(`${row.gameId}:${row.ply}`)) { exclude(group, row, 'prior-exclusion'); continue; }
    const result = buildBoardRecord(row, { group, pgn: games.get(row.gameId), eyes });
    if (result.schema !== BOARD_SCHEMA) { exclude(group, row, result.reason, result.unknownMoves ? { unknownMoves: result.unknownMoves } : undefined); continue; }
    const key = result.fen.split(' ').slice(0, 4).join(' ');
    if (boardKeys.has(key)) { exclude(group, row, 'board-key-collision', { other: boardKeys.get(key) }); continue; }
    const clashes = Object.entries(result.inputHashes).flatMap(([move, hash]) => {
      const owner = inputOwner.get(hash);
      return owner && owner.boardId !== result.boardId
        ? [{ move, other: owner.boardId, group: owner.group, answersAgree: owner.answer === answerOf(result, move) }] : [];
    });
    if (clashes.length) {
      exclude(group, row, clashes.some(c => !c.answersAgree) ? 'contradictory-rendered-input' : 'rendered-input-collision', { clashes });
      continue;
    }
    selected[group].push(result);
    usedGames.add(row.gameId);
    boardKeys.set(key, result.boardId);
    for (const [move, hash] of Object.entries(result.inputHashes)) {
      if (!inputOwner.has(hash)) inputOwner.set(hash, { boardId: result.boardId, group, answer: answerOf(result, move) });
    }
    note({ type: 'selected', group, gameId: row.gameId, boardId: result.boardId, legal: result.legal.length });
  }

  const counts = Object.fromEntries(GROUPS.map(g => [g, selected[g].length]));
  const shortfall = GROUPS.filter(g => counts[g] < want[g]);
  const summary = { schema: 'fly-connections-packet-prep-summary-v1', purpose: config.purpose,
    status: shortfall.length ? 'incomplete' : 'complete', counts, desired: want, shortfall, exclusions: tally };
  if (shortfall.length) return summary;

  const boardsText = GROUPS.flatMap(g => selected[g].map(r => JSON.stringify(r))).join('\n') + '\n';
  writeAtomic(join(paths.run, 'boards.jsonl'), boardsText);
  mkdirSync(join(paths.run, 'tapes'));
  const tapes = {};
  for (const seed of config.seeds) {
    const tape = buildExperienceTape(selected, seed);
    const text = JSON.stringify(tape);
    writeAtomic(join(paths.run, 'tapes', `${seed}.json`), text);
    tapes[seed] = { path: `tapes/${seed}.json`, fileSha256: sha256Text(text), sha256: tape.sha256, counts: tape.counts };
  }
  await checkPins(inputs, config.pins, 'after');
  const packet = {
    schema: PACKET_SCHEMA, purpose: config.purpose,
    sealedScope: { sealed: config.sealed, scope: config.purpose === 'confirmation'
      ? 'sealed confirmation packet; registration and independent review required before any neural use'
      : 'development packet; not confirmation evidence' },
    eyesIdentity: eyes.identity,
    groups: Object.fromEntries(GROUPS.map(g => [g, { count: counts[g], gameIds: selected[g].map(r => r.gameId), boardIds: selected[g].map(r => r.boardId) }])),
    groupAssignmentSha256: sha256Text(JSON.stringify(config.groupGameIds)),
    boards: { path: 'boards.jsonl', sha256: sha256Text(boardsText) },
    tapes,
    sourcePins: { positions: { path: paths.positions, sha256: config.pins.positions }, pgn: { path: paths.pgn, sha256: config.pins.pgn },
      graph: { path: paths.graph, sha256: config.pins.graph } },
    criterion: { capture: CAPTURE_CRITERION, R: R_CRITERION, task: TASK },
    tie: TIE_RULE,
    rSwitch: selected.R.map(r => ({ boardId: r.boardId, rTargets: r.rTargets, inputHashes: r.rTargets.map(m => r.inputHashes[m]) })),
    exclusions: { tally, sources: config.exclusions?.sources ?? [] },
  };
  writeAtomic(join(paths.run, 'packet.json'), JSON.stringify(packet, null, 2));
  return { ...summary, packetSha256: sha256Text(JSON.stringify(packet)) };
}

// Opens the graph only through loadRetina. eyesFrom is injectable so tests can supply synthetic Eyes.
export async function prepare(configPath, { eyesFrom = graphPath => createEyesV2(loadRetina(graphPath)) } = {}) {
  const configText = readFileSync(configPath, 'utf8');
  const config = validateConfig(JSON.parse(configText));
  const paths = Object.fromEntries(Object.entries(config.paths).map(([k, v]) => [k, resolve(v)]));
  mkdirSync(paths.run, { recursive: true });
  const manifestPath = join(paths.run, 'manifest.json');
  const manifest = { status: 'running', pid: process.pid, argv: process.argv, startedAt: new Date().toISOString(),
    volume: 2, chapter: 3, purpose: config.purpose, configSha256: sha256Text(configText), pins: config.pins, paths, cpuDuty: 1 };
  writeAtomic(manifestPath, JSON.stringify(manifest, null, 2));
  const records = join(paths.run, 'records.jsonl');
  writeFileSync(records, '');
  const note = entry => appendFileSync(records, `${JSON.stringify(entry)}\n`);
  try {
    const summary = await run(config, paths, eyesFrom(paths.graph), note);
    writeAtomic(join(paths.run, 'summary.json'), JSON.stringify(summary, null, 2));
    writeAtomic(manifestPath, JSON.stringify({ ...manifest, status: summary.status === 'complete' ? 'complete' : 'failed',
      endedAt: new Date().toISOString(), reason: summary.status === 'complete' ? null : `shortfall: ${summary.shortfall.join(',')}` }, null, 2));
    return summary;
  } catch (error) {
    writeAtomic(manifestPath, JSON.stringify({ ...manifest, status: 'failed', endedAt: new Date().toISOString(), error: error.message }, null, 2));
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  prepare(parseArgs(process.argv.slice(2)).config).then(summary => {
    console.log(JSON.stringify({ status: summary.status, counts: summary.counts, exclusions: summary.exclusions }));
    if (summary.status !== 'complete') process.exitCode = 1;
  }, error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
