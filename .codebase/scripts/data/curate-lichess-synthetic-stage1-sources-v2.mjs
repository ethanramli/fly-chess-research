// Stream a bounded, reproducible candidate sample from the CC0 Lichess puzzle DB.
// This creates a source corpus only; it does not create teaching labels/certificates.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import os from 'node:os';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';
import {hasMatchedCaptureOutcomes} from '../../src/puzzle-learning/mixed-capture-filter.mjs';

const sourceUrl = 'https://database.lichess.org/';
const columns = ['PuzzleId','FEN','Moves','Rating','RatingDeviation','Popularity','NbPlays','Themes','GameUrl','OpeningTags','DailyDate'];
const { values: args } = parseArgs({ options: {
  input: { type: 'string' }, out: { type: 'string' },
  'extraction-receipt': { type: 'string' },
  'limit-per-split': { type: 'string', default: '128' },
  'min-rating': { type: 'string', default: '0' }, 'max-rating': { type: 'string', default: '5000' },
  'max-pieces': { type: 'string', default: '32' },
  'only-split': {type:'string',default:'all'},
  'require-matched-captures': {type:'boolean',default:false},
  'require-first-solution-capture': {type:'boolean',default:false},
  'prefilter-fraction': {type:'string',default:'1'},
  'max-seconds': { type: 'string', default: '3600' }, 'cpu-duty': { type: 'string', default: '0.5' },
  themes: { type: 'string', default: '' }, seed: { type: 'string', default: '20261008' },
  help: { type: 'boolean', default: false },
} });
if (args.help) {
  console.log('Usage: node --max-old-space-size=256 .codebase/scripts/data/curate-lichess-puzzles.mjs --input verified.csv --out FRESH_DIRECTORY [--extraction-receipt FILE] [--limit-per-split 128] [--max-pieces 32] [--only-split train --require-matched-captures] [--max-seconds 7200] [--cpu-duty 0.5] [--themes THEME] [--seed 20261008]');
  process.exit(0);
}
assert.ok(args.input && args.out, 'Both --input and --out are required');
assert.ok(process.execArgv.includes('--max-old-space-size=256'),'Require registered heap limit');
const inputPath = resolve(args.input), outPath = resolve(args.out);
assert.ok(existsSync(inputPath), `Input file not found: ${inputPath}`);
assert.ok(!existsSync(outPath), 'Output must be a fresh directory');
assert.ok(!inputPath.toLowerCase().endsWith('.zst'),'Extract concatenated Zstandard through the registered Python ZstdFile action first');
const extraction=args['extraction-receipt']?JSON.parse(readFileSync(args['extraction-receipt'],'utf8')):null;
if(extraction){
  assert.equal(extraction.schema,'lichess-archive-extraction-v1');
  assert.equal(extraction.status,'published');assert.equal(resolve(extraction.path),inputPath);
}
const prefilter = Number(args['prefilter-fraction']);
assert(Number.isSafeInteger(prefilter)&&prefilter>=1&&prefilter<=65536,'Invalid prefilter fraction');
const limit = Number(args['limit-per-split']), minRating = Number(args['min-rating']), maxRating = Number(args['max-rating']);
const seed = Number(args.seed);
const maxPieces = Number(args['max-pieces']);
const maxSeconds=Number(args['max-seconds']),cpuDuty=Number(args['cpu-duty']);
assert.ok(Number.isSafeInteger(limit) && limit >= 1 && limit <= 4096);
assert.ok(Number.isFinite(minRating) && Number.isFinite(maxRating) && minRating >= 0 && maxRating >= minRating);
assert.ok(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff);
assert.ok(Number.isSafeInteger(maxPieces) && maxPieces >= 2 && maxPieces <= 32);
assert.ok(Number.isSafeInteger(maxSeconds)&&maxSeconds>=1&&maxSeconds<=7200&&cpuDuty===0.5);
const requiredThemes = args.themes.split(',').map(value => value.trim()).filter(Boolean);
// v2: also selects the sealed final split for blind synthetic-family production.
// Selection stays outcome-blind: split hash plus first-solution capture only.
assert(['all','train','validation','final'].includes(args['only-split']),'Select all or one split');
assert(!args['require-matched-captures']||args['only-split']==='train','Development capture filtering is training-only');
assert(!args['require-first-solution-capture']||args['only-split']!=='all',
  'First-solution filtering must select exactly one split');
