import {postIsTaut} from '../suture/PostTension';
import {skinThreadContact} from '../tissue/SkinThreadContact';
import {InferredKnotSequence} from '../suture/InferredKnotSequence';
import {KnotTechniqueSequence,type KnotTechnique} from '../suture/KnotTechnique';
import {tractEntry,tractExit} from '../tissue/sutureTract';
import { FreeThrow } from '../suture/FreeThrow';
import { TailPassage } from '../suture/TailPassage';
import {resolveStrandPair} from '../suture/StrandPairContact';
import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import { ThreadStrand,type StrandObstacle } from '../suture/ThreadStrand';
import { threadSurfaceAt,threadBaseAt } from '../suture/TissueThreadGuide';
import { InstrumentThreadContact,shaftWinding } from '../suture/InstrumentThreadContact';
interface Grip {strand:ThreadStrand;index:number;local:THREE.Vector3}
/** Free handling sandbox: no prescribed instrument poses, wrap path or completed-knot score. */
export class FreeKnotPractice {
  active=false;
  long=new ThreadStrand(2.1,64);
  short=new ThreadStrand(1.2,40);
  readonly entry=tractEntry();
  readonly exit=tractExit();
  readonly grips=new Map<string,Grip>();
  winding=0;
  driverOnTissue=false;
  readonly passage=new TailPassage();
  retainedThrow=new FreeThrow();
  readonly earlierThrows:FreeThrow[]=[];
  sequence?:KnotTechniqueSequence|InferredKnotSequence;
  postTaut=false;
  readonly fragments:ThreadStrand[]=[];
  cutMessage='';
  get strands(){return [this.long,this.short,...this.fragments];}
  minimumCut(strand:ThreadStrand){
    const knots=[...this.earlierThrows,this.retainedThrow].filter(t=>t.active);
    if(strand===this.long)return Math.max(2,...knots.map(t=>t.last+3));
    if(strand===this.short)return Math.max(2,...knots.map(t=>Math.ceil(t.shortMaterialCoordinate)+3));
    return 2;
  }
  cut(strand:ThreadStrand,coordinate:number){
    if(coordinate<this.minimumCut(strand)){this.cutMessage='Too close to the retained knot · Leave a tail';return false;}
    const split=strand.splitAt(coordinate);
    if(!split){this.cutMessage='Place thread between the blade edges, away from its endpoint';return false;}
    for(const grip of this.grips.values())if(grip.strand===strand&&grip.index>=split.firstDetachedIndex){grip.strand=split.fragment;grip.index-=split.firstDetachedIndex-1;}
    this.fragments.push(split.fragment);this.cutMessage='Suture cut · Offcut remains separate';return true;
  }
  surfaceAt=threadSurfaceAt;
  threadFloorAt?:typeof threadSurfaceAt;
  tissueContact?:StrandObstacle;
  driverObstacle?:(radius:number)=>StrandObstacle;
  private recorded=false;
  private feedback='';
  private get nextMaterialIndex(){return this.recorded?this.retainedThrow.last+2:this.earlierThrows.length?Math.max(...this.earlierThrows.map(t=>t.last))+2:0;}
  private get observationWraps(){return this.retainedThrow.phase==='retained'&&!this.recorded?this.retainedThrow.wraps:this.sequence?.requiredWraps??1;}
  get instruction(){return this.sequence?`${this.sequence.label} · ${this.sequence.throws.length} throws seated · ${this.sequence.instruction}${this.sequence.sliding?' · Short post: '+(this.postTaut?'taut':'take up slack'):''}${this.feedback?' · '+this.feedback:''}`:'Free first throw';}
  private lastOpen=new Map<string,number>();
  private contact=new InstrumentThreadContact();
  private accumulator=0;
  private skinTopAt=()=>.423;
  private skinContact=skinThreadContact(point=>this.contact.supportAt(point,this.skinTopAt));
  private supportAt=(point:THREE.Vector3)=>(this.threadFloorAt??threadBaseAt)(point);
  begin(tools:readonly Instrument[],technique?:KnotTechnique|'auto') {
    this.reset();this.active=true;
    this.sequence=technique==='auto'?new InferredKnotSequence():technique?new KnotTechniqueSequence(technique):undefined;this.retainedThrow.feedFromWorkingEnd=!!technique;
    this.long=new ThreadStrand(technique?3.5:2.1,technique?104:64);
    this.long.reset(technique?[this.exit,new THREE.Vector3(-.6,.45,1.1),new THREE.Vector3(-1.6,.5,1.35),new THREE.Vector3(-1.8,.85,.9),new THREE.Vector3(-1.3,1.15,.4)]:[this.exit,new THREE.Vector3(-0.7,0.65,0.2),new THREE.Vector3(-1.3,1.15,0.4)]);
    // Lay out the full short-side material in a broad arc. A compressed
    // seed path makes distance constraints manufacture tiny zigzags at rest.
    const radius=0.8;
    this.short.reset(Array.from({length:17},(_,i)=>{
      const angle=i/16*this.short.length/radius;
      return this.entry.clone().add(new THREE.Vector3(radius*Math.sin(angle),0,radius*(Math.cos(angle)-1)));
    }));
    for(const tool of tools) {
      tool.root.quaternion.identity();tool.openness=tool.id==='left'?0.1:0.65;
      tool.root.position.copy(tool.id==='left'?this.long.points.at(-1)!:new THREE.Vector3(0,1.1,-0.65));
      if(tool.id==='left')tool.root.position.z-=0.05;
      tool.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);tool.root.updateWorldMatrix(true,false);
      this.lastOpen.set(tool.id,tool.openness);
      if(tool.id==='left')this.grips.set(tool.id,{strand:this.long,index:this.long.count-1,local:new THREE.Vector3(0,0,0.05)});
    }
    this.contact.configure(tools);
  }
  private grasp(tool:Instrument) {
    const jaw=tool.root.localToWorld(new THREE.Vector3(0,0,0.05));
    let best:{strand:ThreadStrand;index:number;distance:number}|undefined;
    for(const strand of this.strands)for(let i=1;i<strand.count-1;i++) {
      const a=strand.points[i],b=strand.points[i+1],delta=b.clone().sub(a);
      const t=THREE.MathUtils.clamp(jaw.clone().sub(a).dot(delta)/Math.max(1e-10,delta.lengthSq()),0,1);
      // Measure from the jaw surface, rather than its center. The shaft's
      // skin clearance otherwise leaves a resting tail just out of reach.
      const distance=Math.max(0,jaw.distanceTo(a.clone().addScaledVector(delta,t))-(tool.kind==='needle-driver'?tool.jawRadius:0)),index=i+(t>=0.5?1:0);
      if(distance>0.085 || [...this.grips.values()].some(g=>g.strand===strand && g.index===index))continue;
      if(!best || distance<best.distance)best={strand,index,distance};
    }
    // The visible free end is the pickup target when it is within jaw reach.
    // A neighboring fold should not steal a tail pickup merely because it
    // sits slightly higher above the tissue.
    if(tool.kind==='needle-driver' && best?.strand===this.short && best.index<this.short.count-4) {
      const index=this.short.count-1;
      const distance=Math.max(0,jaw.distanceTo(this.short.points[index])-tool.jawRadius);
      if(distance<=.085 && ![...this.grips.values()].some(g=>g.strand===this.short&&g.index===index))best={strand:this.short,index,distance};
    }
    if(best){
      const local=tool.root.worldToLocal(best.strand.points[best.index].clone());
      if(tool.kind==='needle-driver'){
        // Closing seats nearby material between the jaws instead of
        // keeping a captured point floating below the metal.
        const center=new THREE.Vector3(0,0,0.05);
        local.set(0,0,THREE.MathUtils.clamp(local.z,center.z-.035,center.z+.035));
      }
      this.grips.set(tool.id,{strand:best.strand,index:best.index,local});
    }
  }
  private constrainDriver(tool:Instrument,tools:readonly Instrument[]){
    const floor=this.driverObstacle?this.threadFloorAt??this.surfaceAt:this.surfaceAt;
    let constrained=this.contact.constrainDriverToSurface(tool,floor,this.driverObstacle?0:.04);
    if(this.driverObstacle&&tool.kind==='needle-driver'){
      this.contact.configure(tools,true);constrained=this.contact.constrainDriverToObstacle(tool,this.driverObstacle)||constrained;
      constrained=this.contact.constrainDriverToSurface(tool,floor,0)||constrained;
    }
    return constrained;
  }
  update(dt:number,tools:readonly Instrument[],blockedGrips?:ReadonlySet<string>) {
    if(!this.active)return;
    for(const tool of tools) {
      tool.root.updateWorldMatrix(true,false);
      if(tool.openness>=0.45)this.grips.delete(tool.id);
      if(tool.openness<=0.2 && (this.lastOpen.get(tool.id)??1)>0.2 && !this.grips.has(tool.id) && !blockedGrips?.has(tool.id))this.grasp(tool);
      this.lastOpen.set(tool.id,tool.openness);
    }
    this.contact.configure(tools);
    this.driverOnTissue=false;
    for(const tool of tools)this.driverOnTissue=this.constrainDriver(tool,tools)||this.driverOnTissue;
    this.contact.configure(tools,true);
    for(const tool of tools) {
      const grip=this.grips.get(tool.id);if(!grip)continue;
      const target=tool.root.localToWorld(grip.local.clone());
      const limitReach=(anchor:THREE.Vector3,length:number)=>{
        const delta=target.clone().sub(anchor),distance=delta.length();
        if(distance>length)target.copy(anchor).addScaledVector(delta,length/distance);
      };
      if(grip.strand===this.long||grip.strand===this.short){
        limitReach(grip.strand===this.long?this.exit:this.entry,grip.strand.materialLengthBetween(0,grip.index)*1.02);
        for(const knot of [...this.earlierThrows,this.retainedThrow])if(knot.active){
          const coordinate=grip.strand===this.long?knot.last:knot.shortMaterialCoordinate;
          if(grip.index>coordinate)limitReach(grip.strand.pointAt(coordinate),grip.strand.materialLengthBetween(coordinate,grip.index)*1.02);
        }
      }
      const requested=tool.root.localToWorld(grip.local.clone());
      tool.root.position.add(target.clone().sub(requested));tool.root.updateWorldMatrix(true,false);
      const allowed=this.contact.constrainGrip(tool.id,grip.strand.points[grip.index],target);
      tool.root.position.add(allowed.sub(target));tool.root.updateWorldMatrix(true,false);
    }
    this.contact.configure(tools,true);
    for(const tool of tools)this.driverOnTissue=this.constrainDriver(tool,tools)||this.driverOnTissue;
    this.contact.configure(tools,true);
    const pins=new Map<ThreadStrand,Map<number,THREE.Vector3>>([[this.long,new Map([[0,this.exit]])],[this.short,new Map([[0,this.entry]])],...this.fragments.map(s=>[s,new Map<number,THREE.Vector3>()] as const)]);
    for(const tool of tools) {
      const grip=this.grips.get(tool.id);if(grip)pins.get(grip.strand)!.set(grip.index,tool.root.localToWorld(grip.local.clone()));
    }
    this.accumulator+=Math.max(0,Math.min(dt,0.05));
    const step=1/120,steps=Math.min(2,Math.floor((this.accumulator+1e-10)/step));
    // Keep the display responsive on slower machines; discard overdue work
    // rather than running six expensive contact solves in the next frame.
    this.accumulator=Math.min(this.accumulator,steps*step+step*.999);
    const starts=new Map([...pins].map(([strand,map])=>[strand,new Map([...map].map(([index])=>[index,strand.points[index].clone()]))]));
    const exemptions=new Map<ThreadStrand,Map<string,Set<number>>>();
    for(const strand of this.strands) {
      strand.tissueContact=this.tissueContact??this.skinContact;
      const own=new Map<string,Set<number>>();
      for(const [id,grip] of this.grips)if(grip.strand===strand){
        // The closed jaws hold a short material span, not a single mathematical
        // point. Its free tip must not collide with those same jaw surfaces.
        const halfWidth=Math.max(2,Math.ceil(.36/strand.restLength));
        own.set(id,new Set(Array.from({length:2*halfWidth+1},(_,i)=>grip.index-halfWidth+i)));
      }
      exemptions.set(strand,own);
    }
    for(let n=0;n<steps;n++) {
      const beforeLong=this.long.points.map(p=>p.clone()),beforeShort=this.short.points.map(p=>p.clone());
      const subPins=new Map<ThreadStrand,Map<number,THREE.Vector3>>();
      for(const strand of this.strands) {
        const map=new Map([...pins.get(strand)!].map(([index,target])=>[index,starts.get(strand)!.get(index)!.clone().lerp(target,(n+1)/steps)]));
        subPins.set(strand,map);
        strand.advance(step,map,this.supportAt,(p,previous,pinned,time)=>this.contact.resolve(p,previous,pinned,{...time,from:(n+time.from)/steps,to:(n+time.to)/steps},exemptions.get(strand)));
      }
      resolveStrandPair(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!,beforeLong,beforeShort);
      for(const fragment of this.fragments){
        resolveStrandPair(this.long,fragment,subPins.get(this.long)!,subPins.get(fragment)!,this.long.points.map(p=>p.clone()),fragment.points.map(p=>p.clone()));
        resolveStrandPair(this.short,fragment,subPins.get(this.short)!,subPins.get(fragment)!,this.short.points.map(p=>p.clone()),fragment.points.map(p=>p.clone()));
      }
      const driver=tools.find(t=>t.kind==='needle-driver')!;
      this.passage.update(this.long.points,this.short.points.at(-1)!,driver.root.matrixWorld,this.gripLabel(driver.id)==='short tail',this.nextMaterialIndex,this.observationWraps,this.short.points);
      const longGrip=[...this.grips.values()].find(g=>g.strand===this.long)?.index;
      const shortGrip=[...this.grips.values()].find(g=>g.strand===this.short && g.index>=this.short.count-4)?.index;
      const postStart=this.retainedThrow.active?this.retainedThrow.shortMaterialCoordinate:0;
      this.postTaut=postIsTaut(this.short,shortGrip,postStart);
      const event=this.passage.passage;
      if(event&&this.sequence&&!this.sequence.acceptsGeometry(event.wraps,event.direction)){
        this.feedback=`Use ${this.sequence.requiredWraps} wrap(s)${this.sequence.requiredDirection?' in the requested direction':''}`;this.passage.reset();
      }else if(event&&this.recorded){
        const minimum=this.retainedThrow.last+2;this.earlierThrows.push(this.retainedThrow);this.retainedThrow=new FreeThrow();this.retainedThrow.feedFromWorkingEnd=true;this.retainedThrow.minimumMaterialIndex=minimum;this.recorded=false;this.feedback='';
      }
      const validEvent=!this.sequence||!event||this.sequence.acceptsGeometry(event.wraps,event.direction);
      this.retainedThrow.sliding=!!this.sequence?.sliding&&this.postTaut;
      if(validEvent)this.retainedThrow.update(step,this.passage,this.long,this.short,driver.root.matrixWorld,longGrip,shortGrip);
      const constraints=[...this.earlierThrows,this.retainedThrow];
      for(const previous of this.earlierThrows){
        previous.sliding=!!this.sequence?.sliding&&this.postTaut;
        if(previous.sliding)previous.update(step,this.passage,this.long,this.short,driver.root.matrixWorld,longGrip,shortGrip);
      }
      const activeConstraints=constraints.filter(t=>t.active);
      const contactSweeps=activeConstraints.some(t=>t.phase!=='seated')?16:4;
      if(activeConstraints.length)for(let iteration=0;iteration<contactSweeps;iteration++){
        for(const constraint of activeConstraints)constraint.resolve(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!);
        for(const strand of this.strands)strand.projectContacts(subPins.get(strand)!,this.supportAt,(p,previous,pinned,start)=>this.contact.resolve(p,previous,pinned,{from:(n+1)/steps,to:(n+1)/steps,start},exemptions.get(strand)),iteration%2!==0);
        resolveStrandPair(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!);
      }
      this.retainedThrow.assessSeating(this.long,this.short);
      if(this.sequence&&this.retainedThrow.phase==='seated'&&!this.recorded){
        if(this.sequence.seat({wraps:this.retainedThrow.wraps,direction:this.retainedThrow.direction,postHeld:this.postTaut})){
          this.recorded=true;this.passage.reset();this.feedback='';
          if(this.sequence.locked)for(const constraint of constraints)constraint.sliding=false;
        }else{this.retainedThrow.phase='retained';this.feedback='Hold the short post taut before seating';}
      }
      for(const constraint of constraints)constraint.dampSeatedMotion(this.long,this.short);
      for(const grip of this.grips.values())grip.strand.dampMotion(grip.index-12,grip.index+12,.2);
      for(const strand of this.strands)strand.dampInternalMotion();
      this.accumulator-=step;
    }
    if(steps===0)for(const strand of this.strands)strand.advance(0,pins.get(strand)!,this.supportAt);

    const driver=tools.find(t=>t.kind==='needle-driver')!;
    this.winding=shaftWinding(this.long.points,driver.root.matrixWorld);
    this.passage.update(this.long.points,this.short.points.at(-1)!,driver.root.matrixWorld,this.gripLabel(driver.id)==='short tail',this.nextMaterialIndex,this.observationWraps,this.short.points);
  }
  gripLabel(id:string) {
    const grip=this.grips.get(id);if(!grip)return 'free';
    if(grip.strand!==this.long&&grip.strand!==this.short)return 'cut-off strand';
    return grip.strand===this.long?'long strand':grip.index>=this.short.count-4?'short tail':'short strand body';
  }
  get reachLimited() {
    if(this.long.measuredLength>this.long.length*1.04 || this.short.measuredLength>this.short.length*1.04)return true;
    for(const grip of this.grips.values()) {
      if(grip.strand!==this.long&&grip.strand!==this.short)continue;
      const start=grip.strand===this.long?this.exit:this.entry;
      if(start.distanceTo(grip.strand.points[grip.index])>grip.strand.restLength*grip.index+0.03)return true;
    }
    return false;
  }
  reset() {this.short=new ThreadStrand(1.2,40);this.fragments.length=0;this.cutMessage='';this.earlierThrows.length=0;this.retainedThrow=new FreeThrow();this.sequence=undefined;this.recorded=false;this.postTaut=false;this.feedback='';this.passage.reset();this.contact=new InstrumentThreadContact();this.active=false;this.grips.clear();this.lastOpen.clear();this.winding=0;this.driverOnTissue=false;this.accumulator=0;}
}
