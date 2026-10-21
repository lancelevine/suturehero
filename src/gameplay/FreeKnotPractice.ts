import { TailPassage } from '../suture/TailPassage';
import {resolveStrandPair} from '../suture/StrandPairContact';
import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import { ThreadStrand } from '../suture/ThreadStrand';
import { threadSurfaceAt } from '../suture/TissueThreadGuide';
import { InstrumentThreadContact,shaftWinding } from '../suture/InstrumentThreadContact';
interface Grip {strand:ThreadStrand;index:number;local:THREE.Vector3}
/** Free handling sandbox: no prescribed instrument poses, wrap path or completed-knot score. */
export class FreeKnotPractice {
  active=false;
  readonly long=new ThreadStrand(2.1,64);
  readonly short=new ThreadStrand(1.2,40);
  readonly entry=new THREE.Vector3(0.3,0.43,0);
  readonly exit=new THREE.Vector3(-0.3,0.43,0);
  readonly grips=new Map<string,Grip>();
  winding=0;
  readonly passage=new TailPassage();
  private lastOpen=new Map<string,number>();
  private contact=new InstrumentThreadContact();
  private accumulator=0;
  begin(tools:readonly Instrument[]) {
    this.reset();this.active=true;
    this.long.reset([this.exit,new THREE.Vector3(-0.7,0.65,0.2),new THREE.Vector3(-1.3,1.15,0.4)]);
    this.short.reset([this.entry,new THREE.Vector3(0.6,0.5,-0.15),new THREE.Vector3(0.9,0.45,-0.4)]);
    for(const tool of tools) {
      tool.root.quaternion.identity();tool.openness=tool.id==='left'?0.1:0.65;
      tool.root.position.copy(tool.id==='left'?this.long.points.at(-1)!:new THREE.Vector3(0,1.1,-0.65));
      if(tool.id==='left')tool.root.position.z-=0.05;
      tool.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);tool.root.updateWorldMatrix(true,false);
      this.lastOpen.set(tool.id,tool.openness);
      if(tool.id==='left')this.grips.set(tool.id,{strand:this.long,index:this.long.count-1,local:new THREE.Vector3(0,0,0.05)});
    }
  }
  private grasp(tool:Instrument) {
    const jaw=tool.root.localToWorld(new THREE.Vector3(0,0,0.05));
    let best:{strand:ThreadStrand;index:number;distance:number}|undefined;
    for(const strand of [this.long,this.short])for(let i=1;i<strand.count-1;i++) {
      const a=strand.points[i],b=strand.points[i+1],delta=b.clone().sub(a);
      const t=THREE.MathUtils.clamp(jaw.clone().sub(a).dot(delta)/Math.max(1e-10,delta.lengthSq()),0,1);
      const distance=jaw.distanceTo(a.clone().addScaledVector(delta,t)),index=i+(t>=0.5?1:0);
      if(distance>0.085 || [...this.grips.values()].some(g=>g.strand===strand && g.index===index))continue;
      if(!best || distance<best.distance)best={strand,index,distance};
    }
    if(best)this.grips.set(tool.id,{strand:best.strand,index:best.index,local:tool.root.worldToLocal(best.strand.points[best.index].clone())});
  }
  update(dt:number,tools:readonly Instrument[]) {
    if(!this.active)return;
    for(const tool of tools) {
      tool.root.updateWorldMatrix(true,false);
      if(tool.openness>=0.45)this.grips.delete(tool.id);
      if(tool.openness<=0.2 && (this.lastOpen.get(tool.id)??1)>0.2 && !this.grips.has(tool.id))this.grasp(tool);
      this.lastOpen.set(tool.id,tool.openness);
    }
    this.contact.configure(tools);
    for(const tool of tools) {
      const grip=this.grips.get(tool.id);if(!grip)continue;
      const target=tool.root.localToWorld(grip.local.clone());
      const allowed=this.contact.constrainGrip(tool.id,grip.strand.points[grip.index],target);
      tool.root.position.add(allowed.sub(target));tool.root.updateWorldMatrix(true,false);
    }
    this.contact.configure(tools,true);
    const pins=new Map<ThreadStrand,Map<number,THREE.Vector3>>([[this.long,new Map([[0,this.exit]])],[this.short,new Map([[0,this.entry]])]]);
    for(const tool of tools) {
      const grip=this.grips.get(tool.id);if(grip)pins.get(grip.strand)!.set(grip.index,tool.root.localToWorld(grip.local.clone()));
    }
    this.accumulator+=Math.max(0,Math.min(dt,0.05));
    const step=1/120,steps=Math.floor((this.accumulator+1e-10)/step);
    const starts=new Map([...pins].map(([strand,map])=>[strand,new Map([...map].map(([index])=>[index,strand.points[index].clone()]))]));
    const exemptions=new Map<ThreadStrand,Map<string,Set<number>>>();
    for(const strand of [this.long,this.short]) {
      const own=new Map<string,Set<number>>();
      for(const [id,grip] of this.grips)if(grip.strand===strand)own.set(id,new Set([grip.index-2,grip.index-1,grip.index,grip.index+1,grip.index+2]));
      exemptions.set(strand,own);
    }
    for(let n=0;n<steps;n++) {
      const beforeLong=this.long.points.map(p=>p.clone()),beforeShort=this.short.points.map(p=>p.clone());
      const subPins=new Map<ThreadStrand,Map<number,THREE.Vector3>>();
      for(const strand of [this.long,this.short]) {
        const map=new Map([...pins.get(strand)!].map(([index,target])=>[index,starts.get(strand)!.get(index)!.clone().lerp(target,(n+1)/steps)]));
        subPins.set(strand,map);
        strand.advance(step,map,threadSurfaceAt,(p,previous,pinned,time)=>this.contact.resolve(p,previous,pinned,{...time,from:(n+time.from)/steps,to:(n+time.to)/steps},exemptions.get(strand)));
      }
      resolveStrandPair(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!,beforeLong,beforeShort);
      this.accumulator-=step;
    }
    if(steps===0)for(const strand of [this.long,this.short])strand.advance(0,pins.get(strand)!,threadSurfaceAt);

    const driver=tools.find(t=>t.kind==='needle-driver')!;
    this.winding=shaftWinding(this.long.points,driver.root.matrixWorld);
    this.passage.update(this.long.points,this.short.points.at(-1)!,driver.root.matrixWorld,this.gripLabel(driver.id)==='short tail');
  }
  gripLabel(id:string) {
    const grip=this.grips.get(id);if(!grip)return 'free';
    return grip.strand===this.long?'long strand':grip.index>=this.short.count-4?'short tail':'short strand body';
  }
  get reachLimited() {
    if(this.long.measuredLength>this.long.length*1.04 || this.short.measuredLength>this.short.length*1.04)return true;
    for(const grip of this.grips.values()) {
      const start=grip.strand===this.long?this.exit:this.entry;
      if(start.distanceTo(grip.strand.points[grip.index])>grip.strand.restLength*grip.index+0.03)return true;
    }
    return false;
  }
  reset() {this.passage.reset();this.contact=new InstrumentThreadContact();this.active=false;this.grips.clear();this.lastOpen.clear();this.winding=0;this.accumulator=0;}
}
