import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node summarize-lichess-capture-retention-strata.mjs INPUT OUTPUT');
for(const [fen,move,expected] of [
  ['r6k/8/8/8/p7/8/8/R6K w - - 0 1','a1a4','open-defender'],
  ['7k/8/8/8/p7/8/8/R6K w - - 0 1','a1a4','absent-defender'],
  ['r6k/8/P7/8/p7/8/8/R6K w - - 0 1','a1a4','blocked-defender'],
  ['1k6/8/1n6/8/p7/8/8/RR5K w - - 0 1','a1a4','pinned-apparent-defender'],
])assert.equal(classifyCaptureRetentionStratum(new Chess(fen),move).stratum,expected);
const source=fs.readFileSync(input),data=JSON.parse(source);
if(data.schema!=='lichess-derived-capture-counterfactual-feasibility-v1'||data.status!=='diagnostic-complete'||!Array.isArray(data.flips))throw new Error('Unexpected or incomplete training-only feasibility report');
const transitions={},puzzlePatterns=new Map(),gamePatterns=new Map(),unknownReasons={};let classified=0,unknown=0;
for(const row of data.flips){
  if(!row.puzzleId||!row.gameId||!row.sourceFen||!row.syntheticFen||!row.unchangedCapture)throw new Error('Incomplete counterfactual provenance');
  const sourceStratum=classifyCaptureRetentionStratum(new Chess(row.sourceFen),row.unchangedCapture);
  const syntheticStratum=classifyCaptureRetentionStratum(new Chess(row.syntheticFen),row.unchangedCapture);
  if(sourceStratum.status!=='classified'||syntheticStratum.status!=='classified'){
    unknown++;const reason=`${sourceStratum.reason??sourceStratum.stratum??'classified'} -> ${syntheticStratum.reason??syntheticStratum.stratum??'classified'}`;
    unknownReasons[reason]=(unknownReasons[reason]??0)+1;continue;
  }
  const relation=`${sourceStratum.stratum} -> ${syntheticStratum.stratum}`;
  transitions[relation]=(transitions[relation]??0)+1;classified++;
  for(const [map,id] of [[puzzlePatterns,row.puzzleId],[gamePatterns,row.gameId]]){
    if(!map.has(id))map.set(id,new Set());map.get(id).add(relation);
  }
}
const patternCount=map=>new Set([...map.values()].map(items=>[...items].sort().join(';'))).size;
const report={
  schema:'lichess-capture-retention-strata-diagnostic-v1',status:'diagnostic-complete',
  input:{path:input,sha256:createHash('sha256').update(source).digest('hex')},
  counts:{sourceRows:data.counts.sourceRows,flipPairs:data.flips.length,classifiedPairs:classified,unknownPairs:unknown,transitionPatterns:transitions,unknownReasons,
    distinctTransitionPatternsAcrossPuzzleRoots:patternCount(puzzlePatterns),distinctTransitionPatternsAcrossSourceGames:patternCount(gamePatterns)},
  scope:'Training-only synthetic-board mechanism diagnostic. Does not restore authentic game history, assign audited relational families, establish disjoint splits, authorize graph learning, or show neural learning or reasoning.',
  semanticFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,validationInspected:false,finalInspected:false,
};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,...report.counts,graphLaunchAuthorized:false,report:output}));
