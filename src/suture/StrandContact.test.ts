import { expect,it } from 'vitest';
import * as THREE from 'three';
import { closestSegments,StrandContact } from './StrandContact';
import { THREAD_CONTACT_DISTANCE } from './threadMaterial';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
it('detects crossings in segment interiors rather than only near particles',()=>{
  const r=closestSegments(v(-1,0,0),v(1,0,0),v(0,0,-1),v(0,0,1));
  expect(r.s).toBeCloseTo(0.5);expect(r.t).toBeCloseTo(0.5);expect(r.p.distanceTo(r.q)).toBe(0);
  const points=[v(-1,0,0),v(1,0,0),v(3,2,-1),v(0,0,-1),v(0,0,1)];const previous=points.map(p=>p.clone());
  const solver=new StrandContact(0.2);solver.resolve(points,previous,new Set());
  const after=closestSegments(points[0],points[1],points[3],points[4]);
  expect(after.p.distanceTo(after.q)).toBeGreaterThanOrEqual(THREAD_CONTACT_DISTANCE-1e-8);
});
it('preserves pinned points and resolves contact using only the movable strand',()=>{
  const points=[v(-1,0,0),v(1,0,0),v(3,2,-1),v(0,0,-1),v(0,0,1)];const previous=points.map(p=>p.clone());
  const before=points.map(p=>p.clone());const solver=new StrandContact(0.2);
  solver.resolve(points,previous,new Set([0,1,2]));
  for(const i of [0,1,2])expect(points[i].equals(before[i])).toBe(true);
  expect(closestSegments(points[0],points[1],points[3],points[4]).p.distanceTo(closestSegments(points[0],points[1],points[3],points[4]).q)).toBeGreaterThan(0.018);
});
it('does not separate adjacent segments or move fully constrained crossings',()=>{
  const points=[v(-1,0,0),v(0,0,0),v(0,0,1)];const previous=points.map(p=>p.clone());
  expect(new StrandContact(0.2).resolve(points,previous,new Set())).toBe(0);
  const crossing=[v(-1,0,0),v(1,0,0),v(3,2,-1),v(0,0,-1),v(0,0,1)];
  expect(new StrandContact(0.2).resolve(crossing,crossing.map(p=>p.clone()),new Set([0,1,2,3,4]))).toBe(0);
});
it('handles parallel and zero-length segments without nonfinite results',()=>{
  for(const input of [[v(0,0,0),v(1,0,0),v(0,0.01,0),v(1,0.01,0)],[v(0,0,0),v(0,0,0),v(0,0,0),v(0,0,0)]]) {
    const result=closestSegments(...input as [THREE.Vector3,THREE.Vector3,THREE.Vector3,THREE.Vector3]);
    expect(result.p.toArray().every(Number.isFinite)).toBe(true);expect(result.q.toArray().every(Number.isFinite)).toBe(true);
  }
});
it('finds a crossing between short segments distributed across spatial cells',()=>{
  const points=[v(-0.04,1,0),v(0.04,1,0),v(0.08,1.06,-0.04),v(0,1,-0.04),v(0,1,0.04)];
  const previous=points.map(p=>p.clone());const solver=new StrandContact(0.08);
  expect(solver.resolve(points,previous,new Set())).toBeGreaterThan(0);
  const after=closestSegments(points[0],points[1],points[3],points[4]);
  expect(after.p.distanceTo(after.q)).toBeGreaterThanOrEqual(THREAD_CONTACT_DISTANCE-1e-8);
});
it('bounds corrections near a fixed endpoint instead of launching the movable end',()=>{
  const points=[v(0,0,0),v(1,0,0),v(2,2,-0.1),v(0.0001,0,-0.1),v(0.0001,0,0.1)];
  const previous=points.map(p=>p.clone()),before=points.map(p=>p.clone());
  new StrandContact(0.2).resolve(points,previous,new Set([0,2,3,4]));
  expect(points[1].distanceTo(before[1])).toBeLessThanOrEqual(THREAD_CONTACT_DISTANCE+1e-8);
  for(const i of [0,2,3,4])expect(points[i].equals(before[i])).toBe(true);
});
