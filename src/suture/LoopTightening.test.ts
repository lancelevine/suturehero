import {expect,it} from 'vitest';
import * as THREE from 'three';
import {tighteningPose} from './LoopTightening';
import {knotLoop,knotTailContact} from './knotGeometry';
import {GuidedKnot} from './GuidedKnot';
it('carries the entire wrap with driver translation and rotation before release',()=>{
  const k=new GuidedKnot();k.phase='tail';k.wrap=1;
  const base=knotLoop(k,new THREE.Matrix4());
  const transform=new THREE.Matrix4().compose(new THREE.Vector3(0.4,0.95,-0.2),new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4,0.6,0.2)),new THREE.Vector3(1,1,1));
  const moved=knotLoop(k,transform);
  base.points.forEach((p,i)=>expect(p.clone().applyMatrix4(transform).distanceTo(moved.points[i])).toBeLessThan(1e-8));
});
it('slides along the shaft before reducing radius, connects to the tail and finishes independent of driver pose',()=>{
  const k=new GuidedKnot();k.phase='seating';k.wrap=1;
  const driver=new THREE.Matrix4().makeTranslation(0.4,0.95,-0.2);
  const start=tighteningPose(driver,0),slipped=tighteningPose(driver,0.3);
  expect(start.center.distanceTo(slipped.center)).toBeCloseTo(0.5);
  expect(slipped.radius).toBe(start.radius);
  let radius=0.14;
  for(let i=0;i<=100;i++) {
    k.seating=i/100;const loop=knotLoop(k,driver);
    expect(loop.radius).toBeLessThanOrEqual(radius+1e-10);radius=loop.radius;
    expect(loop.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
    if(k.seating>=0.3)expect(knotTailContact(k,new THREE.Vector3(0.3,0.43,0),loop).distanceTo(loop.points[0])).toBeLessThan(1e-8);
  }
  const final=tighteningPose(driver,1),other=tighteningPose(new THREE.Matrix4().makeTranslation(2,2,2),1);
  expect(final.radius).toBeCloseTo(0.06);expect(final.center.distanceTo(other.center)).toBe(0);
  k.seating=0;expect(knotLoop(k,driver).radius).toBe(0.14);
});
it('lays the wrap behind the moving forceps in both directions without a pop at zero or completion',()=>{
  for(const direction of [1,-1]) {
    const k=new GuidedKnot();k.phase='wrapping';k.throws=direction===1?0:1;
    const driver=new THREE.Matrix4().makeTranslation(0,1.1,-0.2);
    const initial=knotLoop(k,driver);expect(initial.length).toBe(0);expect(initial.points).toHaveLength(1);
    k.wrap=1e-7;const tiny=knotLoop(k,driver);
    expect(tiny.points[0].distanceTo(initial.end)).toBeLessThan(1e-10);
    expect(tiny.end.distanceTo(initial.end)).toBeLessThan(1e-6);
    let length=0;
    for(let i=1;i<=100;i++) {
      k.wrap=i/100;const loop=knotLoop(k,driver);
      const radial=loop.end.clone().sub(loop.center).setZ(0).normalize();
      const grip=k.leftPosition.clone().sub(k.center).setZ(0).normalize();
      expect(radial.distanceTo(grip)).toBeLessThan(1e-8);
      expect(loop.length).toBeGreaterThan(length);length=loop.length;
    }
    const full=knotLoop(k,driver);k.phase='tail';const held=knotLoop(k,driver);
    expect(held.end.distanceTo(full.end)).toBe(0);expect(held.length).toBe(full.length);
    k.phase='wrapping';k.wrap=0;expect(knotLoop(k,driver).end.distanceTo(initial.end)).toBe(0);
  }
});
