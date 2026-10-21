import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import { closestSegments } from './StrandContact';
import { THREAD_RADIUS } from './threadMaterial';
interface Capsule {toolId:string;a:THREE.Vector3;b:THREE.Vector3;oldA:THREE.Vector3;oldB:THREE.Vector3;radius:number;bounds:THREE.Box3}
/** Substep-interpolated, conservatively sampled swept segment/capsule contact. Instrument bodies remain kinematic. */
export class InstrumentThreadContact {
  private capsules:Capsule[]=[];
  configure(tools:readonly Instrument[]) {
    const last=this.capsules;this.capsules=[];
    for(const tool of tools) {
      tool.root.updateWorldMatrix(true,false);
      const add=(a:THREE.Vector3,b:THREE.Vector3,radius:number)=>{
        a.applyMatrix4(tool.root.matrixWorld);b.applyMatrix4(tool.root.matrixWorld);
        const prior=last[this.capsules.length];
        const oldA=prior?.toolId===tool.id?prior.a.clone():a.clone(),oldB=prior?.toolId===tool.id?prior.b.clone():b.clone();
        this.capsules.push({toolId:tool.id,a,b,oldA,oldB,radius:radius+THREAD_RADIUS,bounds:new THREE.Box3().setFromPoints([a,b,oldA,oldB]).expandByScalar(radius+THREAD_RADIUS)});
      };
      if(tool.kind==='needle-driver')add(new THREE.Vector3(0,0,0.3),new THREE.Vector3(0,0,2.9),0.077);
      for(const side of [-1,1]) {
        if(tool.kind==='forceps') {
          const at=(t:number)=>new THREE.Vector3(side*(tool.openness*0.18*(1-t)+0.085*Math.sin(Math.PI*t)+(0.045+0.05*Math.sin(Math.PI*t))/2),0,t*3.1);
          add(at(0),at(0.15),0.045);continue;
        }
        const pivot=new THREE.Vector3(side*0.035,0,0.35);
        const tip=new THREE.Vector3(0,0,-0.42).applyAxisAngle(new THREE.Vector3(0,1,0),side*tool.openness*0.35).add(pivot);
        add(pivot,tip,0.04);
      }
    }
  }
  resolve=(points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>,time:{from:number;to:number;start?:readonly THREE.Vector3[]}={from:0,to:1},gripExemptions?:ReadonlyMap<string,ReadonlySet<number>>)=>{
    const start=time.start??previous;
    const correct=(index:number,normal:THREE.Vector3,depth:number)=>{
      if(pinned.has(index) || depth<=0)return;
      const velocity=points[index].clone().sub(previous[index]);
      const correction=normal.clone().multiplyScalar(Math.min(0.5,depth));
      points[index].add(correction);previous[index].add(correction);
      // Remove inward velocity instead of letting it hammer the collider on
      // every subsequent substep. Preserve tangential motion along the shaft.
      const inward=velocity.dot(normal);if(inward<0)previous[index].addScaledVector(normal,inward);
    };
    for(const capsule of this.capsules) {
      const a=capsule.oldA.clone().lerp(capsule.a,time.to),b=capsule.oldB.clone().lerp(capsule.b,time.to);
      const oldA=capsule.oldA.clone().lerp(capsule.a,time.from),oldB=capsule.oldB.clone().lerp(capsule.b,time.from);
      const exempt=gripExemptions?.get(capsule.toolId),axis=b.clone().sub(a);
      const center=(point:THREE.Vector3)=>a.clone().addScaledVector(axis,THREE.MathUtils.clamp(point.clone().sub(a).dot(axis)/Math.max(1e-10,axis.lengthSq()),0,1));
      for(let i=0;i<points.length;i++) {
        if(pinned.has(i) || exempt?.has(i))continue;
        const bounds=new THREE.Box3().setFromPoints([start[i],points[i]]);if(!bounds.intersectsBox(capsule.bounds))continue;
        let c=center(points[i]),normal=points[i].clone().sub(c),distance=normal.length();
        const oldAxis=oldB.clone().sub(oldA),fraction=THREE.MathUtils.clamp(start[i].clone().sub(oldA).dot(oldAxis)/Math.max(1e-10,oldAxis.lengthSq()),0,1);
        const oldCenter=oldA.clone().addScaledVector(oldAxis,fraction),oldNormal=start[i].clone().sub(oldCenter);
        if(oldNormal.length()>=capsule.radius && oldNormal.dot(normal)<=0) {
          const motion=start[i].distanceTo(points[i])+oldA.distanceTo(a);
          const samples=Math.min(32,Math.max(1,Math.ceil(motion/(capsule.radius*0.35))));
          for(let n=1;n<=samples;n++) {
            const t=n/samples,point=start[i].clone().lerp(points[i],t),ca=oldA.clone().lerp(a,t),cb=oldB.clone().lerp(b,t),delta=cb.sub(ca);
            const k=THREE.MathUtils.clamp(point.clone().sub(ca).dot(delta)/Math.max(1e-10,delta.lengthSq()),0,1);
            if(point.distanceTo(ca.addScaledVector(delta,k))<capsule.radius) {
              normal=oldNormal.normalize();c=a.clone().lerp(b,fraction);distance=points[i].clone().sub(c).dot(normal);break;
            }
          }
        }
        if(distance>=capsule.radius)continue;
        if(normal.lengthSq()<1e-12)normal.set(1,0,0);else normal.normalize();
        correct(i,normal,capsule.radius+0.002-distance);
      }
      // Segment interiors matter for sparse/temporarily stretched edges. Fine
      // particles have enough radial clearance to keep their chords outside.
      for(let i=0;i<points.length-1;i++) {
        if(exempt?.has(i) || exempt?.has(i+1) || points[i].distanceTo(points[i+1])<capsule.radius*0.5)continue;
        const bounds=new THREE.Box3().setFromPoints([start[i],start[i+1],points[i],points[i+1]]);if(!bounds.intersectsBox(capsule.bounds))continue;
        let hit=closestSegments(points[i],points[i+1],a,b),normal=hit.p.clone().sub(hit.q),distance=normal.length();
        const old=closestSegments(start[i],start[i+1],oldA,oldB),oldNormal=old.p.clone().sub(old.q);
        if(oldNormal.length()>=capsule.radius && oldNormal.dot(normal)<=0) {
          const motion=Math.max(start[i].distanceTo(points[i]),start[i+1].distanceTo(points[i+1]))+oldA.distanceTo(a);
          const samples=Math.min(32,Math.max(1,Math.ceil(motion/(capsule.radius*0.35))));
          for(let n=1;n<=samples;n++) {
            const t=n/samples,sweep=closestSegments(start[i].clone().lerp(points[i],t),start[i+1].clone().lerp(points[i+1],t),oldA.clone().lerp(a,t),oldB.clone().lerp(b,t));
            if(sweep.p.distanceTo(sweep.q)<capsule.radius) {
              normal=oldNormal.normalize();hit={...sweep,p:points[i].clone().lerp(points[i+1],sweep.s),q:a.clone().lerp(b,sweep.t)};
              distance=hit.p.clone().sub(hit.q).dot(normal);break;
            }
          }
        }
        if(distance>=capsule.radius)continue;
        if(normal.lengthSq()<1e-12)normal.crossVectors(axis,points[i+1].clone().sub(points[i]));
        if(normal.lengthSq()<1e-12)normal.set(1,0,0);else normal.normalize();
        for(let n=0;n<2;n++)correct(i+n,normal,capsule.radius-points[i+n].clone().sub(hit.q).dot(normal));
      }
    }
  };
}
/** Contact-local winding, not an inferred knot topology or security score. */
export function shaftWinding(points:readonly THREE.Vector3[],driverWorld:THREE.Matrix4) {
  const inverse=driverWorld.clone().invert();let angle=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1].clone().applyMatrix4(inverse),b=points[i].clone().applyMatrix4(inverse);
    const near=(p:THREE.Vector3)=>p.z>=0.25 && p.z<=2.9 && Math.hypot(p.x,p.y)>=0.07 && Math.hypot(p.x,p.y)<=0.25;
    if(!near(a)||!near(b))continue;
    const delta=Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x);
    angle+=Math.atan2(Math.sin(delta),Math.cos(delta));
  }
  return angle/(Math.PI*2);
}
