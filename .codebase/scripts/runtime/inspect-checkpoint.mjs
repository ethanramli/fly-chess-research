// Compact metadata bridge for Python tooling; never prints neural state or receipts.
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

const path = process.argv[2];
if (!path || process.argv.length !== 3 || /\.partial|\.tmp$/.test(path)
  || statSync(path).size > 16 * 2 ** 20) throw Error('Require one bounded complete checkpoint');
const bytes = readFileSync(path), state = decodeCheckpoint(bytes);
console.log(JSON.stringify({path: resolve(path), sha256: createHash('sha256').update(bytes).digest('hex'),
  protocolHash: state.identity?.protocolHash,
  ...Object.fromEntries(['sequence', 'receiptCount', 'stage', 'lesson', 'logBytes', 'chainHash'].map(k => [k, state[k] ?? null])),
  pendingReceipt: state.pendingReceipt != null,
  scope: 'Parsed publication only; runner and independent recovery audit must verify continuity'}));
