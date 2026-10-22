import {expect,it} from 'vitest';
import * as THREE from 'three';
import {MaterialOpening} from './MaterialOpening';
const ring=(turns=1,depth=0)=>Array.from({length:64},(_,i)=>{
  const a=i/63*Math.PI*2*turns;
  return new THREE.Vector3(.16*Math.cos(a),.08*Math.sin(a),depth*i/63);
});
it.each([1,2])('keeps %i supported turns on metal until its actual end clears the opening',turns=>{
  const opening=new MaterialOpening(ring(turns,.12),new THREE.Vector3(0,0,1));
  expect(opening.intersectsCapsule(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,.5),.04)).toBe(true);
  expect(opening.intersectsCapsule(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,-.03),.04)).toBe(true);
  expect(opening.intersectsCapsule(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,0,-.05),.04)).toBe(false);
});
it('allows diagonal clearance when the metal is outside an elliptical opening, despite overlapping bounding boxes',()=>{
  const opening=new MaterialOpening(ring(),new THREE.Vector3(0,0,1));
  const at=(x:number,y:number)=>opening.intersectsCapsule(new THREE.Vector3(x,y,-1),new THREE.Vector3(x,y,1),.02);
  expect(at(.14,.07)).toBe(false);
  expect(at(.08,.04)).toBe(true);
  expect(at(.16,0)).toBe(true);
});
it('handles metal parallel to the opening and rigid world transforms',()=>{
  const points=ring(),normal=new THREE.Vector3(0,0,1),a=new THREE.Vector3(-.4,0,.01),b=new THREE.Vector3(.4,0,.01);
  const pose=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.7,1.1,-.3)).setPosition(1,2,-1);
  expect(new MaterialOpening(points,normal).intersectsCapsule(a,b,.02)).toBe(true);
  expect(new MaterialOpening(points.map(p=>p.clone().applyMatrix4(pose)),normal.clone().transformDirection(pose)).intersectsCapsule(a.clone().applyMatrix4(pose),b.clone().applyMatrix4(pose),.02)).toBe(true);
  a.z=b.z=.04;
  expect(new MaterialOpening(points,normal).intersectsCapsule(a,b,.02)).toBe(false);
});
it('requires short material through the opening and identifies the crossing nearest its free tip',()=>{
  const opening=new MaterialOpening(ring(),new THREE.Vector3(0,0,1)),v=(x:number,z:number)=>new THREE.Vector3(x,0,z);
  expect(opening.crossingCoordinate([v(0,-.1),v(0,.1)])).toBeCloseTo(.5);
  expect(opening.crossingCoordinate([v(.2,-.1),v(.2,.1)])).toBeUndefined();
  expect(opening.crossingCoordinate([v(0,.05),v(0,.1)])).toBeUndefined();
  expect(opening.crossingCoordinate([v(0,-.1),v(0,.1),v(0,-.1)])).toBeCloseTo(1.5);
  const pose=new THREE.Matrix4().makeRotationY(.8).setPosition(1,2,3);
  const rotated=new MaterialOpening(ring().map(p=>p.applyMatrix4(pose)),new THREE.Vector3(0,0,1).transformDirection(pose));
  expect(rotated.crossingCoordinate([v(0,-.1),v(0,.1)].map(p=>p.applyMatrix4(pose)))).toBeCloseTo(.5);
});
it('blocks sideways escape while leaving axial pull-through free',()=>{
  const opening=new MaterialOpening(ring(),new THREE.Vector3(0,0,1)),inside=new THREE.Vector3(0,0,.5),outside=new THREE.Vector3(.2,0,.5);
  expect(opening.inwardCorrection(inside,.01).length()).toBe(0);
  const correction=opening.inwardCorrection(outside,.01);
  expect(correction.x).toBeLessThan(0);expect(correction.z).toBeCloseTo(0,12);
  const corrected=outside.clone().add(correction);
  expect(opening.crossingCoordinate([corrected.clone().setZ(-.1),corrected.clone().setZ(.1)])).toBeDefined();
});
it('follows a local crossing without jumping to a different fold near the free tip',()=>{
  const opening=new MaterialOpening(ring(),new THREE.Vector3(0,0,1));
  const points=Array.from({length:12},(_,i)=>new THREE.Vector3(.2,0,i===3||i===10?-.1:.1));
  expect(opening.nearbyPlaneCrossing(points,3)).toBe(2.5);
  expect(opening.nearbyPlaneCrossing(points,8.5)).toBe(9.5);
  points.forEach(p=>p.z=.1);expect(opening.nearbyPlaneCrossing(points,3)).toBeUndefined();
});
