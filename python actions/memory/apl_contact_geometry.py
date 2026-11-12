"""Sparse, exact nearest-segment attachment; no neural propagation or learning."""
import argparse
import csv
import hashlib
import heapq
import json
import math
import os
from pathlib import Path
import sys
import struct
import time

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'runs/memory-retention-2026-11-01'
REPORT=ROOT/'research/reports/apl-locality-feasibility-2026-11-01'
APLS={'720575940613583001':'right','720575940624547622':'left'}
SKELETON_HASHES={'720575940613583001':'7c4257602da0b3cda3c23192ffb26f70623bb5a84dd3919ec44dc10e9fb7bcfc','720575940624547622':'8d7822018308ffa96361171d2eab49909f9611142197712d5a23da1925e82399'}


def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()


def atomic(p,x):
    q=p.with_suffix(p.suffix+'.partial');q.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8');q.replace(p)


class Skeleton:
    def __init__(self,vertices,edges):
        self.v=np.asarray(vertices,dtype=np.float64);self.e=np.asarray(edges,dtype=np.int32)
        assert len(self.e)==len(self.v)-1 and np.isfinite(self.v).all()
        assert self.e.min()>=0 and self.e.max()<len(self.v)
        self.a=self.v[self.e[:,0]];self.d=self.v[self.e[:,1]]-self.a
        self.den=np.sum(self.d*self.d,axis=1);self.length=np.sqrt(self.den)
        lo=np.minimum(self.a,self.a+self.d);hi=np.maximum(self.a,self.a+self.d);mid=(lo+hi)/2
        self.nodes=[]
        def build(indices):
            lower=lo[indices].min(axis=0);upper=hi[indices].max(axis=0);index=len(self.nodes);self.nodes.append(None)
            if len(indices)<=16:self.nodes[index]=(tuple(lower),tuple(upper),-1,-1,indices.copy())
            else:
                axis=int(np.argmax(upper-lower));half=len(indices)//2;partition=indices[np.argpartition(mid[indices,axis],half)]
                left,right=build(partition[:half]),build(partition[half:]);self.nodes[index]=(tuple(lower),tuple(upper),left,right,None)
            return index
        build(np.arange(len(self.e),dtype=np.int32))
        src=np.concatenate([self.e[:,0],self.e[:,1]]);dst=np.concatenate([self.e[:,1],self.e[:,0]])
        ids=np.concatenate([np.arange(len(self.e)),np.arange(len(self.e))]);order=np.argsort(src,kind='stable')
        ptr=np.concatenate([[0],np.cumsum(np.bincount(src,minlength=len(self.v)))]);dst=dst[order];ids=ids[order]
        self.parent=np.full(len(self.v),-2,dtype=np.int32);self.level=np.zeros(len(self.v),dtype=np.int32);self.depth=np.zeros(len(self.v))
        self.parent[0]=-1;stack=[0];visited=0
        while stack:
            u=stack.pop();visited+=1
            for j in range(int(ptr[u]),int(ptr[u+1])):
                v=int(dst[j])
                if v==self.parent[u]:continue
                assert self.parent[v]==-2,'Skeleton cycle'
                self.parent[v]=u;self.level[v]=self.level[u]+1;self.depth[v]=self.depth[u]+self.length[ids[j]];stack.append(v)
        assert visited==len(self.v),'Disconnected skeleton'
    @classmethod
    def read(cls,path):
        raw=path.read_bytes();n,m=struct.unpack_from('<II',raw)
        assert len(raw)==8+16*n+8*m
        vertices=np.frombuffer(raw,dtype='<f4',count=3*n,offset=8).reshape(n,3)
        edges=np.frombuffer(raw,dtype='<u4',count=2*m,offset=8+12*n).reshape(m,2)
        return cls(vertices,edges)
    @staticmethod
    def box_distance(point,lower,upper):
        result=0.
        for x,lo,hi in zip(point,lower,upper,strict=True):
            d=lo-x if x<lo else x-hi if x>hi else 0.;result+=d*d
        return result
    def project(self,point):
        point=np.asarray(point,dtype=np.float64);assert point.shape==(3,) and np.isfinite(point).all()
        queue=[(self.box_distance(point,*self.nodes[0][:2]),0)];best=math.inf;best_edge=-1;best_t=0.
        while queue:
            lower,index=heapq.heappop(queue)
            if lower>best:break
            lo,hi,left,right,indices=self.nodes[index]
            if indices is None:
                for child in [left,right]:
                    bound=self.box_distance(point,*self.nodes[child][:2])
                    if bound<=best:heapq.heappush(queue,(bound,child))
            else:
                numerator=np.sum((point-self.a[indices])*self.d[indices],axis=1)
                t=np.clip(np.divide(numerator,self.den[indices],out=np.zeros(len(indices)),where=self.den[indices]>0),0,1)
                delta=point-self.a[indices]-t[:,None]*self.d[indices];distance=np.sum(delta*delta,axis=1)
                j=int(np.argmin(distance));edge=int(indices[j]);value=float(distance[j])
                if value<best or value==best and edge<best_edge:best,best_edge,best_t=value,edge,float(t[j])
        assert best_edge>=0
        return best_edge,best_t,math.sqrt(best)
    def vertex_distance(self,a,b):
        total=self.depth[a]+self.depth[b]
        while self.level[a]>self.level[b]:a=int(self.parent[a])
        while self.level[b]>self.level[a]:b=int(self.parent[b])
        while a!=b:a,b=int(self.parent[a]),int(self.parent[b])
        return float(max(0,total-2*self.depth[a]))
    def path(self,one,two):
        e,t,_=one;f,u,_=two
        if e==f:return abs(t-u)*self.length[e]
        a,b=map(int,self.e[e]);c,d=map(int,self.e[f]);le,lf=self.length[e],self.length[f]
        return min(t*le+u*lf+self.vertex_distance(a,c),t*le+(1-u)*lf+self.vertex_distance(a,d),
                   (1-t)*le+u*lf+self.vertex_distance(b,c),(1-t)*le+(1-u)*lf+self.vertex_distance(b,d))