const started=performance.now(),cpuStarted=process.cpuUsage();let peakRss=0,lastCpu=process.cpuUsage();
function guard(){
  peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Source preparation memory guard');
  assert(performance.now()-started<=maxSeconds*1000,'Source preparation elapsed bound');
}
const pace=makeCpuDutyPacer(cpuDuty,guard);
async function paceRows(){
  guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();
  await pace((used.user+used.system)/1000);guard();
}
guard();

// Lichess's published schema has no multiline fields. This line parser supports
// escaped quotes and commas and rejects malformed rows instead of shifting columns.
function parseCsvLine(line) {
  // Most Lichess rows contain no quoted fields; the fast path is equivalent
  // for that case, while the full parser below handles commas/escaped quotes.
  if (!line.includes('"')) return line.split(',');
  const fields = []; let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === ',' && !quoted) { fields.push(field); field = ''; }
    else if (char === '"' && field.length === 0) quoted = true;
    else field += char;
  }
  if (quoted) throw Error('Unsupported or malformed multiline/unterminated CSV field');
  fields.push(field);
  return fields;
}

function parseGameRef(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (!['lichess.org','www.lichess.org'].includes(parsed.hostname)) return null;
  const match = parsed.pathname.match(/^\/([A-Za-z0-9]{8})(?:\/(white|black))?\/?$/);
  if (!match) return null;
  const ply = parsed.hash.match(/^#(\d+)$/)?.[1];
  return { gameId: match[1], color: match[2] ?? null, ply: ply ? Number(ply) : null };
}

function playUci(board, text) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(text)) throw Error(`Invalid UCI move: ${text}`);
  const from = text.slice(0,2), to = text.slice(2,4), promotion = text[4];
  const before = board.fen();
  try {
    // chess.js validates this candidate directly; avoid generating SAN for every
    // legal alternative at every source-line ply. Preserve strict UCI suffixes.
    const move = board.move({from,to,promotion});
    if ((move.promotion ?? undefined) !== promotion) throw Error('Promotion mismatch');
  } catch {
    throw Error(`Illegal puzzle-line move ${text} from ${before}`);
  }
}

function prepare(row) {
  const moves = row.Moves.trim().split(/\s+/);
  if (moves.length < 2 || moves.length > 80) throw Error('Solution line outside 2..80 ply bound');
  const board = new Chess(row.FEN);
  playUci(board, moves[0]);
  const solverFen = board.fen(), solverColor = board.turn();
  if(args['require-first-solution-capture']
    &&!board.moves({verbose:true}).some(move=>`${move.from}${move.to}${move.promotion??''}`===moves[1]&&move.captured))return null;
  if(args['require-matched-captures']&&!hasMatchedCaptureOutcomes(board))return null;
  for (const move of moves.slice(1)) playUci(board, move);
  const game = parseGameRef(row.GameUrl);
  if (!game) throw Error('Missing/unrecognized Lichess source-game reference');
  const fenFields = row.FEN.trim().split(/\s+/);
  const activeColor = fenFields[1], fullmoveText = fenFields[5];
  const expectedPly = (Number(fullmoveText) - 1) * 2 + (activeColor === 'w' ? 1 : 2);
  if (game.color && game.color[0] !== activeColor)
    throw Error('Source-game URL orientation does not match the side to move in the source FEN');
  if (game.ply != null && game.ply !== expectedPly)
    throw Error('Source-game URL ply does not match the move counters in the source FEN');
  const themes = row.Themes.split(/\s+/).filter(Boolean);
  if (!/^\d+$/.test(row.Rating) || !/^\d+$/.test(row.RatingDeviation)
    || !/^\d+$/.test(row.NbPlays) || !/^-?\d+$/.test(row.Popularity))
    throw Error('Malformed puzzle metadata');
  return { schema: 'lichess-puzzle-source-row-v1', puzzleId: row.PuzzleId,
    source: { name: 'Lichess Open Database', url: sourceUrl, license: 'CC0-1.0', gameUrl: row.GameUrl,
      gameId: game.gameId, gameColor: game.color, puzzlePly: game.ply },
    history: { status: 'unresolved', fullGamePgnRetrieved: false,
      requirement: 'Fetch and verify the source game PGN before any history-sensitive teaching event.' },
    initialFen: row.FEN, setupMove: moves[0], solverFen, solverColor,
    solutionMoves: moves.slice(1), rating: Number(row.Rating), ratingDeviation: Number(row.RatingDeviation),
    popularity: Number(row.Popularity), plays: Number(row.NbPlays), themes,
    openingTags: row.OpeningTags.split(/\s+/).filter(Boolean), dailyDate: row.DailyDate || null,
    consequence: { status: 'unverified', certificate: null },
    scope: 'Sourced puzzle line and legal replay only. Not a verified consequence, unique-best-move proof, feedback event, or neural training example.' };
}

