import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import type {TailPassage} from './TailPassage';

/** Material-space approximation of one retained instrument throw. No posed tools,
 * replacement thread mesh or calibrated knot-security/force claim. */
export class FreeThrow {
  phase:'idle'|'passed'|'retained'|'seated'='idle';
  first=0;last=0;
  private initialSegments=0;
  private shortCoordinate=0;
  private exitSide=1;
  private pullDistance?:number;
  private feed=0;
  private feedTime=0;
  private alternate=false;
  private normal=new THREE.Vector3(0,0,1);
  get shortMaterialCoordinate(){return this.shortCoordinate;}
  get active(){return this.phase==='retained'||this.phase==='seated';}
  get tightness(){return this.active?THREE.MathUtils.clamp((this.initialSegments-(this.last-this.first))/Math.max(1,this.initialSegments-6),0,1):0;}
  get instruction(){return this.phase==='seated'?'One free throw seated · Retention is approximate':this.phase==='retained'?'Throw retained · Pull the two held ends apart to tighten':this.phase==='passed'?'Tail through · Pull it clear of the driver to capture the throw':'Form a wrap, grasp the short tail and pull it through';}
  reset(){this.phase='idle';this.first=this.last=this.initialSegments=0;this.pullDistance=undefined;this.feed=this.feedTime=0;}
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
    if(this.phase==='idle' && passage.passage){
      const event=passage.passage;
      if(event.first<1 || event.last-event.first<7 || event.last>=long.count-1)return;
      this.first=event.first;this.last=event.last;this.initialSegments=this.last-this.first;this.exitSide=event.side;this.normal.copy(event.normal);this.phase='passed';
    }
    if(this.phase==='idle')return;
    const center=this.center(long),nearest=this.nearest(short,center,this.active?this.shortCoordinate:undefined);
    if(this.phase==='passed'){
      if(shortGrip===undefined){this.reset();passage.reset();return;}
      const liveNormal=new THREE.Vector3();
      for(let i=this.first;i<=this.last;i++)liveNormal.add(long.points[i].clone().sub(center).cross(long.points[i===this.last?this.first:i+1].clone().sub(center)));
      if(liveNormal.lengthSq()>1e-8){
        liveNormal.normalize();
        if(liveNormal.dot(this.normal)<0)liveNormal.negate();
        this.normal.copy(liveNormal);
      }
      const side=short.points.at(-1)!.clone().sub(center).dot(this.normal);
      if(side*this.exitSide< -0.02){this.reset();passage.reset();return;}
      const inverse=driver.clone().invert(),local=center.clone().applyMatrix4(inverse);
      let radius=0,depth=0;for(let i=this.first;i<=this.last;i++){
        const p=long.points[i].clone().applyMatrix4(inverse);radius=Math.max(radius,Math.hypot(p.x-local.x,p.y-local.y));depth=Math.max(depth,Math.abs(p.z-local.z));
      }
      const clear=local.z+depth< -0.07 || local.z-depth>3.4 || Math.hypot(local.x,local.y)>radius+0.16;
      if(clear && nearest.coordinate<=short.count-2 && nearest.distance<Math.max(short.restLength*6,radius)){
        this.shortCoordinate=nearest.coordinate;this.phase='retained';this.pullDistance=undefined;
      }else return;
    }
    if(this.phase!=='seated')this.shortCoordinate=nearest.coordinate;
    this.assessSeating(long);
    if(longGrip===undefined||shortGrip===undefined){this.pullDistance=undefined;return;}
    const separation=long.points[longGrip].distanceTo(short.points[shortGrip]);
    if(this.pullDistance!==undefined)this.feed+=Math.max(0,separation-this.pullDistance)*0.8;
    this.pullDistance=separation;this.feedTime+=Math.max(0,Math.min(dt,0.05));
    // Feed existing particles from the loop into its exterior arms; total
    // strand material and the grasped material indices remain unchanged.
    if(this.last-this.first>6 && this.feed>=long.restLength && this.feedTime>=0.05){
      if(this.alternate && this.first+1!==longGrip)this.first++;
      else if(this.last-1!==longGrip)this.last--;
      else return;
      this.alternate=!this.alternate;this.feed-=long.restLength;this.feedTime=0;
    }

  }
  /** Read the converged coupled state, after tool/strand contact has solved. */
  assessSeating(long:ThreadStrand){
    if(this.last-this.first>6||this.phase!=='retained')return;
    const center=this.center(long);let radius=0;
    for(let i=this.first;i<=this.last;i++)radius=Math.max(radius,long.points[i].distanceTo(center));
    if(radius<0.08&&long.points[this.first].distanceTo(long.points[this.last])<0.04)this.phase='seated';
  }
  resolve(long:ThreadStrand,short:ThreadStrand,pinsLong:ReadonlyMap<number,THREE.Vector3>,pinsShort:ReadonlyMap<number,THREE.Vector3>){
    if(!this.active)return;
    const move=(strand:ThreadStrand,index:number,delta:THREE.Vector3,pins:ReadonlyMap<number,THREE.Vector3>,limit=0.004)=>{
      if(pins.has(index))return;delta.clampLength(0,limit);strand.applyContactCorrection(index,delta);
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
  }
}