def self_test():
    rng=np.random.default_rng(174);vertices=rng.normal(size=(65,3))*100;vertices[1]=vertices[0]
    vertices[-2]=[-10000,0,0];vertices[-1]=[10000,0,0]
    edges=np.array([[i,i+1] for i in range(64)]);tree=Skeleton(vertices,edges)
    for point in [np.array([0.,1.,0.]),*rng.normal(size=(40,3))*250]:
        expected=math.inf
        for a,b in edges:
            start,end=vertices[a].tolist(),vertices[b].tolist();direction=[y-x for x,y in zip(start,end)]
            length=sum(x*x for x in direction);t=max(0,min(1,sum((x-y)*d for x,y,d in zip(point,start,direction))/length)) if length else 0
            expected=min(expected,sum((x-(y+t*d))**2 for x,y,d in zip(point,start,direction)))
        assert abs(tree.project(point)[2]**2-expected)<=1e-7
    chain=Skeleton([[0,0,0],[1,0,0],[2,0,0]],[[0,1],[1,2]])
    assert abs(chain.path((0,.5,0),(1,.25,0))-.75)<1e-12
    print(json.dumps({'status':'self-test-passed','bruteForcePoints':41,'pathChecks':1}))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path);parser.add_argument('--self-test',action='store_true');parser.add_argument('--cpu-duty',default='0.5');args=parser.parse_args()
    if args.self_test:self_test();return 0
    assert args.out and args.cpu_duty=='0.5';out=args.out.resolve();assert out.is_relative_to(ROOT) and not out.exists()
    subset=BASE/'apl-contact-subset-v3';canonical=BASE/'apl-point-semantics-v1/result.json'
    manifest=json.loads((subset/'manifest.json').read_text());data=json.loads((subset/'result.json').read_text());comparison=json.loads(canonical.read_text())
    assert manifest['status']==comparison['status']=='complete' and data['countCompatibility']
    assert manifest['contactsSha256']==sha(subset/'contacts.csv') and data['selectedRows']==215419
    point_manifest=BASE/'apl-point-semantics-v1/manifest.json';assert json.loads(point_manifest.read_text())['resultSha256']==sha(canonical)
    files=[subset/'manifest.json',subset/'result.json',subset/'contacts.csv',canonical,point_manifest,Path(__file__),REPORT/'contact-attachment-spec.md',ROOT/'python actions/curriculum.py']
    skeletons={root:REPORT/f'source-evidence/apl-{side}-{root}.precomputed' for root,side in APLS.items()};files+=list(skeletons.values())
    for root,path in skeletons.items():assert sha(path)==SKELETON_HASHES[root]
    pins={p.relative_to(ROOT).as_posix():sha(p) for p in files};started=time.monotonic();cpu_started=time.process_time();resources=[]
    def guard(measure=False):
        assert time.monotonic()-started<=600,'Elapsed guard'
        if measure:
            observed=curriculum.inventory();own=next(p for p in observed['processes'] if p['pid']==os.getpid())
            assert own['workingSetMiB']<=2048 and observed['freeMiB']>=256,'Memory guard';resources.append({'rssMiB':own['workingSetMiB'],'freeMiB':observed['freeMiB']})
    def pace():
        delay=(time.process_time()-cpu_started)/.5-(time.monotonic()-started)
        while delay>0:
            time.sleep(min(.1,delay));guard();delay=(time.process_time()-cpu_started)/.5-(time.monotonic()-started)
        guard()
    guard(True);out.mkdir(parents=True);m={'schema':'apl-contact-attachment-v1','status':'running','pins':pins,'limits':{'wallSeconds':600,'rssMiB':2048,'freeMiB':256,'cpuDuty':.5},'graphPasses':0};atomic(out/'manifest.json',m)
    try:
        trees={root:Skeleton.read(path) for root,path in skeletons.items()};guard(True)
        wanted={row for r in comparison['records'] for row in r['matchedSourceRows']['midpoint']};projections={};residuals={root:[] for root in APLS};count=0
        with (subset/'contacts.csv').open(newline='') as stream,(out/'projections.csv').open('x',newline='',encoding='utf-8') as target:
            writer=csv.writer(target);writer.writerow(['source_row','pre_root_id','post_root_id','apl_root','skeleton_edge','fraction','residual_nm'])
            for r in csv.DictReader(stream):
                root=r['pre_root_id'] if r['pre_root_id'] in APLS else r['post_root_id'];assert root in trees
                result=trees[root].project([float(r[k]) for k in 'xyz']);source_row=int(r['source_row']);count+=1;residuals[root].append(result[2])
                writer.writerow([source_row,r['pre_root_id'],r['post_root_id'],root,*result])
                if source_row in wanted:projections[source_row]=result
                if count%128==0:pace()
                if count%8192==0:guard(True);atomic(out/'progress.json',{'contacts':count,'total':215419,'elapsedSeconds':time.monotonic()-started})
        assert count==215419 and set(projections)==wanted
        sample=[]
        for r in comparison['records']:
            root=r['preRoot'] if r['direction']=='APL-to-KC' else r['postRoot'];tree=trees[root]
            side=r['canonicalPointsNm']['pre' if r['direction']=='APL-to-KC' else 'post'];side_projection=tree.project(side)
            for row in r['matchedSourceRows']['midpoint']:
                sample.append({'synapseId':r['synapseId'],'sourceRow':row,'aplRoot':root,'direction':r['direction'],'midpointProjection':projections[row],
                               'aplSideProjection':side_projection,'cablePathDifferenceNm':float(tree.path(projections[row],side_projection)),'euclideanSideOffsetNm':r['endpointSeparationNm']/2})
        def summary(xs):
            x=np.asarray(xs);return {'count':len(x),'min':float(x.min()),'median':float(np.median(x)),'p95':float(np.quantile(x,.95)),'p99':float(np.quantile(x,.99)),'max':float(x.max()),'atMostNm':{str(r):int((x<=r).sum()) for r in [100,250,500,1000,5000]}}
        pace();guard(True)
        for p,h in pins.items():assert sha(ROOT/p)==h,f'Input changed {p}'
        result={'schema':m['schema'],'status':'complete','scope':'all retained midpoint-proxy attachment plus finite canonical APL-side comparison; no physiological/learning validation',
                'contacts':count,'residualsByApl':{r:summary(x) for r,x in residuals.items()},'canonicalSample':sample,'sampleCablePathDifferenceNm':summary([r['cablePathDifferenceNm'] for r in sample]),
                'resources':resources,'elapsedSeconds':time.monotonic()-started,'cpuSeconds':time.process_time()-cpu_started,'graphPasses':0,'learnerUpdates':0}
        atomic(out/'result.json',result);atomic(out/'manifest.json',{**m,'status':'complete','resultSha256':sha(out/'result.json'),'projectionsSha256':sha(out/'projections.csv')})
        print(json.dumps({k:v for k,v in result.items() if k not in ['canonicalSample','resources']}))
    except Exception as exc:atomic(out/'manifest.json',{**m,'status':'failed','error':str(exc)});raise


if __name__=='__main__':raise SystemExit(main())