function splitForGame(gameId) {
  const value = createHash('sha256').update(`lichess-game-split-v1:${gameId}`).digest().readUInt32BE(0) / 0x100000000;
  return value < 0.8 ? 'train' : value < 0.9 ? 'validation' : 'final';
}

function rng(initial) {
  let state = (initial >>> 0) || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; };
}
const buckets = Object.fromEntries(['train','validation','final'].map((name, index) => [name,
  { rows: [], seen: 0, random: rng((seed + index * 0x9e3779b9) >>> 0) }]));
const counts = { sourceRows: 0, metadataMatched: 0, legalLines: 0, rejected: 0, reasons: {} };
const inputHash = createHash('sha256');
const source = createReadStream(inputPath);
source.on('data', chunk => inputHash.update(chunk));
const lines = createInterface({ input: source, crlfDelay: Infinity });
let header = null,linesRead=0;
for await (const line of lines) {
  if(++linesRead%1024===0)await paceRows();
  if(linesRead%1000000===0)console.log(JSON.stringify({progress:'source-scan',linesRead,sourceRows:counts.sourceRows,
    metadataMatched:counts.metadataMatched,legalLines:counts.legalLines,rejected:counts.rejected,
    elapsedSeconds:(performance.now()-started)/1000}));
  if (header === null) {
    header = parseCsvLine(line);
    assert.deepEqual(header, columns, 'Lichess database columns differ from the pinned schema');
    continue;
  }
  if (!line) continue;
  counts.sourceRows++;
  // v2: skip other-split rows before the full CSV parse (about 90% of lines for
  // one split). The authoritative parse below still re-checks the split.
  if(args['only-split']!=='all'){
    const quick=line.match(/https:\/\/(?:www\.)?lichess\.org\/([A-Za-z0-9]{8})/);
    if(quick&&splitForGame(quick[1])!==args['only-split'])continue;
  }
  // Seeded, outcome-blind pre-selection by puzzle ID before the chess.js replay.
  if(prefilter>1&&createHash('sha256').update(`${seed}:${line.slice(0,line.indexOf(','))}`).digest().readUInt32BE(0)
    >=0x100000000/prefilter)continue;
  try {
    const values = parseCsvLine(line);
    if (values.length !== columns.length) throw Error('Wrong CSV field count');
    const row = Object.fromEntries(columns.map((key, index) => [key, values[index]]));
    if(args['only-split']!=='all'){
      const reference=parseGameRef(row.GameUrl);
      if(!reference||splitForGame(reference.gameId)!==args['only-split'])continue;
    }
    if (!row.PuzzleId || Number(row.Rating) < minRating || Number(row.Rating) > maxRating) continue;
    const rowThemes = new Set(row.Themes.split(/\s+/).filter(Boolean));
    if (requiredThemes.some(theme => !rowThemes.has(theme))) continue;
    counts.metadataMatched++;
    // A setup move can capture one piece. Do not discard a 7 -> 6 transition.
    if (row.FEN.split(' ')[0].replace(/[0-9/]/g, '').length > maxPieces + 1) continue;
    const prepared = prepare(row);
    if(!prepared)continue;
    counts.legalLines++;
    if (prepared.solverFen.split(' ')[0].replace(/[0-9/]/g, '').length > maxPieces) continue;
    const bucket = buckets[splitForGame(prepared.source.gameId)]; bucket.seen++;
    if (bucket.rows.length < limit) bucket.rows.push(prepared);
    else { const index = Math.floor(bucket.random() * bucket.seen); if (index < limit) bucket.rows[index] = prepared; }
  } catch (error) {
    counts.rejected++;
    const message = String(error?.message ?? error);
    const reason = message.startsWith('Illegal puzzle-line move') ? 'illegal-puzzle-line'
      : message.startsWith('Invalid UCI move') ? 'invalid-uci-move'
      : message.startsWith('Solution line outside') ? 'solution-line-bound'
      : message.startsWith('Missing/unrecognized') ? 'invalid-source-game-reference'
      : message.startsWith('Source-game URL orientation') ? 'source-orientation-mismatch'
      : message.startsWith('Source-game URL ply') ? 'source-ply-mismatch'
      : message.startsWith('Malformed puzzle metadata') ? 'malformed-metadata'
      : message.startsWith('Wrong CSV field count') ? 'wrong-csv-field-count'
      : 'other-invalid-row';
    counts.reasons[reason] = (counts.reasons[reason] ?? 0) + 1;
  }
}
assert.ok(header, 'Empty source file');
await paceRows();
const inputBytesSha256=inputHash.digest('hex');
if(extraction)assert.equal(inputBytesSha256,extraction.sha256,'Extracted source changed');

