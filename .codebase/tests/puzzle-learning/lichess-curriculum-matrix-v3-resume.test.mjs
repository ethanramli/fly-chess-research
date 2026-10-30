import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {selectResume} from '../../src/puzzle-learning/lichess-curriculum-matrix-v3.mjs';

// Fake paths and functions only: no checkpoint or directory is read or written.
const LINEAGE='/fake/lineage/1%3Ainformative';
const ATTEMPT='/fake/lineage/1%3Ainformative/attempt-002';
const KEY='1/informative';
const POINTER_8=`${LINEAGE}/attempt-001/stage-checkpoint-008.json.gz`;
const SAVED_BLOCK_8=`${LINEAGE}/attempt-001/block-09/checkpoint-000100.json.gz`;
const POINTER_12=`${LINEAGE}/attempt-001/stage-checkpoint-012.json.gz`;
const SAVED_BLOCK_12=`${LINEAGE}/attempt-001/block-13/checkpoint-000150.json.gz`;
const POINTER_16=`${LINEAGE}/attempt-001/stage-checkpoint-016.json.gz`;
const ATTEMPT_16=`${ATTEMPT}/stage-checkpoint-016.json.gz`;
const ATTEMPT_BLOCK_17=`${ATTEMPT}/block-17/checkpoint-000200.json.gz`;
const LINEAGE_LATEST=`${LINEAGE}/attempt-001/stage-checkpoint-004.json.gz`;

function fakes({present=[],latestByDirectory={},blocks={},blockCheckpoints={}}){
  const calls=[];
  return {
    calls,
    exists:path=>present.includes(path),
    latestCheckpoint:directory=>{calls.push(['latestCheckpoint',directory]);return latestByDirectory[directory]??null;},
    blockResumeCheckpoint:(directory,completed)=>{
      calls.push(['blockResumeCheckpoint',directory,completed]);return blockCheckpoints[`${directory}#${completed}`]??null;},
    completedBlocksOf:path=>blocks[path],
  };
}

function select(f,savedActive){
  return selectResume({savedActive,lineageDir:LINEAGE,exists:f.exists,latestCheckpoint:f.latestCheckpoint,
    blockResumeCheckpoint:f.blockResumeCheckpoint,completedBlocksOf:f.completedBlocksOf});
}

test('(a) saved pointer at block 8 and attempt at block 16: the attempt checkpoint and its block checkpoint win', () => {
  const f=fakes({present:[POINTER_8,SAVED_BLOCK_8],latestByDirectory:{[ATTEMPT]:ATTEMPT_16},
    blocks:{[POINTER_8]:8,[ATTEMPT_16]:16},blockCheckpoints:{[`${ATTEMPT}#16`]:ATTEMPT_BLOCK_17}});
  const picked=select(f,{key:KEY,attempt:ATTEMPT,latestCheckpoint:POINTER_8,latestBlockCheckpoint:SAVED_BLOCK_8});
  assert.deepEqual(picked,{previous:ATTEMPT_16,prefixBlocks:16,previousBlock:ATTEMPT_BLOCK_17});
  assert.deepEqual(f.calls.filter(([name])=>name==='blockResumeCheckpoint'),[['blockResumeCheckpoint',ATTEMPT,16]]);
});

test('(b) saved pointer newer than the attempt (attempt has none): the saved pointer and its saved block checkpoint', () => {
  const f=fakes({present:[POINTER_12,SAVED_BLOCK_12],blocks:{[POINTER_12]:12}});
  const picked=select(f,{key:KEY,attempt:ATTEMPT,latestCheckpoint:POINTER_12,latestBlockCheckpoint:SAVED_BLOCK_12});
  assert.deepEqual(picked,{previous:POINTER_12,prefixBlocks:12,previousBlock:SAVED_BLOCK_12});
  assert.deepEqual(f.calls.filter(([name])=>name==='blockResumeCheckpoint'),[]);
});

test('(c) no saved active state: the lineage directory scan is used with no block checkpoint', () => {
  const f=fakes({latestByDirectory:{[LINEAGE]:LINEAGE_LATEST},blocks:{[LINEAGE_LATEST]:4}});
  const picked=select(f,null);
  assert.deepEqual(picked,{previous:LINEAGE_LATEST,prefixBlocks:4,previousBlock:null});
  assert.deepEqual(f.calls,[['latestCheckpoint',LINEAGE]]);
});

test('(d) saved pointer missing on disk: the attempt checkpoint and its block checkpoint are used', () => {
  const f=fakes({present:[SAVED_BLOCK_8],latestByDirectory:{[ATTEMPT]:ATTEMPT_16},
    blocks:{[ATTEMPT_16]:16},blockCheckpoints:{[`${ATTEMPT}#16`]:ATTEMPT_BLOCK_17}});
  const picked=select(f,{key:KEY,attempt:ATTEMPT,latestCheckpoint:POINTER_8,latestBlockCheckpoint:SAVED_BLOCK_8});
  assert.deepEqual(picked,{previous:ATTEMPT_16,prefixBlocks:16,previousBlock:ATTEMPT_BLOCK_17});
});

test('(e) tie between saved pointer and attempt at block 16: the attempt checkpoint wins', () => {
  const f=fakes({present:[POINTER_16,SAVED_BLOCK_12],latestByDirectory:{[ATTEMPT]:ATTEMPT_16},
    blocks:{[POINTER_16]:16,[ATTEMPT_16]:16},blockCheckpoints:{[`${ATTEMPT}#16`]:ATTEMPT_BLOCK_17}});
  const picked=select(f,{key:KEY,attempt:ATTEMPT,latestCheckpoint:POINTER_16,latestBlockCheckpoint:SAVED_BLOCK_12});
  assert.deepEqual(picked,{previous:ATTEMPT_16,prefixBlocks:16,previousBlock:ATTEMPT_BLOCK_17});
});

test('importing matrix v3 runs nothing and exports the v2 surface plus selectResume', () => {
  const url=new URL('../../src/puzzle-learning/lichess-curriculum-matrix-v3.mjs',import.meta.url).href;
  const run=spawnSync(process.execPath,['--max-old-space-size=256','--input-type=module','-e',
    `const m=await import(${JSON.stringify(url)});console.log(Object.keys(m).sort().join(','));`],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.equal(run.stdout.trim(),'auditLichessCurriculumStageMatrix,runLichessCurriculumStageMatrix,selectResume');
});
