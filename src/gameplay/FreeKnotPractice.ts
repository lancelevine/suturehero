import {TRACT_HALF_WIDTH} from '../tissue/sutureTract';
import {StrandTension,limitSlackTakeUp} from '../suture/StrandTension';
import {throwsAreStacked} from '../suture/KnotStack';
import {postIsTaut} from '../suture/PostTension';
import {KnotTissueSeat,stitchSupport} from '../suture/KnotTissueSeat';
import {THREAD_RADIUS} from '../suture/threadMaterial';
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
  readonly tension={long:new StrandTension(),short:new StrandTension()};
  get pullDemand(){return Math.max(this.tension.long.demand,this.tension.short.demand);}
  get tensionHint(){return `Long: ${this.tension.long.state} · Short: ${this.tension.short.state}${this.pullDemand>.45?' · Ease the pull':this.tension.long.state==='gentle'&&this.tension.short.state==='gentle'?' · Gentle opposing tension':''}`;}
  winding=0;
  driverOnTissue=false;
  readonly passage=new TailPassage();
  retainedThrow=new FreeThrow();
  readonly earlierThrows:FreeThrow[]=[];
  sequence?:KnotTechniqueSequence|InferredKnotSequence;
  postTaut=false;
  readonly tissueSeat=new KnotTissueSeat();
  private get firstKnot(){return this.earlierThrows.find(t=>t.active)??(this.retainedThrow.active?this.retainedThrow:undefined);}
  get closureLoad(){return this.tissueSeat.load*(this.lockSeated?1:.85);}
  get lockSeated(){
    if(!this.sequence?.locked)return false;
    const minimum=this.sequence.technique==='sliding'?3:2;
    return this.sequence.throws.some((t,i)=>i>=minimum-1&&i<this.seatedThrowCount&&t.wraps===1&&t.direction!==this.sequence!.throws[i-1].direction);
  }
  readonly fragments:ThreadStrand[]=[];
  cutMessage='';
  readonly trimmedTails=new Set<ThreadStrand>();
  get nextTrimTarget(){return [this.long,this.short].find(s=>!this.trimmedTails.has(s)&&this.minimumCut(s)<s.count-3);}
  get trimHint(){return this.lockSeated||this.trimmedTails.size?`Tails trimmed: ${this.trimmedTails.size}/2`:'';}
  get strands(){return [this.long,this.short,...this.fragments];}
  minimumCut(strand:ThreadStrand){
    const knots=[...this.earlierThrows,this.retainedThrow].filter(t=>t.active||t.phase==='passed');
    if(strand===this.long)return Math.max(2,...knots.map(t=>t.last+3));
    if(strand===this.short)return Math.max(2,...knots.map(t=>Math.ceil(t.protectedPostCoordinate)+3));
    return 2;
  }
  cut(strand:ThreadStrand,coordinate:number){
    if(coordinate<this.minimumCut(strand)){this.cutMessage='Too close to the loop or knot · Leave a tail';return false;}
    const split=strand.splitAt(coordinate);
    if(!split){this.cutMessage='Place thread between the blade edges, away from its endpoint';return false;}
    for(const grip of this.grips.values())if(grip.strand===strand&&grip.index>=split.firstDetachedIndex){grip.strand=split.fragment;grip.index-=split.firstDetachedIndex-1;}
    if(strand===this.long||strand===this.short)this.trimmedTails.add(strand);
    this.fragments.push(split.fragment);this.cutMessage=`${strand===this.long?'Long tail':strand===this.short?'Short tail':'Offcut'} cut · Offcut remains separate`;return true;
  }
  surfaceAt=threadSurfaceAt;
  threadFloorAt?:typeof threadSurfaceAt;
  tissueContact?:StrandObstacle;
  driverObstacle?:(radius:number)=>StrandObstacle;
  private recorded=false;
  private seatingArmed=false;
  private groundedThrows=new Set<FreeThrow>();
  private bearingTime=0;
  private feedback='';
  private get nextMaterialIndex(){return this.recorded?this.retainedThrow.last+2:this.earlierThrows.length?Math.max(...this.earlierThrows.map(t=>t.last))+2:1;}
  // Search free working material, not the tissue anchor or the held endpoint.
  // Including the grasp could mask a valid earlier turn with an unusable span.
  private get maximumOpeningIndex(){return ([...this.grips.values()].find(g=>g.strand===this.long)?.index??this.long.count-1)-1;}
  private get observationWraps(){return this.retainedThrow.phase==='retained'&&!this.recorded?this.retainedThrow.wraps:this.sequence?.requiredWraps??1;}
  get instruction(){return this.sequence?`${this.sequence.label} · ${this.sequence.throws.length} throws tightened · ${(this.sequence.locked?(this.lockSeated?'Opposing lock seated · Alternate later throws':'Opposing throw formed · Lower and tighten it onto the existing knot'):this.sequence.instruction)}${this.sequence.sliding?' · Short post: '+(this.postTaut?'taut':'take up slack'):''}${this.feedback?' · '+this.feedback:''}${this.trimHint?' · '+this.trimHint:''}`:'Free first throw';}
  private get seatedThrowCount(){
    if(!this.tissueSeat.contact||this.tissueSeat.load<.5)return 0;
    const knots=[...this.earlierThrows,this.retainedThrow].filter(t=>t.active);
    let count=0;
    for(let i=0;i<knots.length;i++){
      if(knots[i].phase!=='seated'||i>0&&!throwsAreStacked(knots[i-1],knots[i],this.long,this.short))break;
      count++;
    }
    return count;
  }
  get knotAtTissue(){
    const knots=[...this.earlierThrows,this.retainedThrow].filter(t=>t.active);
    return this.retainedThrow.active&&knots.length>0&&this.seatedThrowCount===knots.length;
  }
  get handlingHint(){
    const knot=this.retainedThrow;
    if(knot.phase==='seated'&&this.knotAtTissue){
      if(this.lockSeated)return 'Opposing lock seated · Alternate later throws or trim the free tails';
      if(this.sequence?.technique==='sliding'&&this.sequence.throws.length>=2)return 'Sliding start seated · Keep the short post taut, then add an opposing throw';
      return 'Throw seated at tissue · Regrasp and prepare the next throw';
    }
    if(knot.phase==='seated'&&this.tissueSeat.contact&&this.tissueSeat.load<.5)return 'Knot touching tissue · Take up the remaining tissue-side slack';
    if(knot.phase==='seated'&&this.earlierThrows.length&&!this.knotAtTissue)return knot.seatingRequested?'Seating next throw · Keep both ends taut and lower toward the existing knot':'Next throw tightened · Lower both ends and pull gently apart to seat it on the knot';
    if(knot.phase==='seated'&&!this.knotAtTissue)return knot.seatingRequested?'Seating throw · Keep the post taut and ease the working end toward the tissue':'Throw tightened · Lower both ends toward the stitch and keep gentle opposing tension';
    if(knot.phase==='retained'){
      if(![...this.grips.values()].some(g=>g.strand===this.long))return 'Throw retained · Regrasp the long strand with the forceps';
      if(![...this.grips.values()].some(g=>g.strand===this.short&&g.index>=this.short.count-4))return 'Throw retained · Regrasp the gold short end with the driver';
      if(this.reachLimited)return 'Throw retained · Ease the pull; thread is at its reach limit';
    }
    if(knot.phase!=='idle'||knot.lastFailure)return knot.instruction;
    if(this.passage.hasOpening&&this.gripLabel('right')==='short strand body')return 'Wrap detected · Move the driver grip to the gold short end';
    return this.passage.hasOpening?this.passage.state:this.passage.lastFailure||'Make a complete wrap around the driver · Then pull the gold end through';
  }
  private gripRequests=new Map<string,{strand:ThreadStrand;index:number;request:THREE.Vector3;limiting:boolean}>();
  private lastOpen=new Map<string,number>();
  private contact=new InstrumentThreadContact();
  private accumulator=0;
  padOffsetZ=0;
  tractHalfWidth=TRACT_HALF_WIDTH;
  private skinTopAt=(p:THREE.Vector3)=>this.surfaceAt(p);
  private skinContact=skinThreadContact(point=>this.contact.supportAt(point,this.skinTopAt),()=>this.padOffsetZ);
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
    const base=this.driverObstacle?this.threadFloorAt??this.surfaceAt:this.surfaceAt;
    const supported=this.tissueSeat.contact?[...this.earlierThrows,this.retainedThrow].filter(t=>t.active).slice(0,Math.max(1,this.seatedThrowCount)):[];
    const core=supported.flatMap(k=>this.long.points.slice(k.first,k.last+1));
    const bounds=core.length?new THREE.Box3().setFromPoints(core).expandByScalar(.035):undefined;
    const floor=(p:THREE.Vector3)=>{
      let height=base(p);
      // A shallow skin overlap still permits tail pickup away from the knot.
      // Over a tissue-supported core, the metal must clear the thread instead
      // of repeatedly squeezing it into the pad's indentation allowance.
      if(bounds&&p.x>=bounds.min.x&&p.x<=bounds.max.x&&p.z>=bounds.min.z&&p.z<=bounds.max.z)for(const q of core){
        if(Math.hypot(p.x-q.x,p.z-q.z)<.035)height=Math.max(height,q.y+THREAD_RADIUS+(this.driverObstacle?0:.04));
      }
      return height;
    };
    let constrained=this.contact.constrainDriverToSurface(tool,floor,this.driverObstacle?0:.04);
    if(this.driverObstacle&&tool.kind==='needle-driver'){
      this.contact.configure(tools,true);constrained=this.contact.constrainDriverToObstacle(tool,this.driverObstacle)||constrained;
      constrained=this.contact.constrainDriverToSurface(tool,floor,0)||constrained;
    }
    return constrained;
  }
  private supportSeatedCore(knot:FreeThrow,pinsLong:ReadonlyMap<number,THREE.Vector3>,pinsShort:ReadonlyMap<number,THREE.Vector3>){
    if(knot.phase!=='seated')return;
    const support=(strand:ThreadStrand,index:number,pins:ReadonlyMap<number,THREE.Vector3>)=>{
      const p=strand.points[index];
      if(pins.has(index)||p.y<Math.min(this.entry.y,this.exit.y)-.08)return;
      const lift=stitchSupport(p,this.entry,this.exit,this.surfaceAt)-p.y;
      if(lift>0){strand.applyContactCorrection(index,new THREE.Vector3(0,lift,0));strand.dampMotion(index,index,.35);}
    };
    for(let i=knot.first;i<=knot.last;i++)support(this.long,i,pinsLong);
    const coordinate=knot.shortMaterialCoordinate;support(this.short,Math.floor(coordinate),pinsShort);support(this.short,Math.ceil(coordinate),pinsShort);
  }
  private constrainHeldPair(tools:readonly Instrument[]){
    const held=(strand:ThreadStrand)=>tools.map(tool=>({tool,grip:this.grips.get(tool.id)})).find(item=>item.grip?.strand===strand);
    const long=held(this.long),short=held(this.short);
    if(!long?.grip||!short?.grip)return;
    const knots=[...this.earlierThrows,this.retainedThrow].filter(k=>k.active);
    if(!knots.length)return;
    const longGrip=long.grip,shortGrip=short.grip;
    const rootBudget=this.long.materialLengthBetween(0,longGrip.index)-knots.filter(k=>k.last<longGrip.index).reduce((sum,k)=>sum+this.long.materialLengthBetween(k.first,k.last),0);
    const limit=(item:typeof long,anchor:THREE.Vector3,material:number)=>{
      const point=item.tool.root.localToWorld(item.grip!.local.clone()),delta=point.sub(anchor),distance=delta.length(),radius=material*1.005;
      if(distance>radius)item.tool.root.position.addScaledVector(delta,radius/distance-1);
      item.tool.root.updateWorldMatrix(true,false);
    };
    let reach=Infinity,longShare=.5;
    for(const knot of knots){
      if(long.grip.index<=knot.last||short.grip.index<=knot.shortMaterialCoordinate)continue;
      const a=this.long.materialLengthBetween(knot.last,long.grip.index),b=this.short.materialLengthBetween(knot.shortMaterialCoordinate,short.grip.index);
      if(a+b<reach){reach=a+b;longShare=a/(a+b);}
    }
    // Both held tails share one finite path through the crossing. Limiting
    // them against stale collar positions independently lets the tools and
    // collar chase one another beyond the short post's total material.
    for(let iteration=0;iteration<8;iteration++){
      limit(long,this.exit,rootBudget);limit(short,this.entry,this.short.materialLengthBetween(0,shortGrip.index));
      for(const knot of knots){
        if(longGrip.index<=knot.last||shortGrip.index<=knot.shortMaterialCoordinate)continue;
        const previousLoops=knots.filter(k=>k!==knot&&k.last<=knot.first).reduce((sum,k)=>sum+this.long.materialLengthBetween(k.first,k.last),0);
        limit(long,this.entry,this.short.materialLengthBetween(0,knot.shortMaterialCoordinate)+this.long.materialLengthBetween(knot.last,longGrip.index));
        limit(short,this.exit,this.long.materialLengthBetween(0,knot.first)-previousLoops+this.short.materialLengthBetween(knot.shortMaterialCoordinate,shortGrip.index));
      }
      const a=long.tool.root.localToWorld(long.grip.local.clone()),b=short.tool.root.localToWorld(short.grip.local.clone()),delta=b.sub(a),distance=delta.length();
      if(distance>reach*1.005){
        delta.multiplyScalar((distance-reach*1.005)/distance);
        long.tool.root.position.addScaledVector(delta,longShare);short.tool.root.position.addScaledVector(delta,-(1-longShare));
        long.tool.root.updateWorldMatrix(true,false);short.tool.root.updateWorldMatrix(true,false);
      }
    }
  }
  private heldArm(strand:ThreadStrand,index:number){
    const coordinates=[...this.earlierThrows,this.retainedThrow].filter(k=>k.active).map(k=>strand===this.long?k.last:k.shortMaterialCoordinate).filter(c=>c<index);
    const start=Math.max(0,...coordinates);
    return {anchor:strand.pointAt(start),material:strand.materialLengthBetween(start,index)};
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
    const paired=[this.long,this.short].every(strand=>[...this.grips.values()].some(grip=>grip.strand===strand));
    if(!paired){
      this.seatingArmed=false;
      // Releasing a seated start ends draw-down, including partial bearing.
      // Regrasping must not reallocate its post merely to reach raised tools.
      if(this.sequence?.sliding)for(const knot of [...this.earlierThrows,this.retainedThrow].filter(t=>t.active).slice(0,this.seatedThrowCount))this.groundedThrows.add(knot);
    }
    for(const id of this.gripRequests.keys())if(!this.grips.has(id))this.gripRequests.delete(id);
    const demands=new Map<ThreadStrand,number>();
    for(const tool of tools) {
      const grip=this.grips.get(tool.id);if(!grip)continue;
      const target=tool.root.localToWorld(grip.local.clone());
      if(grip.strand===this.long||grip.strand===this.short){
        const arm=this.heldArm(grip.strand,grip.index);
        demands.set(grip.strand,Math.max(0,target.distanceTo(arm.anchor)-arm.material)/grip.strand.restLength);
        const raw=target.clone(),old=this.gripRequests.get(tool.id),same=old?.strand===grip.strand&&old.index===grip.index;
        const limiting=!!same&&((old.limiting&&raw.distanceTo(grip.strand.points[grip.index])>grip.strand.restLength*3)||raw.distanceTo(old.request)>grip.strand.restLength*3);
        if(limiting)limitSlackTakeUp(grip.strand.points[grip.index],target,arm.anchor,arm.material,grip.strand.restLength,dt);
        this.gripRequests.set(tool.id,{strand:grip.strand,index:grip.index,request:raw,limiting});
      }
      const limitReach=(anchor:THREE.Vector3,length:number)=>{
        const delta=target.clone().sub(anchor),distance=delta.length();
        if(distance>length)target.copy(anchor).addScaledVector(delta,length/distance);
      };
      if(grip.strand===this.long||grip.strand===this.short){
        limitReach(grip.strand===this.long?this.exit:this.entry,grip.strand.materialLengthBetween(0,grip.index)*1.02);
        for(const knot of [...this.earlierThrows,this.retainedThrow])if(knot.active&&!paired){
          const coordinate=grip.strand===this.long?knot.last:knot.shortMaterialCoordinate;
          if(grip.index>coordinate)limitReach(grip.strand.pointAt(coordinate),grip.strand.materialLengthBetween(coordinate,grip.index)*1.02);
        }
      }
      const requested=tool.root.localToWorld(grip.local.clone());
      tool.root.position.add(target.clone().sub(requested));tool.root.updateWorldMatrix(true,false);
      const allowed=this.contact.constrainGrip(tool.id,grip.strand.points[grip.index],target);
      tool.root.position.add(allowed.sub(target));tool.root.updateWorldMatrix(true,false);
    }
    this.constrainHeldPair(tools);
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
      this.passage.update(this.long.points,this.short.points.at(-1)!,driver.root.matrixWorld,this.gripLabel(driver.id)==='short tail',this.nextMaterialIndex,this.observationWraps,this.short.points,this.maximumOpeningIndex);
      const longGrip=[...this.grips.values()].find(g=>g.strand===this.long)?.index;
      const shortGrip=[...this.grips.values()].find(g=>g.strand===this.short && g.index>=this.short.count-4)?.index;
      const postStart=this.retainedThrow.active?this.retainedThrow.shortMaterialCoordinate:0;
      this.postTaut=postIsTaut(this.short,shortGrip,postStart);
      const event=this.passage.passage;
      if(event&&this.sequence&&!this.sequence.acceptsGeometry(event.wraps,event.direction)){
        this.feedback=`Use ${this.sequence.requiredWraps} wrap(s)${this.sequence.requiredDirection?' in the requested direction':''}`;this.passage.reset();
      }else if(event&&this.recorded){
        const minimum=this.retainedThrow.last+2;this.earlierThrows.push(this.retainedThrow);this.retainedThrow=new FreeThrow();this.retainedThrow.feedFromWorkingEnd=true;this.retainedThrow.minimumMaterialIndex=minimum;this.retainedThrow.minimumPostCoordinate=this.tissueSeat.contact?this.earlierThrows.at(-1)!.shortMaterialCoordinate+1:1;this.recorded=false;this.feedback='';
      }
      const validEvent=!this.sequence||!event||this.sequence.acceptsGeometry(event.wraps,event.direction);
      const driverSupportsLoop=(points:readonly THREE.Vector3[],normal:THREE.Vector3)=>this.contact.supportsOpening(driver.id,points,normal);
      const driverAxis=new THREE.Vector3(0,0,1).transformDirection(driver.root.matrixWorld);
      const stitchHeight=(this.entry.y+this.exit.y)*.5;
      const lowHands=longGrip!==undefined&&shortGrip!==undefined&&[this.long.points[longGrip],this.short.points[shortGrip]].every(p=>p.y<stitchHeight+.2&&p.y>stitchHeight-.1);
      if(paired&&(this.retainedThrow.phase==='passed'||this.retainedThrow.phase==='retained'||this.retainedThrow.active&&!lowHands))this.seatingArmed=true;
      const workingTaut=longGrip!==undefined&&this.retainedThrow.active&&this.long.points[this.retainedThrow.last].distanceTo(this.long.points[longGrip])>=this.long.materialLengthBetween(this.retainedThrow.last,longGrip)*.92;
      // A surgeon's captured opposing lock can leave a curved short arm after regrasp.
      // Requested post load must be able to start draw-down; requiring an
      // already straight post here can deadlock against the paired reach limit.
      // Sliding starts must keep actual post tautness through their lock.
      const postLoaded=this.postTaut||!!this.sequence?.locked&&this.sequence.technique==='surgeon'&&this.tension.short.demand>.45;
      this.retainedThrow.seatingRequested=!this.groundedThrows.has(this.retainedThrow)&&this.seatingArmed&&this.retainedThrow.phase==='seated'&&(!this.earlierThrows.length?this.tissueSeat.load<.99:this.tissueSeat.contact&&!this.knotAtTissue)&&lowHands&&workingTaut&&postLoaded;
      if(this.earlierThrows.length&&(this.sequence?.sliding||this.tissueSeat.contact)){
        const previous=this.earlierThrows.at(-1)!;
        this.retainedThrow.minimumMaterialIndex=previous.last+2;
        if(this.tissueSeat.contact)this.retainedThrow.minimumPostCoordinate=previous.shortMaterialCoordinate+1;
      }
      this.retainedThrow.sliding=!!this.sequence?.sliding&&this.postTaut&&!this.groundedThrows.has(this.retainedThrow);
      if(validEvent)this.retainedThrow.update(step,this.passage,this.long,this.short,driverSupportsLoop,longGrip,shortGrip,driverAxis);
      const constraints=[...this.earlierThrows,this.retainedThrow];
      for(const previous of this.earlierThrows){
        previous.seatingRequested=!this.groundedThrows.has(previous)&&this.seatingArmed&&!!this.sequence?.sliding&&lowHands&&workingTaut&&this.postTaut&&this.tissueSeat.load<.99;
        previous.sliding=!!this.sequence?.sliding&&this.postTaut&&!this.groundedThrows.has(previous);
        if(previous.sliding||previous.seatingRequested)previous.update(step,this.passage,this.long,this.short,driverSupportsLoop,longGrip,shortGrip);
        else previous.advanceEngagement(step);
      }
      const activeConstraints=constraints.filter(t=>t.active||t.phase==='passed');
      const contactSweeps=activeConstraints.some(t=>t.phase==='retained')?16:activeConstraints.some(t=>t.active)?4:2;
      if(activeConstraints.length)for(let iteration=0;iteration<contactSweeps;iteration++){
        for(const constraint of activeConstraints)constraint.resolve(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!);
        for(const strand of this.strands)strand.projectContacts(subPins.get(strand)!,this.supportAt,(p,previous,pinned,start)=>this.contact.resolve(p,previous,pinned,{from:(n+1)/steps,to:(n+1)/steps,start},exemptions.get(strand)),iteration%2!==0);
        resolveStrandPair(this.long,this.short,subPins.get(this.long)!,subPins.get(this.short)!);
        for(const constraint of activeConstraints)this.supportSeatedCore(constraint,subPins.get(this.long)!,subPins.get(this.short)!);
      }
      this.retainedThrow.assessSeating(this.long,this.short);
      this.tissueSeat.update(this.firstKnot,this.long,this.short,this.entry,this.exit,this.surfaceAt);
      // Once a throw bears in the seated stack, preserve its material collar
      // through regrasping; transient contact loss must not restart feeding.
      // Let the tissue portals finish moving before freezing a sliding post.
      // A single full-load substep can occur before closure creates new slack.
      this.bearingTime=this.tissueSeat.contact&&this.tissueSeat.load>=.99?this.bearingTime+step:0;
      if(this.sequence?.sliding&&this.bearingTime>=.3)for(const knot of constraints.filter(t=>t.active).slice(0,this.seatedThrowCount))this.groundedThrows.add(knot);
      if(this.sequence&&this.retainedThrow.phase==='seated'&&!this.recorded){
        if(this.sequence.seat({wraps:this.retainedThrow.wraps,direction:this.retainedThrow.direction,postHeld:this.postTaut})){
          this.recorded=true;this.passage.reset();this.feedback='';
          if(this.sequence.locked)for(const constraint of constraints)constraint.sliding=false;
        }else{this.retainedThrow.phase='retained';this.feedback='Hold the short post taut before seating';}
      }
      for(const constraint of constraints)constraint.dampRetainedMotion(this.long,this.short);
      for(const grip of this.grips.values())grip.strand.dampMotion(grip.index-12,grip.index+12,.2);
      for(const strand of this.strands)strand.dampInternalMotion();
      this.accumulator-=step;
    }
    if(steps===0)for(const strand of this.strands)strand.advance(0,pins.get(strand)!,this.supportAt);

    for(const [strand,feedback] of [[this.long,this.tension.long],[this.short,this.tension.short]] as const){
      const grip=[...this.grips.values()].find(g=>g.strand===strand);
      const arm=grip?this.heldArm(strand,grip.index):undefined;
      feedback.update(dt,grip&&arm?strand.points[grip.index].distanceTo(arm.anchor)/Math.max(arm.material,1e-9):0,demands.get(strand)??0,!!grip);
    }
    const driver=tools.find(t=>t.kind==='needle-driver')!;
    this.winding=shaftWinding(this.long.points,driver.root.matrixWorld);
    this.passage.update(this.long.points,this.short.points.at(-1)!,driver.root.matrixWorld,this.gripLabel(driver.id)==='short tail',this.nextMaterialIndex,this.observationWraps,this.short.points,this.maximumOpeningIndex);
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
  reset() {this.short=new ThreadStrand(1.2,40);this.fragments.length=0;this.cutMessage='';this.trimmedTails.clear();this.earlierThrows.length=0;this.retainedThrow=new FreeThrow();this.tissueSeat.reset();this.sequence=undefined;this.recorded=false;this.seatingArmed=false;this.groundedThrows.clear();this.bearingTime=0;this.tension.long.reset();this.tension.short.reset();this.gripRequests.clear();this.postTaut=false;this.feedback='';this.passage.reset();this.contact=new InstrumentThreadContact();this.active=false;this.grips.clear();this.lastOpen.clear();this.winding=0;this.driverOnTissue=false;this.accumulator=0;}
}
