import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import {THREAD_CONTACT_DISTANCE} from './threadMaterial';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import type {TailPassage} from './TailPassage';
import {MaterialOpening} from './MaterialOpening';

/** Material-space approximation of one retained instrument throw. No posed tools,
 * replacement thread mesh or calibrated knot-security/force claim. */
export class FreeThrow {
  wraps=1;direction=0;sliding=false;
  seatingRequested=false;
  feedFromWorkingEnd=false;
  minimumMaterialIndex=1;
  minimumPostCoordinate=1;
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
  private passageAge=0;
  private pendingPost?:number;
  private clearanceMissTime=0;
  private notice='';
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
  get protectedPostCoordinate(){return this.active?this.shortCoordinate:this.pendingPost??0;}
  get active(){return this.phase==='retained'||this.phase==='seated';}
  get tightness(){return this.active?THREE.MathUtils.clamp((this.initialSegments-(this.last-this.first))/Math.max(1,this.initialSegments-this.minimumSegments),0,1):0;}
  get lastFailure(){return this.notice;}
  get instruction(){return this.phase==='seated'?'One free throw seated · Retention is approximate':this.phase==='retained'?`Throw retained · ${this.seatingHint}`:this.phase==='passed'?`Tail through · ${this.captureHint||'Pull it clear of the driver to capture the throw'}`:this.notice||'Form a wrap, grasp the short tail and pull it through';}
  advanceEngagement(dt:number){
    this.longCorrections?.fill(0);this.shortCorrections?.fill(0);
    if(this.active)this.retentionAge+=Math.max(0,Math.min(dt,.05));
    if(this.phase==='passed')this.passageAge+=Math.max(0,Math.min(dt,.05));
  }
  reset(reason=''){this.phase='idle';this.seatingRequested=false;this.first=this.last=this.initialSegments=0;this.pullDistance=undefined;this.pendingPost=undefined;this.feed=this.feedTime=this.retentionAge=this.passageAge=this.clearanceMissTime=0;this.captureHint='';this.seatingHint='Pull the two held ends apart to tighten';this.notice=reason;}
  private center(long:ThreadStrand){const center=new THREE.Vector3();for(let i=this.first;i<=this.last;i++)center.add(long.points[i]);return center.divideScalar(this.last-this.first+1);}
  update(dt:number,passage:TailPassage,long:ThreadStrand,short:ThreadStrand,driverSupportsLoop:(points:readonly THREE.Vector3[],normal:THREE.Vector3)=>boolean,longGrip:number|undefined,shortGrip:number|undefined){
    // Keep recovery instructions until a fresh opening or successful retry,
    // rather than erasing the reason while the user is repositioning.
    if(this.phase==='idle'&&passage.hasOpening&&!passage.lastFailure)this.notice='';
    const wasActive=this.active;this.advanceEngagement(dt);
    if((this.phase==='idle'||this.phase==='passed'&&passage.passage&&passage.passage.wraps>this.wraps) && passage.passage){
      const event=passage.passage;
      if(event.first<1 || event.last-event.first<7 || event.last>=long.count-1){this.reset('Leave free working thread beyond a complete wrap');passage.reset();return;}
      this.notice='';this.captureHint='';
      this.passageAge=this.clearanceMissTime=0;this.pendingPost=undefined;
      this.passageVia=event.via;this.wraps=event.wraps;this.direction=event.direction;this.minimumSegments=this.wraps*6;
      this.first=event.first;this.last=event.last;this.initialSegments=this.last-this.first;this.exitSide=event.side;this.normal.copy(event.normal);this.phase='passed';
    }
    if(this.phase==='idle'||this.phase==='seated'&&!this.sliding&&!this.seatingRequested){this.pullDistance=undefined;return;}
    const center=this.center(long);
    if(this.phase==='passed'){
      if(shortGrip===undefined){this.reset('Short tail released · Regrasp the gold end and pass it through the loop');passage.reset();return;}
      const liveNormal=new THREE.Vector3();
      for(let i=this.first;i<=this.last;i++)liveNormal.add(long.points[i].clone().sub(center).cross(long.points[i===this.last?this.first:i+1].clone().sub(center)));
      if(liveNormal.lengthSq()>1e-8){
        liveNormal.normalize();
        if(liveNormal.dot(this.normal)<0)liveNormal.negate();
        this.normal.copy(liveNormal);
      }
      const crossingCenter=center.clone();
      if(this.wraps>1){const axis=this.normal.clone().multiplyScalar(this.direction);let leading=Infinity;for(let i=this.first;i<=this.last;i++)leading=Math.min(leading,long.points[i].dot(axis));crossingCenter.addScaledVector(axis,leading-crossingCenter.dot(axis));}
      const side=short.points.at(-1)!.clone().sub(crossingCenter).dot(this.normal);
      if(this.passageVia==='tip'&&side*this.exitSide< -0.02){this.reset('Tail moved back out · Pull the gold end completely through the loop');passage.reset();return;}
      const loop=long.points.slice(this.first,this.last+1);
      const opening=new MaterialOpening(loop,this.normal),crossing=opening.crossingCoordinate(short.points,THREAD_CONTACT_DISTANCE);
      this.pendingPost=crossing??(this.pendingPost===undefined?undefined:opening.nearbyPlaneCrossing(short.points,this.pendingPost));
      const clear=!driverSupportsLoop(loop,this.normal);
      this.captureHint=clear?'Keep the short strand through the loop while pulling clear':'Slide the loop clear of the driver working tip';
      if(!clear){this.clearanceMissTime=0;return;}
      if(crossing===undefined){
        this.clearanceMissTime+=Math.max(0,Math.min(dt,.05));
        // Let bounded rim contact converge across clearance, without attaching
        // a nearby unthreaded strand or holding a tail that backed out axially.
        if(this.pendingPost!==undefined&&this.clearanceMissTime<.1)return;
        this.reset('Loop slipped off the short strand · Rewrap and pull the gold end through');passage.reset();return;
      }
      this.shortCoordinate=THREE.MathUtils.clamp(crossing,1,this.postLimit(short,shortGrip));this.phase='retained';this.pullDistance=undefined;
    }
    if(!wasActive&&this.active)this.advanceEngagement(dt);
    if((this.phase!=='seated'||this.sliding||this.seatingRequested)&&longGrip!==undefined&&shortGrip!==undefined){
      const travel=.8*Math.max(0,Math.min(dt,.05))/short.restLength;
      const postAnchor=Math.max(0,this.minimumPostCoordinate-1);
      const proximal=center.distanceTo(short.pointAt(postAnchor)),distal=center.distanceTo(short.points[shortGrip]);
      // Allocate actual material between the two arms. Repeatedly choosing
      // the nearest deformed particle made a stationary collar ratchet along
      // the post and leave impossible, overstretched spans behind it.
      const maximum=this.postLimit(short,shortGrip);
      const minimum=Math.min(maximum,Math.max(this.minimumPostCoordinate,postAnchor+proximal/short.restLength));
      let desired=THREE.MathUtils.clamp(postAnchor+(shortGrip-postAnchor)*proximal/Math.max(1e-9,proximal+distal),minimum,maximum);
      // A tightened sliding start advances toward tissue. Do not creep back
      // up a stationary post merely to redistribute slack; still repair a
      // genuinely overextended proximal span if its material requires it.
      if(this.phase==='seated')desired=Math.max(minimum,Math.min(this.shortCoordinate,desired));
      this.shortCoordinate+=THREE.MathUtils.clamp(desired-this.shortCoordinate,-travel,travel);
    }
    this.assessSeating(long,short);
    if(longGrip===undefined||shortGrip===undefined){this.pullDistance=undefined;return;}
    const separation=long.points[longGrip].distanceTo(short.points[shortGrip]);
    const heldMaterial=long.materialLengthBetween(this.last,longGrip)+short.materialLengthBetween(this.shortCoordinate,shortGrip);
    if(this.pullDistance!==undefined)this.feed+=Math.max(0,separation-this.pullDistance)*(this.feedFromWorkingEnd?1.3:.8)/PRACTICE_SETUP.suture.friction;
    if(this.phase==='retained'&&separation>=heldMaterial*.97||this.seatingRequested){
      // Taut held arms can draw material from the loop even while reach
      // limits prevent further endpoint travel. Otherwise a valid crossing
      // stalls precisely when both instruments put it under tension.
      this.feed+=.4*Math.max(0,Math.min(dt,.05))/PRACTICE_SETUP.suture.friction;
    }
    // Small reversal cycles must not pump slack out of the loop. Rearm
    // after a meaningful inward reposition, allowing a fresh tightening pull.
    const reversal=Math.min(long.restLength,short.restLength)*.25;
    this.pullDistance=this.pullDistance!==undefined&&separation>=this.pullDistance-reversal?Math.max(this.pullDistance,separation):separation;this.feedTime+=Math.max(0,Math.min(dt,0.05));
    // Feed existing particles from the loop into its exterior arms; total
    // strand material and the grasped material indices remain unchanged.
    const drawProximal=this.feedFromWorkingEnd&&this.first>this.minimumMaterialIndex&&(this.proximalSlack(long)>long.restLength*2||this.seatingRequested);
    if(this.feed>=long.restLength && this.feedTime>=0.05 && (this.last-this.first>this.minimumSegments || drawProximal)){
      if(drawProximal){this.first--;this.last--;}
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
    const pending=this.phase==='passed';
    if(!this.active&&!pending)return;
    const engagement=THREE.MathUtils.smoothstep(pending?this.passageAge:this.retentionAge,0,pending?.4:.3);
    const settling=THREE.MathUtils.smoothstep(this.retentionAge,0,.6),stepBudget=pending?.15:.25+.75*settling*settling;
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
    // Keep a threaded post inside the bight while metal still supports it.
    // Only radial escape is blocked: no collar centering or compaction before
    // clearance, and release/reversal still cancels the provisional crossing.
    if(pending&&this.pendingPost===undefined)return;
    const coordinate=THREE.MathUtils.clamp(pending?this.pendingPost!:this.shortCoordinate,1,short.count-2),index=Math.floor(coordinate),t=coordinate-index;
    const contact=short.points[index].clone().lerp(short.points[index+1],t),center=this.center(long);
    const error=pending?new MaterialOpening(long.points.slice(this.first,this.last+1),this.normal).inwardCorrection(contact,THREAD_CONTACT_DISTANCE).negate():contact.sub(center);
    const n=this.last-this.first+1,w=1/n,weights=[1-t,t];
    let denominator=0;for(let i=this.first;i<=this.last;i++)if(!pinsLong.has(i))denominator+=w*w;
    for(let k=0;k<2;k++)if(!pinsShort.has(index+k))denominator+=weights[k]*weights[k];
    if(denominator<1e-9)return;
    for(let i=this.first;i<=this.last;i++)move(long,i,error.clone().multiplyScalar(w/denominator*0.4),pinsLong);
    for(let k=0;k<2;k++)move(short,index+k,error.clone().multiplyScalar(-weights[k]/denominator*0.4),pinsShort);
    if(pending)return;
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
