import assert from 'node:assert/strict';
export async function measureDosePersistence({memory,learned,initial,assess}){
 const batch=async snapshot=>{memory.restore(snapshot);const before=memory.snapshot(),panels=await assess();assert.deepEqual(memory.snapshot(),before,'Measurement changed lasting memory');return panels;};
 const after=await batch(learned),repeat=await batch(learned),reset=await batch(initial),restored=await batch(learned);
 assert.deepEqual(repeat.map(x=>x.assessment),after.map(x=>x.assessment));
 assert.deepEqual(restored.map(x=>x.assessment),after.map(x=>x.assessment));
 return {panels:after,repeat,reset,restored};
}
