import {expect,it} from 'vitest';
import * as THREE from 'three';
import {EdgeEversion} from './EdgeEversion';
const pose=(jaw:THREE.Vector3,openness:number)=>({jaw,openness,rotation:new THREE.Quaternion()});
it('grips only near the epidermal edge on closure, follows lift and rolls the skin outward',()=>{
  const e=new EdgeEversion();e.begin();
  e.update(pose(new THREE.Vector3(2,1,0),0.1),0.01);expect(e.held).toBe(false);
  e.update(pose(e.anchor.clone(),0.1),0.01);expect(e.held).toBe(false);
  e.update(pose(e.anchor.clone(),0.7),0.01);e.update(pose(e.anchor.clone(),0.1),0.01);
  expect(e.held).toBe(true);expect(e.ready).toBe(false);
  e.update(pose(e.anchor.clone().add(new THREE.Vector3(0,0.15,0)),0.1),0.01);
  expect(e.ready).toBe(true);expect(e.deformPoint(e.anchor).distanceTo(e.target)).toBeLessThan(1e-8);
  const edge=e.deformPoint(new THREE.Vector3(0.05,0.41,0));
  expect(e.deformPoint(new THREE.Vector3(0.05,0.31,0)).y).toBeGreaterThan(0.4);
  expect(edge.y).toBeGreaterThan(0.5);expect(edge.x).toBeGreaterThan(0.05);
  for(const point of [new THREE.Vector3(-0.05,0.41,0),new THREE.Vector3(0.3,0.43,0),new THREE.Vector3(0.05,0.04,0)])expect(e.deformPoint(point).distanceTo(point)).toBeLessThan(1e-8);
  e.update(pose(e.target.clone(),0.7),0.05);expect(e.held).toBe(false);expect(e.ready).toBe(false);
  for(let i=0;i<60;i++)e.update(pose(e.anchor.clone(),0.7),0.05);
  expect(e.angle).toBe(0);expect(e.target.equals(e.anchor)).toBe(true);
  e.reset();expect(e.active).toBe(false);
});
it('does not acquire tissue during needle handoff and releases excessive displacement',()=>{
  const e=new EdgeEversion();e.begin();e.update(pose(e.anchor.clone(),0.1),0.01,false);expect(e.held).toBe(false);
  e.update(pose(e.anchor.clone(),0.7),0.01);e.update(pose(e.anchor.clone(),0.1),0.01);
  e.update(pose(e.anchor.clone().add(new THREE.Vector3(0,1,0)),0.1),0.05);expect(e.held).toBe(false);
});
