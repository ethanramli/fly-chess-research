import test from 'node:test';
import assert from 'node:assert/strict';
import { localActivityDiagnostic } from '../../src/neural-learning/local-activity-diagnostic.mjs';
test('diagnostic preserves neural arrays and distinguishes repeated edge entries from unique neurons',()=>{
 const h=Float32Array.from([3,0,5]),rest=Float32Array.from([1,1,1]);const before=[...h];
 const result=localActivityDiagnostic({model:{h:[h],steps:0},rest,activityScale:2,mapping:{groups:[{danType:'fixture',edges:[0,1,2],kc:[0,0,1],dan:[{index:2,rootId:'fixture'}]}]}});
 assert.deepEqual(result[0].kc,[1,1,0]);assert.equal(result[0].activeEdgeAssociatedKCEntries,2);assert.equal(result[0].uniqueActiveKCNeurons,1);assert.equal(result[0].meanDANExcess,2);assert.deepEqual([...h],before);assert.deepEqual([...rest],[1,1,1]);
});
