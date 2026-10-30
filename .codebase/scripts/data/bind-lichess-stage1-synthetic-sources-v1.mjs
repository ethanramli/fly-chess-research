// Bind curated Lichess puzzle rows to their fetched source-game PGNs. Output rows
// carry only the verified history binding used by the synthetic family producer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {bindLichessCsvHistory} from '../../src/puzzle-learning/lichess-history.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function main(){
  const {values:args}=parseArgs({options:{rows:{type:'string'},games:{type:'string'},split:{type:'string'},out:{type:'string'}}});
  assert(args.rows&&args.games&&args.out&&['train','validation','final'].includes(args.split),
    'Usage: --rows CANDIDATES.jsonl --games PGN_DIR --split train|validation|final --out ROWS.jsonl');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with --max-old-space-size=256');
  const out=resolve(args.out);assert(!existsSync(out),'Preserve existing output');
  const rowsBytes=readFileSync(args.rows),pgnManifest=JSON.parse(readFileSync(join(args.games,'manifest.json'),'utf8'));
  assert.equal(pgnManifest.split,args.split,'PGN batch belongs to another split');
  assert.equal(pgnManifest.candidateRowsSha256,sha256(rowsBytes),'PGN batch was fetched for other candidate rows');
  const lines=[],reasons={};
  for(const line of rowsBytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
    const row=JSON.parse(line),gameId=row.source?.gameId,path=join(args.games,`${gameId}.pgn`);
    try{
      assert(existsSync(path),'source PGN missing');
      const pgn=readFileSync(path);
      assert.equal(sha256(pgn),pgnManifest.games[gameId],'source PGN differs from its fetch manifest');
      lines.push(JSON.stringify({split:args.split,history:bindLichessCsvHistory(row,{gameId,pgn:pgn.toString('utf8')})}));
    }catch(error){const reason=String(error.message).split('\n')[0].slice(0,80);reasons[reason]=(reasons[reason]??0)+1;}
  }
  const text=lines.join('\n')+(lines.length?'\n':'');
  const partial=out+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,out);
  process.stdout.write(JSON.stringify({split:args.split,bound:lines.length,rejected:reasons,
    rowsSha256:sha256(Buffer.from(text)),candidateRowsSha256:sha256(rowsBytes)})+'\n');
  return lines.length?0:1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main();
