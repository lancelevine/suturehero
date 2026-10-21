import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import {resolveStrandPair} from './StrandPairContact';
import {closestSegments} from './StrandContact';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
it('separates crossing exterior segments while respecting pins',()=>{
  const a=new ThreadStrand(0.3,3),b=new ThreadStrand(0.3,3);
  a.points.forEach((p,i)=>p.copy(v([-0.1,0.1,0.2][i],0,0)));b.points.forEach((p,i)=>p.copy(v(0,0,[-0.1,0.1,0.2][i])));
  const pin=a.points[0].clone();
  resolveStrandPair(a,b,new Map([[0,pin]]),new Map(),a.points.map(p=>p.clone()),b.points.map(p=>p.clone()));
  expect(a.points[0].distanceTo(pin)).toBe(0);
  const hit=closestSegments(a.points[0],a.points[1],b.points[0],b.points[1]);
  expect(hit.p.distanceTo(hit.q)).toBeGreaterThan(0.018);
});
it('catches a full crossing between fixed physics steps',()=>{
  const a=new ThreadStrand(0.3,3),b=new ThreadStrand(0.3,3);
  a.points.forEach((p,i)=>p.copy(v([-0.1,0.1,0.2][i],-0.025,0)));b.points.forEach((p,i)=>p.copy(v(0,0,[-0.1,0.1,0.2][i])));
  const oldA=a.points.map(p=>p.clone()),oldB=b.points.map(p=>p.clone());
  a.points.forEach(p=>p.y=0.025);
  resolveStrandPair(a,b,new Map(),new Map(b.points.map((p,i)=>[i,p])),oldA,oldB);
  expect(a.points.slice(0,2).every(p=>p.y<0)).toBe(true);
});
