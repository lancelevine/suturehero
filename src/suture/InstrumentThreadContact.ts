import type {StrandObstacle} from './ThreadStrand';
import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import { closestSegments } from './StrandContact';
import { THREAD_RADIUS } from './threadMaterial';
import {MaterialOpening} from './MaterialOpening';
interface Capsule {toolId:string;driver:boolean;a:THREE.Vector3;b:THREE.Vector3;oldA:THREE.Vector3;oldB:THREE.Vector3;radius:number;bounds:THREE.Box3}
/** Substep-interpolated, conservatively sampled swept segment/capsule contact. Instrument bodies remain kinematic. */
export class InstrumentThreadContact {
  private capsules:Capsule[]=[];
  /** Metal still occupying a passed loop delays retention until it slips free. */
  supportsOpening(toolId:string,points:readonly THREE.Vector3[],normal:THREE.Vector3){
    const opening=new MaterialOpening(points,normal);
    return this.capsules.some(c=>c.toolId===toolId&&opening.intersectsCapsule(c.a,c.b,c.radius));
  }
  configure(tools:readonly Instrument[],preserveSweep=false) {
    const last=this.capsules;this.capsules=[];
    for(const tool of tools) {
      tool.root.updateWorldMatrix(true,false);
      const add=(a:THREE.Vector3,b:THREE.Vector3,radius:number)=>{
        a.applyMatrix4(tool.root.matrixWorld);b.applyMatrix4(tool.root.matrixWorld);
        const prior=last[this.capsules.length];
        const oldA=prior?.toolId===tool.id?(preserveSweep?prior.oldA:prior.a).clone():a.clone(),oldB=prior?.toolId===tool.id?(preserveSweep?prior.oldB:prior.b).clone():b.clone();
        this.capsules.push({toolId:tool.id,driver:tool.kind==='needle-driver',a,b,oldA,oldB,radius:radius+THREAD_RADIUS,bounds:new THREE.Box3().setFromPoints([a,b,oldA,oldB]).expandByScalar(radius+THREAD_RADIUS)});
      };
      if(tool.kind==='needle-driver'){
        add(new THREE.Vector3(0,0,.3),new THREE.Vector3(0,0,tool.driverStyle==='castro'?1.35:2.9),tool.driverStyle==='castro'?.055:.077);
        if(tool.driverStyle==='castro')for(const side of [-1,1])add(new THREE.Vector3(side*.07,0,1.35),new THREE.Vector3(side*.15,0,2.75),.05);
      }
      for(const side of [-1,1]) {
        if(tool.kind==='forceps') {
          const at=(t:number)=>new THREE.Vector3(side*(tool.openness*0.18*(1-t)+0.085*Math.sin(Math.PI*t)+(0.045+0.05*Math.sin(Math.PI*t))/2),0,t*3.1);
          add(at(0),at(0.15),0.045);continue;
        }
        const pivot=new THREE.Vector3(side*(tool.driverStyle==='castro'?.025:.035),0,0.35);
        const tip=new THREE.Vector3(0,0,-0.42).applyAxisAngle(new THREE.Vector3(0,1,0),side*tool.openness*0.35).add(pivot);
        add(pivot,tip,tool.jawRadius);
      }
    }
  }
  /** Permit shallow skin overlap while preserving an exterior thread gap.
   * Forceps jaws remain available for tissue grasps. */
  constrainDriverToSurface(tool:Instrument,surfaceAt:(p:THREE.Vector3)=>number,overlap=.04) {
    if(tool.kind!=='needle-driver')return false;
    let lift=-Infinity;
    for(const capsule of this.capsules)if(capsule.toolId===tool.id){
      const steps=Math.max(1,Math.ceil(capsule.a.distanceTo(capsule.b)/0.06));
      for(let i=0;i<=steps;i++){
        const center=capsule.a.clone().lerp(capsule.b,i/steps);
        let surface=surfaceAt(center);
        // Include the capsule footprint when it straddles a pad/tray edge.
        for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]])surface=Math.max(surface,surfaceAt(center.clone().add(new THREE.Vector3(x*capsule.radius,0,z*capsule.radius))));
        lift=Math.max(lift,surface+capsule.radius+0.002-center.y-(surface>=0.4?overlap:0));
      }
    }
    if(lift>0){tool.root.position.y+=lift;tool.root.updateWorldMatrix(true,false);}
    return lift>=-0.001;
  }
  /** Project a driver against profile-specific walls instead of a top-only height. */
  constrainDriverToObstacle(tool:Instrument,obstacle:(radius:number)=>StrandObstacle){
    if(tool.kind!=='needle-driver')return false;
    const origin=tool.root.position.clone(),point=new THREE.Vector3(),old=new THREE.Vector3(),before=new THREE.Vector3(),deepest=new THREE.Vector3();
    const points=[point],previous=[old],pins=new Set<number>();let changed=false;
    for(let iteration=0;iteration<3;iteration++){
      deepest.set(0,0,0);
      for(const capsule of this.capsules)if(capsule.toolId===tool.id){
        const project=obstacle(capsule.radius-THREAD_RADIUS+.002),steps=Math.ceil(capsule.a.distanceTo(capsule.b)/Math.max(.03,capsule.radius));
        for(let i=0;i<=steps;i++){
          const t=i/steps;point.copy(capsule.a).lerp(capsule.b,t).add(tool.root.position).sub(origin);before.copy(point);
          old.copy(capsule.oldA).lerp(capsule.oldB,t);project(points,previous,pins);point.sub(before);
          if(point.lengthSq()>deepest.lengthSq())deepest.copy(point);
        }
      }
      if(deepest.lengthSq()<1e-12)break;
      tool.root.position.add(deepest);changed=true;
    }
    if(changed)tool.root.updateWorldMatrix(true,false);return changed;
  }
  /** A small local indentation gives exterior wraps room below a driver
   * that is allowed to overlap skin. The tray/floor keep their full support. */
  supportAt(point:THREE.Vector3,surfaceAt:(p:THREE.Vector3)=>number){
    const surface=surfaceAt(point);
    if(surface<0.4)return surface;
    for(const capsule of this.capsules){
      if(!capsule.driver)continue;
      const a=capsule.a,b=capsule.b,dx=b.x-a.x,dz=b.z-a.z;
      const t=THREE.MathUtils.clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/Math.max(1e-10,dx*dx+dz*dz),0,1);
      const x=a.x+t*dx,z=a.z+t*dz,y=a.y+t*(b.y-a.y);
      if(Math.hypot(point.x-x,point.z-z)<=capsule.radius+0.02 && y-capsule.radius<surface)
        return Math.min(surface,Math.max(surface-0.04,y-capsule.radius-0.002));
    }
    return surface;
  }
  /** A held point cannot be kinematically pulled through the other instrument. */
  constrainGrip(toolId:string,start:THREE.Vector3,target:THREE.Vector3) {
    const point=target.clone();
    this.resolve([point],[start.clone()],new Set(),{from:0,to:1,start:[start]},new Map([[toolId,new Set([0])]]));
    return point;
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
        if(oldNormal.length()>=capsule.radius && oldNormal.dot(normal)<capsule.radius*capsule.radius) {
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
        if(oldNormal.length()>=capsule.radius && oldNormal.dot(normal)<capsule.radius*capsule.radius) {
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
    const near=(p:THREE.Vector3)=>p.z>=-.07 && p.z<=2.9 && Math.hypot(p.x,p.y)>=.025 && Math.hypot(p.x,p.y)<=.4;
    if(!near(a)||!near(b))continue;
    const delta=Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x);
    angle+=Math.atan2(Math.sin(delta),Math.cos(delta));
  }
  return angle/(Math.PI*2);
}
