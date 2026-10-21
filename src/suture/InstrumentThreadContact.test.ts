import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {InstrumentThreadContact,shaftWinding} from './InstrumentThreadContact';
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