// Exact duplicate solver positions cannot cross splits. Drop later copies after
// sampling; source-game grouping already keeps same-game puzzles together.
const positionKeys = new Set(), puzzleIds = new Set();
for (const name of ['train','validation','final']) {
  buckets[name].rows = buckets[name].rows.filter(row => {
    const key = row.solverFen.split(' ').slice(0,4).join(' ');
    if (positionKeys.has(key) || puzzleIds.has(row.puzzleId)) return false;
    positionKeys.add(key); puzzleIds.add(row.puzzleId); return true;
  });
}

mkdirSync(outPath, { recursive: false });
const outputHashes = {};
for (const name of ['train','validation','final']) {
  const body = buckets[name].rows.map(row => JSON.stringify(row)).join('\n') + (buckets[name].rows.length ? '\n' : '');
  const path = join(outPath, `${name}.jsonl`);
  writeFileSync(`${path}.partial`, body, { flag: 'wx' });
  renameSync(`${path}.partial`, path);
  outputHashes[`${name}.jsonl`] = createHash('sha256').update(body).digest('hex');
}
const scriptPath = fileURLToPath(import.meta.url);
const manifest = { schema: 'lichess-puzzle-corpus-v2', createdAt: new Date().toISOString(),
  source: { url: sourceUrl, download: 'lichess_db_puzzle.csv.zst', license: 'CC0-1.0',
    sourcePath: inputPath,inputBytesSha256,compressedBytesSha256:extraction?.archiveSha256??null,
    extractionReceipt:args['extraction-receipt']??null,
    schema: columns, latestSourceUpdateSeenInResearch: '2026-10-05' },
  curator: { scriptPath, scriptSha256: createHash('sha256').update(readFileSync(scriptPath)).digest('hex'),
    node: process.version, seed, limitPerSplit: limit, minRating, maxRating, maxPieces, requiredThemes,
    maxSeconds,cpuDuty,pacerSha256:createHash('sha256').update(readFileSync('.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs')).digest('hex'),
    ...(args['only-split']!=='all'?{onlySplit:args['only-split']}:{}),
    ...(args['require-matched-captures']?{requireMatchedCaptures:true,
      captureFilterScope:'FEN-only source-candidate selection; source history and teaching consequences remain unverified.',
      captureFilterSha256:createHash('sha256').update(readFileSync('.codebase/src/puzzle-learning/mixed-capture-filter.mjs')).digest('hex')}:{}),
    requireFirstSolutionCapture:args['require-first-solution-capture'],prefilterFraction:prefilter,
    prefilterRule:'keep a row only when sha256(seed:PuzzleId) falls in the first 1/prefilterFraction of the hash space',
    split: 'Stable SHA-256 hash of Lichess source game ID: 80% train, 10% validation, 10% final.',
    deduplication: 'Exact post-setup solver FEN across selected rows; source games are assigned to one split.' },
  counts: { ...counts, selected: Object.fromEntries(Object.entries(buckets).map(([name, bucket]) => [name, bucket.rows.length])),
    eligibleBySplitBeforeSampling: Object.fromEntries(Object.entries(buckets).map(([name, bucket]) => [name, bucket.seen])) },
  outputs: outputHashes,
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStarted),
    peakRssMiB:Math.max(peakRss/2**20,process.resourceUsage().maxRSS/1024),maxRssMiB:2048,minFreeMiB:256,heapMiB:256,cpuDuty},
  status: { fullGameHistoryRetrieved: false, consequenceCertificatesCreated: false,
    eligibleForNeuralTeaching: false, finalSplitMustRemainSealedAfterProtocolFreeze: true },
  limits: ['Puzzle solution lines are source suggestions, not independently checked consequences or proof of a unique best move.',
    'FEN omits repetition history. Retrieve the linked source game PGN and verify the puzzle FEN before any history-sensitive use.',
    'Rating, popularity and themes organize sampling; they are not calibrated move-quality feedback.'] };
const manifestPath = join(outPath, 'manifest.json'), partialPath = `${manifestPath}.partial`;
writeFileSync(partialPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
renameSync(partialPath, manifestPath);
console.log(JSON.stringify({ sourceRows: counts.sourceRows, legalLines: counts.legalLines,
  selected: manifest.counts.selected, output: outPath, neuralTeachingEligible: false }));
