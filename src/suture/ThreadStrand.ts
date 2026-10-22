import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import { StrandContact } from './StrandContact';
import * as THREE from 'three';
export type StrandObstacle=(points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>)=>void;
/** Position-based strand with a prescribed material length. Discrete self-contact, without force calibration. */
export class ThreadStrand {
  tissueContact?:StrandObstacle;
  readonly points: THREE.Vector3[];
  private previous: THREE.Vector3[];
  private materialLength:number;
  private edgeLengths?:number[];
  get count(){return this.points.length;}
  private edgeRest(index:number){return this.edgeLengths?.[index]??this.restLength;}
  get length() {return this.materialLength;}
  get restLength() {return this.materialLength/(this.count-1);}
  /** Feed material without reseeding particles or discarding their motion. */
  setMaterialLength(length:number) {
    if(!Number.isFinite(length) || length<=0)throw new Error('Material length must be finite and positive.');
    if(this.edgeLengths)this.edgeLengths=this.edgeLengths.map(rest=>rest*length/this.materialLength);
    this.materialLength=length;
  }
  /** Material distance, including fractional edges left by cutting. */
  materialLengthBetween(from:number,to:number){
    const low=THREE.MathUtils.clamp(Math.min(from,to),0,this.count-1),high=THREE.MathUtils.clamp(Math.max(from,to),0,this.count-1);
    let length=0;for(let i=Math.floor(low);i<Math.ceil(high);i++)length+=this.edgeRest(i)*(Math.min(high,i+1)-Math.max(low,i));
    return length;
  }
  pointAt(coordinate:number,target=new THREE.Vector3()){
    const q=THREE.MathUtils.clamp(coordinate,0,this.count-1),i=Math.min(this.count-2,Math.floor(q));return target.copy(this.points[i]).lerp(this.points[i+1],q-i);
  }
  /** Dissipate local residual velocity without moving or reseeding material. */
  dampMotion(first:number,last:number,retention:number){
    for(let i=Math.max(0,Math.floor(first));i<=Math.min(this.count-1,Math.ceil(last));i++)this.previous[i].lerp(this.points[i],1-retention);
  }
  private motionScratch?:Float64Array;
  /** Viscous damping of relative particle motion, preserving bulk translation. */
  dampInternalMotion(strength=.15){
    const v=this.motionScratch??=new Float64Array(this.count*3);
    for(let i=0;i<this.count;i++){v[i*3]=this.points[i].x-this.previous[i].x;v[i*3+1]=this.points[i].y-this.previous[i].y;v[i*3+2]=this.points[i].z-this.previous[i].z;}
    for(let i=0;i<this.count-1;i++){
      const x=(v[i*3]-v[(i+1)*3])*strength,y=(v[i*3+1]-v[(i+1)*3+1])*strength,z=(v[i*3+2]-v[(i+1)*3+2])*strength;
      if(!this.pinned.has(i)){this.previous[i].x+=x;this.previous[i].y+=y;this.previous[i].z+=z;}
      if(!this.pinned.has(i+1)){this.previous[i+1].x-=x;this.previous[i+1].y-=y;this.previous[i+1].z-=z;}
    }
  }
  private accumulator=0;
  private pinned=new Set<number>();
  private delta=new THREE.Vector3();
  private contact: StrandContact;
  constructor(length=3.8,count=80) {
    if(length<=0 || count<3)throw new Error('A strand needs positive length and at least three particles.');
    this.materialLength=length;
    this.points=Array.from({length:count},()=>new THREE.Vector3());
    this.contact=new StrandContact(this.restLength*1.5);
    this.previous=this.points.map(p=>p.clone());
  }
  /** Sever at a material coordinate, preserving both sides and their motion. */
  splitAt(coordinate:number){
    if(!Number.isFinite(coordinate)||coordinate<2||coordinate>this.count-3)return undefined;
    const i=Math.floor(coordinate),t=coordinate-i,partial=t>1e-7;
    const positions=this.points.map(p=>p.clone()),velocities=this.previous.map(p=>p.clone());
    const rests=Array.from({length:this.count-1},(_,j)=>this.edgeRest(j));
    const cut=positions[i].clone().lerp(positions[i+1],t),oldCut=velocities[i].clone().lerp(velocities[i+1],t);
    const retained=positions.slice(0,i+1),retainedPrevious=velocities.slice(0,i+1);
    if(partial){retained.push(cut.clone());retainedPrevious.push(oldCut.clone());}
    const detached=[cut.clone(),...positions.slice(i+1)],detachedPrevious=[oldCut.clone(),...velocities.slice(i+1)];
    const retainedRests=[...rests.slice(0,i),...(partial?[rests[i]*t]:[])];
    const detachedRests=[rests[i]*(1-t),...rests.slice(i+1)];
    const detachedLength=detachedRests.reduce((sum,rest)=>sum+rest,0);
    const fragment=new ThreadStrand(detachedLength,detached.length);
    fragment.points.forEach((p,j)=>p.copy(detached[j]));fragment.previous.forEach((p,j)=>p.copy(detachedPrevious[j]));fragment.edgeLengths=detachedRests;
    this.points.splice(0,this.points.length,...retained);this.previous=retainedPrevious;this.edgeLengths=retainedRests;
    this.materialLength=retainedRests.reduce((sum,rest)=>sum+rest,0);this.pinned=new Set([...this.pinned].filter(index=>index<this.count));
    return {fragment,firstDetachedIndex:i+1,cut:cut.clone()};
  }
  reset(path: readonly THREE.Vector3[]) {
    const curve=new THREE.CatmullRomCurve3(path.map(p=>p.clone()));
    const points=curve.getSpacedPoints(this.count-1);
    this.points.forEach((p,i)=>{p.copy(points[i]);this.previous[i].copy(p);});
    this.accumulator=0;this.pinned.clear();
  }
  advance(dt: number,anchors: ReadonlyMap<number,THREE.Vector3>,surfaceAt:(p:THREE.Vector3)=>number,toolContact?:(points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>,time:{from:number;to:number;start?:readonly THREE.Vector3[]})=>void) {
    const step=1/120;
    this.accumulator+=Math.max(0,Math.min(dt,0.05));
    for(const index of this.pinned)if(!anchors.has(index))this.previous[index].copy(this.points[index]);
    this.pinned=new Set(anchors.keys());
    const steps=Math.floor((this.accumulator+1e-10)/step);
    const starts=new Map([...anchors].map(([i])=>[i,this.points[i].clone()]));
    let substep=0;
    while(this.accumulator+1e-10>=step) {
      substep++;
      this.accumulator-=step;
      const contactStart=toolContact?this.points.map(p=>p.clone()):undefined;
      for(let i=0;i<this.count;i++) {
        const p=this.points[i],prev=this.previous[i],anchor=anchors.get(i);
        if(anchor) {p.copy(starts.get(i)!).lerp(anchor,substep/steps);prev.copy(p);continue;}
        const x=p.x,y=p.y,z=p.z;
        p.addScaledVector(this.delta.subVectors(p,prev),PRACTICE_SETUP.suture.drag);p.y-=2.5*step*step;
        prev.set(x,y,z);
      }
      for(let iteration=0;iteration<24;iteration++) {
        if(iteration>0 && contactStart)this.points.forEach((p,i)=>contactStart[i].copy(p));
        this.projectDistances(anchors,iteration%2!==0);
        this.projectBends(anchors);
        if(iteration%6===5)this.contact.resolve(this.points,this.previous,this.pinned);
        toolContact?.(this.points,this.previous,this.pinned,{from:iteration===0?(substep-1)/steps:substep/steps,to:substep/steps,start:contactStart});
        this.tissueContact?.(this.points,this.previous,this.pinned);
        for(let i=0;i<this.count;i++)if(!anchors.has(i))this.points[i].y=Math.max(this.points[i].y,surfaceAt(this.points[i]));
      }
      for(let i=0;i<this.count;i++)if(!anchors.has(i) && this.points[i].y<=surfaceAt(this.points[i])+0.0001) {
        // Tangential surface drag, independent of how often the scene renders.
        this.previous[i].x=THREE.MathUtils.lerp(this.previous[i].x,this.points[i].x,0.18*PRACTICE_SETUP.suture.friction);
        this.previous[i].z=THREE.MathUtils.lerp(this.previous[i].z,this.points[i].z,0.18*PRACTICE_SETUP.suture.friction);
        this.previous[i].y=this.points[i].y;
      }
    }
    // Kinematic attachment remains exact even on a substep-free display frame.
    for(const [i,anchor] of anchors)this.points[i].copy(anchor);
  }
  private projectDistances(anchors:ReadonlyMap<number,THREE.Vector3>,reverse:boolean){
    for(let n=0;n<this.count-1;n++){
      const i=reverse?this.count-2-n:n,a=this.points[i],b=this.points[i+1];
      this.delta.subVectors(b,a);const distance=this.delta.length(),wa=anchors.has(i)?0:1,wb=anchors.has(i+1)?0:1;
      if(distance<1e-9 || wa+wb===0)continue;
      this.delta.multiplyScalar((distance-this.edgeRest(i))/(distance*(wa+wb)));
      if(wa)a.add(this.delta);if(wb)b.sub(this.delta);
    }
  }
  private projectBends(anchors:ReadonlyMap<number,THREE.Vector3>){
    // A soft angular limit suppresses zero-energy alternating folds without
    // smoothing the rendered centerline or changing the material budget.
    for(let i=1;i<this.count-1;i++){
      const span=this.edgeRest(i-1)+this.edgeRest(i),minimum=span*.75;
      const a=this.points[i-1],b=this.points[i+1],delta=this.delta.subVectors(b,a),distance=delta.length();
      const wa=anchors.has(i-1)?0:1,wb=anchors.has(i+1)?0:1;
      if(distance>=span || distance<1e-9 || wa+wb===0)continue;
      // Also relax shallow alternating bends: the former sharp-angle limit
      // alone left a visibly corrugated resting tail. Contact still wins over
      // this weak straightening preference on wraps and seated loops.
      const target=distance<minimum?minimum:span;
      const stiffness=distance<minimum?0.2:0.015*PRACTICE_SETUP.suture.bend;
      delta.multiplyScalar((target-distance)/distance*stiffness/(wa+wb));
      if(wa)this.applyContactCorrection(i-1,delta.clone().negate());
      if(wb)this.applyContactCorrection(i+1,delta);
    }
  }
  /** Additional coupled contact sweeps, without another integration or reseeding. */
  projectContacts(anchors:ReadonlyMap<number,THREE.Vector3>,surfaceAt:(p:THREE.Vector3)=>number,toolContact:((points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>,start:readonly THREE.Vector3[])=>void)|undefined,reverse=false){
    const start=this.points.map(p=>p.clone()),pinned=new Set(anchors.keys());
    this.projectDistances(anchors,reverse);this.projectBends(anchors);this.contact.resolve(this.points,this.previous,pinned);
    toolContact?.(this.points,this.previous,pinned,start);
    this.tissueContact?.(this.points,this.previous,pinned);
    for(let i=0;i<this.count;i++)if(!pinned.has(i))this.points[i].y=Math.max(this.points[i].y,surfaceAt(this.points[i]));
  }
  /** Shared contact constraints preserve particle velocity when separating overlap. */
  applyContactCorrection(index:number,correction:THREE.Vector3) {
    this.points[index].add(correction);this.previous[index].add(correction);
  }
  get measuredLength() {let length=0;for(let i=1;i<this.count;i++)length+=this.points[i-1].distanceTo(this.points[i]);return length;}
}
