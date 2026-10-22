import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {InstrumentThreadContact,shaftWinding} from './InstrumentThreadContact';
it.each(['standard','castro'] as const)('tracks a live opening on the %s driver jaws and releases it past the metal tip',style=>{
  const driver=new Instrument('right',0);driver.setDriverStyle(style);driver.root.position.set(0,1,0);driver.root.quaternion.identity();driver.openness=.1;
  const contact=new InstrumentThreadContact();contact.configure([driver]);
  const loop=(z:number)=>Array.from({length:40},(_,i)=>{const a=i/39*Math.PI*1.95;return new THREE.Vector3(.1*Math.cos(a),1+.1*Math.sin(a),z);});
  const normal=new THREE.Vector3(0,0,1);
  expect(contact.supportsOpening(driver.id,loop(.1),normal)).toBe(true);
  expect(contact.supportsOpening(driver.id,loop(-.2),normal)).toBe(false);
});
it('separates a segment crossing the shaft interior and preserves pins and velocities',()=>{
  const driver=new Instrument('right',0);driver.root.position.set(0,1,0);driver.root.quaternion.identity();
  const contact=new InstrumentThreadContact();contact.configure([driver]);
  const p=[new THREE.Vector3(-0.3,1,0.8),new THREE.Vector3(0.3,1,0.8)],prev=p.map(v=>v.clone());
  for(let i=0;i<12;i++)contact.resolve(p,prev,new Set());
  expect(Math.abs(p[0].y-1)).toBeGreaterThanOrEqual(0.085);
  p.forEach((v,i)=>expect(v.distanceTo(prev[i])).toBeLessThan(1e-8));
  const pinned=p[0].clone();contact.resolve(p,prev,new Set([0]));expect(p[0].equals(pinned)).toBe(true);
});
it('measures actual near-shaft geometry and is invariant to rigid world transforms',()=>{
  const helix=Array.from({length:65},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2)*0.1,Math.sin(i/64*Math.PI*2)*0.1,0.5+i/64*0.2));
  expect(shaftWinding(helix,new THREE.Matrix4())).toBeCloseTo(1);
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(1,2,3),new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5,0.8,0.2)),new THREE.Vector3(1,1,1));
  expect(shaftWinding(helix.map(p=>p.clone().applyMatrix4(matrix)),matrix)).toBeCloseTo(1);
  expect(shaftWinding(helix.map(p=>p.clone().multiplyScalar(10)),new THREE.Matrix4())).toBe(0);
  const roll=new THREE.Matrix4().makeRotationZ(1.2);expect(shaftWinding(helix,roll)).toBeCloseTo(1);
});
it('bends a taut resolved strand around the shaft using contact rather than a generated loop',async()=>{
  const {ThreadStrand}=await import('./ThreadStrand');const driver=new Instrument('right',0);
  driver.root.position.set(0,1,0);driver.root.quaternion.identity();const contact=new InstrumentThreadContact();contact.configure([driver]);
  const a=new THREE.Vector3(-0.6,1,0.8),b=new THREE.Vector3(0.6,1,0.8),strand=new ThreadStrand(1.25,48);
  strand.reset([a,new THREE.Vector3(0,1.05,0.8),b]);
  for(let i=0;i<240;i++)strand.advance(1/120,new Map([[0,a],[47,b]]),()=>0.1,contact.resolve);
  expect(Math.abs(shaftWinding(strand.points,driver.root.matrixWorld))).toBeGreaterThan(0.2);
  expect(strand.measuredLength).toBeCloseTo(strand.length,1);
});
it('prevents a segment from crossing completely through the shaft between solver steps',()=>{
  const driver=new Instrument('right',0);driver.root.position.set(0,1,0);driver.root.quaternion.identity();
  const contact=new InstrumentThreadContact();contact.configure([driver]);
  const previous=[new THREE.Vector3(-0.2,0.8,0.8),new THREE.Vector3(0.2,0.8,0.8)];
  const points=previous.map(p=>p.clone().setY(1.2));
  contact.resolve(points,previous,new Set());
  expect(Math.max(...points.map(p=>p.y))).toBeLessThanOrEqual(0.915);
  expect(points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
});
it('carries a stationary segment onto the incoming side when the shaft moves across it',()=>{
  const driver=new Instrument('right',0);driver.root.position.set(0,0.8,0);driver.root.quaternion.identity();
  const contact=new InstrumentThreadContact();contact.configure([driver]);driver.root.position.y=1.2;contact.configure([driver]);
  const points=[new THREE.Vector3(-0.2,1,0.8),new THREE.Vector3(0.2,1,0.8)],previous=points.map(p=>p.clone());
  contact.resolve(points,previous,new Set());
  expect(Math.min(...points.map(p=>p.y))).toBeGreaterThanOrEqual(1.285);
});
it('exempts captured material only from its own jaws, retaining other instrument contact',()=>{
  const left=new Instrument('left',0),right=new Instrument('right',0);
  left.root.position.set(0,1,0.8);right.root.position.set(0,1,0);left.root.quaternion.identity();right.root.quaternion.identity();
  const contact=new InstrumentThreadContact();contact.configure([left,right]);
  const points=[new THREE.Vector3(-0.02,1,0.82),new THREE.Vector3(0.02,1,0.82)],previous=points.map(p=>p.clone());
  const exemptions=new Map([['left',new Set([0,1])]]);
  contact.resolve(points,previous,new Set(),undefined,exemptions);
  expect(points.some(p=>Math.abs(p.y-1)>0.01)).toBe(true);
});
it('retains a material wrap around the shaft during settling instead of cutting through it',async()=>{
  const {ThreadStrand}=await import('./ThreadStrand');const driver=new Instrument('right',0);
  driver.root.position.set(0,1,0);driver.root.quaternion.identity();const contact=new InstrumentThreadContact();contact.configure([driver]);
  const helix=Array.from({length:65},(_,i)=>new THREE.Vector3(0.1*Math.cos(i/64*Math.PI*2),1+0.1*Math.sin(i/64*Math.PI*2),1.25+i/64*0.5));
  let length=0;for(let i=1;i<helix.length;i++)length+=helix[i].distanceTo(helix[i-1]);
  const strand=new ThreadStrand(length,32);strand.reset(helix);
  const pins=new Map([[0,helix[0]],[31,helix.at(-1)!]]);
  for(let i=0;i<600;i++)strand.advance(1/120,pins,()=>0.1,contact.resolve);
  expect(Math.abs(shaftWinding(strand.points,driver.root.matrixWorld))).toBeGreaterThan(0.85);
  expect(strand.measuredLength).toBeCloseTo(strand.length,1);
});

it('blocks a shallow swept crossing even when the endpoint normals are not opposite',()=>{
  const driver=new Instrument('right',0);driver.root.position.set(0,1,0);driver.root.quaternion.identity();
  const contact=new InstrumentThreadContact();contact.configure([driver]);
  const start=new THREE.Vector3(-0.045,1.078,1),point=new THREE.Vector3(0.045,1.078,1);
  const before=point.clone();contact.resolve([point],[start.clone()],new Set(),{from:0,to:1,start:[start]});
  expect(point.distanceTo(before)).toBeGreaterThan(0.01);
  expect(Math.hypot(point.x,point.y-1)).toBeGreaterThanOrEqual(0.086);
});
