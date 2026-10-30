// Independently reparse validation-only PGN batches and their published games.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync as read,renameSync,statSync,writeFileSync} from 'node:fs';
import {relative,resolve,isAbsolute} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';

const {values:a}=parseArgs({options:{rows:{type:'string'},manifest:{type:'string'},candidateManifest:{type:'string'},candidateAudit:{type:'string'},source:{type:'string'},out:{type:'string'}}});
assert(a.rows&&a.manifest&&a.candidateManifest&&a.candidateAudit&&a.source&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),sha=b=>createHash('sha256').update(b).digest('hex');
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!isAbsolute(rel)&&!rel.startsWith('..'),'Path escapes workspace');return target;}
function bytes(path,max){path=local(path);assert(statSync(path).size<=max,`Input exceeds ${max} bytes`);return read(path);}
function sourceSplit(id){const raw=createHash('sha256').update(`lichess-game-split-v1:${id}`).digest();return raw.readUInt32BE(0)/0x1_0000_0000<0.8?'train':raw.readUInt32BE(0)/0x1_0000_0000<0.9?'validation':'final';}
const rowsBytes=bytes(a.rows,64*2**20),rows=rowsBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const candidateBytes=bytes(a.candidateManifest,2**20),candidate=JSON.parse(candidateBytes);
const candidateAudit=JSON.parse(bytes(a.candidateAudit,2**20));
const manifestBytes=bytes(a.manifest,8*2**20),manifest=JSON.parse(manifestBytes),source=resolve(a.source);
assert.equal(candidate.schema,'lichess-puzzle-corpus-v2');assert.equal(candidate.outputs?.['validation.jsonl'],sha(rowsBytes));
assert.equal(candidate.counts?.selected?.validation,rows.length);assert.equal(candidate.counts?.selected?.train,0);assert.equal(candidate.counts?.selected?.final,0);
assert.equal(candidateAudit.schema,'lichess-source-candidate-audit-v1');assert.equal(candidateAudit.sourceChecksPassed,true);
assert.equal(candidateAudit.manifestSha256,sha(candidateBytes));assert.equal(candidateAudit.checkedSplits?.train,0);
assert.equal(candidateAudit.checkedSplits?.validation,rows.length);assert.equal(candidateAudit.finalSplitInspected,false);
assert.equal(manifest.schema,'lichess-source-pgn-batches-v1');assert.equal(manifest.split,'validation');
assert.equal(manifest.candidateRowsSha256,sha(rowsBytes));assert.equal(manifest.candidateRowCount,rows.length);
assert.equal(manifest.finalSplitInspected,false);assert.equal(manifest.graphLaunchAuthorized,false);
assert.equal(rows.length,manifest.uniqueGameCount);assert.equal(manifest.uniqueGameCount,manifest.games&&Object.keys(manifest.games).length);
const rowIds=rows.map(row=>row.source?.gameId);assert(rowIds.every(id=>typeof id==='string'&&/^[A-Za-z0-9]{8}$/.test(id)));
assert.equal(new Set(rowIds).size,rowIds.length);assert(rowIds.every(id=>sourceSplit(id)==='validation'));
assert.deepEqual([...rowIds].sort(),[...Object.keys(manifest.games)].sort());
const requested=new Set(),returned=new Set();let batchBytes=0;
for(const [index,call] of manifest.calls.entries()){
  assert.equal(call.index,index);assert(Array.isArray(call.requestedIds)&&call.requestedIds.length>=1&&call.requestedIds.length<=300);
  for(const id of call.requestedIds){assert(!requested.has(id));requested.add(id);}
  const response=bytes(`${a.source}/batch-${String(index).padStart(3,'0')}.response.pgn`,24*2**20);
  assert.equal(response.length,call.responseBytes);assert.equal(sha(response),call.responseSha256);batchBytes+=response.length;
  const text=response.toString('utf8'),starts=[...text.matchAll(/^\[Event\s/gm)].map(match=>match.index);
  assert(starts.length>0&&text.slice(0,starts[0]).trim()==='');
  const observed=[];
  for(let i=0;i<starts.length;i++){
    const block=text.slice(starts[i],starts[i+1]??text.length).trim()+'\n';
    const gameIds=[...block.matchAll(/^\[GameId "([A-Za-z0-9]{8})"\]\s*$/gm)].map(match=>match[1]);
    const sites=[...block.matchAll(/^\[Site "(https:\/\/[^\"]+)"\]\s*$/gm)].map(match=>match[1]);
    assert.equal(gameIds.length,1);assert.equal(sites.length,1);const id=gameIds[0];
    const site=new URL(sites[0]),route=site.pathname.match(/^\/(?:game\/)?([A-Za-z0-9]{8})\/?$/);
    assert.equal(site.hostname,'lichess.org');assert(route&&route[1]===id);assert(call.requestedIds.includes(id));
    assert(!returned.has(id));returned.add(id);observed.push(id);
    const game=bytes(`${a.source}/${id}.pgn`,64*1024);assert.equal(game.toString('utf8'),block);
    assert.equal(sha(game),manifest.games[id]);
  }
  assert.deepEqual([...observed].sort(),[...call.requestedIds].sort());
}
assert.equal(batchBytes,manifest.totalResponseBytes);assert.deepEqual([...requested].sort(),[...rowIds].sort());
assert.deepEqual([...returned].sort(),[...rowIds].sort());
const result={schema:'lichess-validation-source-pgn-audit-v1',passed:true,created:new Date().toISOString(),
  rowsSha256:sha(rowsBytes),candidateManifestSha256:sha(candidateBytes),candidateAuditSha256:sha(bytes(a.candidateAudit,2**20)),
  sourceManifestSha256:sha(manifestBytes),candidateRows:rows.length,uniqueGames:returned.size,batches:manifest.calls.length,
  responseBytes:batchBytes,finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  scope:'Independent batch response, game-ID/Site, per-game byte/hash and validation-split replay; puzzle histories and consequences remain unaudited.'};
const partial=local(a.out)+'.partial';writeFileSync(partial,JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(partial,local(a.out));
console.log(JSON.stringify({passed:true,candidateRows:rows.length,uniqueGames:returned.size,batches:manifest.calls.length,
  finalSplitInspected:false,graphLaunchAuthorized:false}));
