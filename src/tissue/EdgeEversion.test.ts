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
it('grasps either edge along the incision without beginning a guided exercise',()=>{
 for(const side of [-1,1]){
  const e=new EdgeEversion(),point=new THREE.Vector3(side*0.05,0.395,0.9);
  e.update(pose(point.clone(),0.7),0.01);e.update(pose(point.clone(),0.1),0.01);
  expect(e.held).toBe(true);expect(e.anchor.distanceTo(point)).toBeLessThan(1e-8);
  e.update(pose(point.clone().add(new THREE.Vector3(0,0.15,0)),0.1),0.01);
  const top=e.deformPoint(new THREE.Vector3(side*0.05,0.41,0.9));expect(top.y).toBeGreaterThan(0.5);expect(top.x*side).toBeGreaterThan(0.05);
  const distant=new THREE.Vector3(side*0.05,0.41,-1.2);expect(e.deformPoint(distant).distanceTo(distant)).toBeLessThan(0.001);
 }
});
it('stretches under excess traction, slips once, relaxes and requires opening before regrasp',()=>{
 const e=new EdgeEversion();e.begin();e.update(pose(e.anchor.clone(),.1),.01);
 const safe=e.anchor.clone().add(new THREE.Vector3(0,.15,0));e.update(pose(safe,.1),.05);expect(e.ready).toBe(true);
 const pull=e.anchor.clone().add(new THREE.Vector3(.1,.3,0));
 for(let i=0;i<5;i++)e.update(pose(pull,.1),.05);expect(e.held).toBe(true);expect(e.ready).toBe(false);expect(e.traction.state).toBe('slipping');
 const stretch=e.deformPoint(new THREE.Vector3(.27,.41,0));expect(stretch.y).toBeGreaterThan(.41);
 for(let i=0;i<30;i++)e.update(pose(pull,.1),.05);expect(e.held).toBe(false);expect(e.slipSerial).toBe(1);expect(e.instruction).toContain('Open X');
 for(let i=0;i<90;i++)e.update(pose(e.anchor.clone(),.1),1/60);expect(e.held).toBe(false);expect(e.target.distanceTo(e.anchor)).toBeLessThan(.001);
 e.update(pose(e.anchor.clone(),.7),.01);e.update(pose(e.anchor.clone(),.1),.01);e.update(pose(safe,.1),.05);expect(e.ready).toBe(true);expect(e.slipSerial).toBe(1);
 e.reset();expect(e.traction.peakLoad).toBe(0);
});
it('bounds deformation after a discontinuous pull and leaves the disabled response unchanged',()=>{
 const e=new EdgeEversion();e.begin();e.update(pose(e.anchor.clone(),.1),.01);e.update(pose(e.anchor.clone().add(new THREE.Vector3(0,5,0)),.1),.05);
 expect(e.held).toBe(false);expect(e.target.distanceTo(e.anchor)).toBeLessThan(.4);expect(e.slipSerial).toBe(1);
 const vessel=new EdgeEversion();vessel.tractionEnabled=false;vessel.begin();vessel.update(pose(vessel.anchor.clone(),.1),.01);
 for(let i=0;i<60;i++)vessel.update(pose(vessel.anchor.clone().add(new THREE.Vector3(0,.3,0)),.1),1/60);
 expect(vessel.held).toBe(true);expect(vessel.slipSerial).toBe(0);
});
