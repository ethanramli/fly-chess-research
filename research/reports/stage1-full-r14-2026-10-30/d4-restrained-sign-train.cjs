const fs=require('fs'),path=require('path');
const rootOf=lin=>lin.startsWith('r3')?'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001':'runs/lichess-stage1-synthetic-v1-full-r14';
for(const lin of ['r1%3Ainformative','r2%3Ainformative','r3%3Ainformative','r1%3Adisabled','r2%3Adisabled','r3%3Adisabled']){
  for(const blocks of [['block-01'],['block-30','block-31','block-32']]){
    let n=0,rPos=0,rNeg=0,sPos=0,sNeg=0,boards=0,boardsMixedR=0,boardsMixedS=0;
    for(const b of blocks){const f=path.join(rootOf(lin),lin,'attempt-001',b,'receipts.jsonl');
      for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const o=JSON.parse(line);const rows=o.value?.assessment?.rows;if(!rows)continue;boards++;
        let rp=0,rn=0,sp=0,sn=0;for(const r of rows){n++;const rv=r.MBON12-r.MBON01;rv>0?rPos++:rNeg++;rv>0?rp++:rn++;r.score>0?sPos++:sNeg++;r.score>0?sp++:sn++}
        if(rp&&rn)boardsMixedR++;if(sp&&sn)boardsMixedS++;}}
    console.log(lin,blocks.join('+'),{rows:n,boards,restrainedPos:rPos,restrainedNeg:rNeg,boardsWithMixedRestrainedSign:boardsMixedR,scorePos:sPos,scoreNeg:sNeg,boardsWithMixedScoreSign:boardsMixedS});
  }
}
