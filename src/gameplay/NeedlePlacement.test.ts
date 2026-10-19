import { expect, it } from 'vitest';
import * as THREE from 'three';
import { NeedlePlacement } from './NeedlePlacement';
it('requires driver ownership, position, direction and a continuous steady hold',()=>{
  const p=new NeedlePlacement();
  for(let i=0;i<30;i++)p.update(p.target,p.direction,false,0.05);
  expect(p.complete).toBe(false);
  p.update(p.target.clone().add(new THREE.Vector3(0.2,0,0)),p.direction,true,0.05); expect(p.progress).toBe(0);
  p.update(p.target,new THREE.Vector3(0,1,0),true,0.05); expect(p.progress).toBe(0);
  for(let i=0;i<10;i++)p.update(p.target,p.direction,true,0.05);
  expect(p.progress).toBeCloseTo(0.5);
  p.update(p.target,p.direction,false,0.05); expect(p.progress).toBe(0);
  for(let i=0;i<21;i++)p.update(p.target,p.direction,true,0.05);
  expect(p.complete).toBe(true);
  p.update(new THREE.Vector3(9,9,9),p.direction,false,0.05); expect(p.complete).toBe(true);
  p.reset(); expect(p.complete).toBe(false); expect(p.progress).toBe(0);
});
it('does not award completion from one stalled frame',()=>{
  const p=new NeedlePlacement(); p.update(p.target,p.direction,true,5); expect(p.progress).toBe(0.05);
});
