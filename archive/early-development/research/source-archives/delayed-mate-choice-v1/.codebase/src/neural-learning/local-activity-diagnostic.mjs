// Read-only endpoint diagnostic matching the current replay activity convention.
// KC arrays are edge-associated entries and can repeat neuron identities.
export function localActivityDiagnostic({model,mapping,rest,activityScale}){
 if(!Number.isFinite(activityScale)||activityScale<=0)throw Error('Invalid activity scale');
 const h=model.h[model.steps];
 const excess=index=>{const value=(h[index]-rest[index])/activityScale;if(!Number.isFinite(value))throw Error('Nonfinite diagnostic activity');return Math.max(0,value);};
 return mapping.groups.map(g=>{
  const kc=g.kc.map(excess),dan=g.dan.map(c=>({rootId:c.rootId,index:c.index,excess:excess(c.index)}));
  return {danType:g.danType,edges:[...g.edges],kcIndices:[...g.kc],kc,dan,activeEdgeAssociatedKCEntries:kc.filter(x=>x>0).length,uniqueActiveKCNeurons:new Set(g.kc.filter((index,i)=>kc[i]>0)).size,meanDANExcess:dan.reduce((s,x)=>s+x.excess,0)/dan.length,scope:'Endpoint evoked activity only; not natural physiology, eligibility over a delay, learning or causal influence.'};
 });
}
