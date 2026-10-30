// Guard for the D4 acceptance channel: does a value function vary in sign and order moves like the learner's score?
// Diagnostic only; it does not alter any run, checkpoint or gate.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { provisionalMBONValue } from '../../src/search-and-feedback/stockfish-target.mjs';

const SCHEMA = 'd4-value-channel-check-v1';
const MIN_ORDER_AGREEMENT = 0.95;

export function checkValueChannel(rows, valueFn) {
  let boards = 0, rowCount = 0, positive = 0, negative = 0, zeroOrNull = 0, boardsWithMixedSign = 0;
  let agreeing = 0, usablePairs = 0;
  for (const board of rows) {
    boards++;
    const values = board.map(row => valueFn(row));
    rowCount += board.length;
    let boardPos = false, boardNeg = false;
    for (const v of values) {
      if (v === null || v === undefined || v === 0) zeroOrNull++;
      else if (v > 0) { positive++; boardPos = true; }
      else { negative++; boardNeg = true; }
    }
    if (boardPos && boardNeg) boardsWithMixedSign++;
    // Pairs with a null/zero value are usable (score differs) and count as disagreement, so they cannot inflate agreement.
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        const scoreDiff = board[i].score - board[j].score;
        if (scoreDiff === 0) continue;
        usablePairs++;
        const vi = values[i], vj = values[j];
        const valueDiff = (vi === null || vi === undefined || vj === null || vj === undefined) ? 0 : vi - vj;
        if (Math.sign(valueDiff) === Math.sign(scoreDiff)) agreeing++;
      }
    }
  }
  const constantSign = !(positive > 0 && negative > 0);
  const orderAgreement = usablePairs === 0 ? null : agreeing / usablePairs;
  const pass = !constantSign && orderAgreement !== null && orderAgreement >= MIN_ORDER_AGREEMENT;
  return { schema: SCHEMA, boards, rows: rowCount, positive, negative, zeroOrNull, constantSign,
    boardsWithMixedSign, orderAgreement, pass };
}

function usage(message) {
  console.error(`${message}\nUsage: node check-d4-value-channel.mjs RECEIPTS_JSONL [RECEIPTS_JSONL ...] [--channel provisional|score] [--json]`);
  return 2;
}

async function readBoards(file, boards) {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let lineNo = 0;
  for await (const line of lines) {
    lineNo++;
    if (!line.trim()) continue;
    let value;
    try { value = JSON.parse(line).value; } catch (error) { throw Error(`${file}:${lineNo} is not valid JSON: ${error.message}`); }
    const assessment = value?.assessment?.rows;
    const rootRows = value?.receipt?.result?.rootAssessment?.rows;
    if (Array.isArray(assessment)) boards.push(assessment);
    if (Array.isArray(rootRows)) boards.push(rootRows);
  }
}

export async function main(argv) {
  const files = [];
  let channel = 'provisional', json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--channel') {
      channel = argv[++i];
      if (!['provisional', 'score'].includes(channel)) return usage(`Unknown --channel: ${channel}`);
    } else if (arg.startsWith('--')) return usage(`Unknown option: ${arg}`);
    else files.push(arg);
  }
  if (files.length === 0) return usage('No receipts file given.');
  const valueFn = channel === 'score' ? row => row.score : row => provisionalMBONValue(row);
  const boards = [];
  try {
    for (const file of files) await readBoards(file, boards);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  let result;
  try {
    result = { ...checkValueChannel(boards, valueFn), channel, files };
  } catch (error) {
    console.error(`Invalid input: ${error.message}`);
    return 2;
  }
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`D4 value channel check (${channel}): ${result.pass ? 'PASS' : 'FAIL'}`);
    console.log(`boards=${result.boards} rows=${result.rows} positive=${result.positive} negative=${result.negative} zeroOrNull=${result.zeroOrNull}`);
    console.log(`constantSign=${result.constantSign} boardsWithMixedSign=${result.boardsWithMixedSign} orderAgreement=${result.orderAgreement}`);
  }
  return result.pass ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
