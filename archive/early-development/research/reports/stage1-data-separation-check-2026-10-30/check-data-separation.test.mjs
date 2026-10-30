import assert from 'node:assert/strict';
import test from 'node:test';
import {boardKeys,duplicateBoards,exactKey,pairStats,placementKey,sharedKeys,symmetryKey} from './check-data-separation.mjs';

// Synthetic positions only. MIRROR is the horizontal mirror of BASE; FLIP is its colour flip.
const BASE='4k3/8/8/8/8/8/3P4/4K3 w - - 0 1';
const MIRROR='3k4/8/8/8/8/8/4P3/3K4 w - - 0 1';
const FLIP='4k3/3p4/8/8/8/8/8/4K3 b - - 0 1';
const OTHER='4k3/8/8/8/8/8/2P5/4K3 w - - 0 1';

test('horizontal mirror shares a symmetry key only when castling is absent', ()=>{
  assert.equal(symmetryKey(BASE),symmetryKey(MIRROR));
  assert.notEqual(symmetryKey('4k3/8/8/8/8/8/3P4/R3K3 w Q - 0 1'),symmetryKey('3k4/8/8/8/8/8/4P3/3K3R w K - 0 1'));
});

test('colour flip shares a symmetry key', ()=>{
  assert.equal(symmetryKey(BASE),symmetryKey(FLIP));
});

test('different positions do not share a symmetry key', ()=>{
  assert.notEqual(symmetryKey(BASE),symmetryKey(OTHER));
});

test('exact key drops clocks and placementOnly keeps placement alone', ()=>{
  assert.equal(exactKey(BASE),'4k3/8/8/8/8/8/3P4/4K3 w - -');
  assert.equal(placementKey(BASE),'4k3/8/8/8/8/8/3P4/4K3');
});

test('exactWithHistory separates identical positions reached by different move lists', ()=>{
  const plain=boardKeys(BASE,[]),played=boardKeys(BASE,['e4']);
  assert.equal(plain.exact,played.exact);
  assert.notEqual(plain.exactWithHistory,played.exactWithHistory);
});

test('duplicateBoards counts boards whose key repeats within a split', ()=>{
  assert.equal(duplicateBoards(['a','b','a','c']),2);
  assert.equal(duplicateBoards(['a','b']),0);
});

test('sharedKeys reports distinct shared keys and boards on each side', ()=>{
  assert.deepEqual(sharedKeys(['a','a','b'],['a','c']),{sharedKeys:1,leftBoards:2,rightBoards:1});
});

test('a pair repeated under two pairIds counts once, and reversed order counts once', ()=>{
  const exactByPanel=new Map([['A','x'],['B','y']]);
  const repeated=[{pairId:'p1',firstPanelId:'A',secondPanelId:'B'},{pairId:'p2',firstPanelId:'A',secondPanelId:'B'}];
  const stats=pairStats(repeated,exactByPanel,2);
  assert.equal(stats.pairs,2);
  assert.equal(stats.distinctPairIds,2);
  assert.equal(stats.distinctUnorderedPanelPairs,1);
  assert.equal(stats.distinctUnorderedBoardPairsByExact,1);
  assert.equal(stats.distinctPanelsCovered,2);
  assert.equal(stats.panelsInMultiplePairs,2);
  const reversed=[{pairId:'p1',firstPanelId:'A',secondPanelId:'B'},{pairId:'p2',firstPanelId:'B',secondPanelId:'A'}];
  assert.equal(pairStats(reversed,exactByPanel,2).distinctUnorderedPanelPairs,1);
});

test('a pair whose panel is not bound is reported as unresolved', ()=>{
  const exactByPanel=new Map([['A','x'],['B','y']]);
  assert.equal(pairStats([{pairId:'p1',firstPanelId:'A',secondPanelId:'Q'}],exactByPanel,2).unresolvedPairs,1);
});
