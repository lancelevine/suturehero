import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import {THREAD_CONTACT_DISTANCE} from './threadMaterial';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import type {TailPassage} from './TailPassage';

/** Material-space approximation of one retained instrument throw. No posed tools,
 * replacement thread mesh or calibrated knot-security/force claim. */
export class FreeThrow {
  wraps=1;direction=0;sliding=false;
  feedFromWorkingEnd=false;
  minimumMaterialIndex=1;
  private proximalSlack(long:ThreadStrand){
    const anchor=Math.max(0,this.minimumMaterialIndex-1);
    return (this.first-anchor)*long.restLength-long.points[this.first].distanceTo(long.points[anchor]);
  }
  phase:'idle'|'passed'|'retained'|'seated'='idle';
  first=0;last=0;
  private initialSegments=0;
  private minimumSegments=6;
  private shortCoordinate=0;
  private exitSide=1;
  private passageVia:'tip'|'strand'='tip';
  private pullDistance?:number;
  private feed=0;
  private feedTime=0;
  private alternate=false;
  private retentionAge=0;
  private notice='';
  private noticeTime=0;
  private captureHint='';
  seatingHint='Pull the two held ends apart to tighten';
  private longCorrections?:Float64Array;
  private shortCorrections?:Float64Array;
  private normal=new THREE.Vector3(0,0,1);
  private postLimit(short:ThreadStrand,grip:number){
    // A collar cannot slide all the way into the closed driver jaws.
    // Preserve enough held post for the knot to clear the metal while seating.
    return Math.max(1,Math.min(short.count-2,grip-Math.ceil(.2/short.restLength)));
  }
  get shortMaterialCoordinate(){return this.shortCoordinate;}
  get active(){return this.phase==='retained'||this.phase==='seated';}
  get tightness(){return this.active?THREE.MathUtils.clamp((this.initialSegments-(this.last-this.first))/Math.max(1,this.initialSegments-this.minimumSegments),0,1):0;}
  get lastFailure(){return this.notice;}
  get instruction(){return this.phase==='seated'?'One free throw seated · Retention is approximate':this.phase==='retained'?`Throw retained · ${this.seatingHint}`:this.phase==='passed'?`Tail through · ${this.captureHint||'Pull it clear of the driver to capture the throw'}`:this.notice||'Form a wrap, grasp the short tail and pull it through';}
  advanceEngagement(dt:number){
    this.longCorrections?.fill(0);this.shortCorrections?.fill(0);
    if(this.active)this.retentionAge+=Math.max(0,Math.min(dt,.05));
  }
  reset(reason=''){this.phase='idle';this.first=this.last=this.initialSegments=0;this.pullDistance=undefined;this.feed=this.feedTime=this.retentionAge=0;this.captureHint='';this.seatingHint='Pull the two held ends apart to tighten';this.notice=reason;this.noticeTime=reason?3:0;}
  private center(long:ThreadStrand){const center=new THREE.Vector3();for(let i=this.first;i<=this.last;i++)center.add(long.points[i]);return center.divideScalar(this.last-this.first+1);}
  private nearest(short:ThreadStrand,point:THREE.Vector3,around?:number){
    let distance=Infinity,coordinate=0;
    for(let i=1;i<short.count-1;i++){
      if(around!==undefined && Math.abs(i-around)>3)continue;
      const line=new THREE.Line3(short.points[i],short.points[i+1]),t=line.closestPointToPointParameter(point,true),near=line.at(t,new THREE.Vector3()),d=near.distanceToSquared(point);
      if(d<distance){distance=d;coordinate=i+t;}
    }
    return {coordinate,distance:Math.sqrt(distance)};
  }
  update(dt:number,passage:TailPassage,long:ThreadStrand,short:ThreadStrand,driver:THREE.Matrix4,longGrip:number|undefined,shortGrip:number|undefined){
    this.noticeTime=Math.max(0,this.noticeTime-Math.max(0,dt));if(!this.noticeTime)this.notice='';
    const wasActive=this.active;this.advanceEngagement(dt);
    if((this.phase==='idle'||this.phase==='passed'&&passage.passage&&passage.passage.wraps>this.wraps) && passage.passage){
      const event=passage.passage;
      if(event.first<1 || event.last-event.first<7 || event.last>=long.count-1){this.notice='Leave free working thread beyond a complete wrap';this.noticeTime=3;return;}
      this.notice='';this.captureHint='';
      this.passageVia=event.via;this.wraps=event.wraps;this.direction=event.direction;this.minimumSegments=this.wraps*6;
      this.first=event.first;this.last=event.last;this.initialSegments=this.last-this.first;this.exitSide=event.side;this.normal.copy(event.normal);this.phase='passed';
    }
    if(this.phase==='idle'||this.phase==='seated'&&!this.sliding){this.pullDistance=undefined;return;}
    const center=this.center(long),nearest=this.nearest(short,center,this.active?this.shortCoordinate:undefined);
    if(this.phase==='passed'){
      if(shortGrip===undefined){this.reset('Short tail released · Regrasp the gold end and pass it through the loop');passage.reset();return;}
      const liveNormal=new THREE.Vector3();
      for(let i=this.first;i<=this.last;i++)liveNormal.add(long.points[i].clone().sub(center).cross(long.points[i===this.last?this.first:i+1].clone().sub(center)));
      if(this.wraps===1&&liveNormal.lengthSq()>1e-8){
        liveNormal.normalize();
        if(liveNormal.dot(this.normal)<0)liveNormal.negate();
        this.normal.copy(liveNormal);
      }
      const crossingCenter=center.clone();
      if(this.wraps>1){const axis=this.normal.clone().multiplyScalar(this.direction);let leading=Infinity;for(let i=this.first;i<=this.last;i++)leading=Math.min(leading,long.points[i].dot(axis));crossingCenter.addScaledVector(axis,leading-crossingCenter.dot(axis));}
      const side=short.points.at(-1)!.clone().sub(crossingCenter).dot(this.normal);
      if(this.passageVia==='tip'&&side*this.exitSide< -0.02){this.reset('Tail moved back out · Pull the gold end completely through the loop');passage.reset();return;}
      const inverse=driver.clone().invert(),local=center.clone().applyMatrix4(inverse);
      let radius=0,depth=0;for(let i=this.first;i<=this.last;i++){
        const p=long.points[i].clone().applyMatrix4(inverse);radius=Math.max(radius,Math.hypot(p.x-local.x,p.y-local.y));depth=Math.max(depth,Math.abs(p.z-local.z));
      }
      const clear=local.z+depth< -0.07 || local.z-depth>3.4 || Math.hypot(local.x,local.y)>radius+0.16;
      this.captureHint=clear?'Keep the short strand through the loop while pulling clear':'Slide the loop clear of the driver working tip';
      if(clear && nearest.coordinate<=short.count-2 && nearest.distance<Math.max(short.restLength*6*this.wraps,radius)){
        this.shortCoordinate=Math.min(nearest.coordinate,this.postLimit(short,shortGrip));this.phase='retained';this.pullDistance=undefined;
      }else return;
    }
    if(!wasActive)this.advanceEngagement(dt);
    if((this.phase!=='seated'||this.sliding)&&longGrip!==undefined&&shortGrip!==undefined){
      const travel=.8*Math.max(0,Math.min(dt,.05))/short.restLength;
      const proximal=center.distanceTo(short.points[0]),distal=center.distanceTo(short.points[shortGrip]);
      // Allocate actual material between the two arms. Repeatedly choosing
      // the nearest deformed particle made a stationary collar ratchet along
      // the post and leave impossible, overstretched spans behind it.
      const maximum=this.postLimit(short,shortGrip);
      const desired=THREE.MathUtils.clamp(shortGrip*proximal/Math.max(1e-9,proximal+distal),Math.min(maximum,proximal/short.restLength),maximum);
      this.shortCoordinate+=THREE.MathUtils.clamp(desired-this.shortCoordinate,-travel,travel);
    }
    this.assessSeating(long,short);
    if(longGrip===undefined||shortGrip===undefined){this.pullDistance=undefined;return;}
    const separation=long.points[longGrip].distanceTo(short.points[shortGrip]);
    if(this.pullDistance!==undefined)this.feed+=Math.max(0,separation-this.pullDistance)*(this.feedFromWorkingEnd?1.3:.8)/PRACTICE_SETUP.suture.friction;
    const heldMaterial=long.materialLengthBetween(this.last,longGrip)+short.materialLengthBetween(this.shortCoordinate,shortGrip);
    if(this.phase==='retained'&&separation>=heldMaterial*.97){
      // Taut held arms can draw material from the loop even while reach
      // limits prevent further endpoint travel. Otherwise a valid crossing
      // stalls precisely when both instruments put it under tension.
      this.feed+=.4*Math.max(0,Math.min(dt,.05))/PRACTICE_SETUP.suture.friction;
    }
    this.pullDistance=separation;this.feedTime+=Math.max(0,Math.min(dt,0.05));
    // Feed existing particles from the loop into its exterior arms; total
    // strand material and the grasped material indices remain unchanged.
    if(this.feed>=long.restLength && this.feedTime>=0.05 && (this.last-this.first>this.minimumSegments || this.feedFromWorkingEnd&&this.first>this.minimumMaterialIndex&&this.proximalSlack(long)>long.restLength*2)){
      if(this.feedFromWorkingEnd && this.first>this.minimumMaterialIndex && this.proximalSlack(long)>long.restLength*2){this.first--;this.last--;}
      else if(this.feedFromWorkingEnd && this.last-1!==longGrip)this.last--;
      else if(this.alternate && this.first+1!==longGrip)this.first++;
      else if(this.last-1!==longGrip)this.last--;
      else return;
      this.alternate=!this.alternate;this.feed-=long.restLength;this.feedTime=0;
    }

  }
  /** Read the converged coupled state, after tool/strand contact has solved. */
  assessSeating(long:ThreadStrand,short?:ThreadStrand){
    if(this.phase!=='retained')return;
    this.seatingHint='Pull the two held ends apart to tighten';
    if(this.last-this.first>this.minimumSegments)return;
    if(this.feedFromWorkingEnd&&this.proximalSlack(long)>long.restLength*3){this.seatingHint='Take up the working-thread slack toward the tissue';return;}
    if(this.feedFromWorkingEnd&&long.points[this.first].distanceTo(long.points[0])>long.materialLengthBetween(0,this.first)*1.05+.01){this.seatingHint='Ease the long-side pull; let the thread settle';return;}
    if(short&&short.pointAt(this.shortCoordinate).distanceTo(short.points[0])>short.materialLengthBetween(0,this.shortCoordinate)*1.05+.01){this.seatingHint='Ease the short-side pull; let the post settle';return;}
    const center=this.center(long);let radius=0;
    for(let i=this.first;i<=this.last;i++)radius=Math.max(radius,long.points[i].distanceTo(center));
    if(radius<0.08&&long.points[this.first].distanceTo(long.points[this.last])<0.04)this.phase='seated';
    else this.seatingHint='Keep gentle opposing tension while the loop settles';
  }
  dampRetainedMotion(long:ThreadStrand,short:ThreadStrand){
    if(!this.active)return;
    long.dampMotion(this.first-1,this.last+1,.35);
    short.dampMotion(this.shortCoordinate-2,this.shortCoordinate+2,.35);
  }
  resolve(long:ThreadStrand,short:ThreadStrand,pinsLong:ReadonlyMap<number,THREE.Vector3>,pinsShort:ReadonlyMap<number,THREE.Vector3>){
    if(!this.active)return;
    const engagement=THREE.MathUtils.smoothstep(this.retentionAge,0,.3);
    const settling=THREE.MathUtils.smoothstep(this.retentionAge,0,.6),stepBudget=.25+.75*settling*settling;
    if(!this.longCorrections||this.longCorrections.length<long.count)this.longCorrections=new Float64Array(long.count);
    if(!this.shortCorrections||this.shortCorrections.length<short.count)this.shortCorrections=new Float64Array(short.count);
    const move=(strand:ThreadStrand,index:number,delta:THREE.Vector3,pins:ReadonlyMap<number,THREE.Vector3>,limit=0.004)=>{
      // Engage a newly captured crossing over several physics steps rather
      // than snapping its neck and collar together in the first contact solve.
      const spent=strand===long?this.longCorrections!:this.shortCorrections!,available=strand.restLength*stepBudget-spent[index];
      if(pins.has(index)||available<=0)return;
      // A per-iteration cap multiplies into a large impulse across contact
      // sweeps. Share one correction budget across the entire physics step.
      delta.clampLength(0,Math.min(limit,available)).multiplyScalar(engagement);
      spent[index]+=delta.length();strand.applyContactCorrection(index,delta);
    };
    // The neck is a persistent material crossing, rather than an animated ring.
    const a=long.points[this.first],b=long.points[this.last],delta=b.clone().sub(a),distance=delta.length();
    const wa=pinsLong.has(this.first)?0:1,wb=pinsLong.has(this.last)?0:1;
    if(distance>0.022 && wa+wb){
      delta.multiplyScalar((distance-0.022)/(distance*(wa+wb)));
      if(wa)move(long,this.first,delta.clone(),pinsLong,0.02);if(wb)move(long,this.last,delta.clone().negate(),pinsLong,0.02);
    }
    const coordinate=THREE.MathUtils.clamp(this.shortCoordinate,1,short.count-2),index=Math.floor(coordinate),t=coordinate-index;
    const contact=short.points[index].clone().lerp(short.points[index+1],t),center=this.center(long),error=contact.sub(center);
    const n=this.last-this.first+1,w=1/n,weights=[1-t,t];
    let denominator=0;for(let i=this.first;i<=this.last;i++)if(!pinsLong.has(i))denominator+=w*w;
    for(let k=0;k<2;k++)if(!pinsShort.has(index+k))denominator+=weights[k]*weights[k];
    if(denominator<1e-9)return;
    for(let i=this.first;i<=this.last;i++)move(long,i,error.clone().multiplyScalar(w/denominator*0.4),pinsLong);
    for(let k=0;k<2;k++)move(short,index+k,error.clone().multiplyScalar(-weights[k]/denominator*0.4),pinsShort);
    if(this.phase==='seated'||pinsLong.size>1&&pinsShort.size>1){
      // Retained turns tighten around the post as material leaves the loop.
      // Neck closure alone leaves an elongated folded loop that can stall
      // forever; compact the existing particles with bounded corrections.
      const collar=this.center(long),radius=Math.max(THREAD_CONTACT_DISTANCE*2,long.materialLengthBetween(this.first,this.last)/(Math.PI*2*this.wraps)+THREAD_CONTACT_DISTANCE);
      for(let i=this.first;i<=this.last;i++){
        const delta=collar.clone().sub(long.points[i]),distance=delta.length();
        if(distance>radius)move(long,i,delta.multiplyScalar((distance-radius)/distance*.35),pinsLong);
      }
    }
  }
}
