import * as THREE from 'three';
import { KnotMaterial } from './KnotMaterial';
import { ThreadStrand,type StrandObstacle } from './ThreadStrand';
import { threadSurfaceAt } from './TissueThreadGuide';
export interface KnotSlackFrame {
  enabled:boolean;
  releaseShort?:boolean;
  releaseLong?:boolean;
  holdMaterial?:boolean;
  loopLength?:number;
  seating?:number;
  seatedThrows?:number;
  retainedLength?:number;
  shortStart:THREE.Vector3;
  shortEnd:THREE.Vector3;
  longStart:THREE.Vector3;
  longEnd:THREE.Vector3;
}
/** Persistent free spans through both throws; the winding and knot topology remain guided. */
export class KnotSlack {
  readonly material=new KnotMaterial();
  short=new ThreadStrand(1.35,32);
  long=new ThreadStrand(1.35,36);
  enabled=false;
  trimmed=false;
  surfaceAt=threadSurfaceAt;
  tissueContact?:StrandObstacle;
  readonly fragments:ThreadStrand[]=[];
  private released={short:true,long:true};
  private detached=new Set<'short'|'long'>();
  private heldOffcuts=new Map<ThreadStrand,'short'|'long'>();
  cut(strand:ThreadStrand,coordinate:number){
    if(coordinate<3)return false;
    const split=strand.splitAt(coordinate);if(!split)return false;
    const side=strand===this.short?'short':strand===this.long?'long':this.heldOffcuts.get(strand);
    if(side){
      const alreadyHeld=this.heldOffcuts.delete(strand);
      if(alreadyHeld||!this.detached.has(side)&&!this.released[side])this.heldOffcuts.set(split.fragment,side);
      this.detached.add(side);
    }this.fragments.push(split.fragment);this.trimmed=true;return true;
  }
  advanceTrimmed(dt:number,holds?:{short?:THREE.Vector3;long?:THREE.Vector3}){
    for(const strand of [this.short,this.long,...this.fragments])strand.tissueContact=this.tissueContact;
    for(const strand of [this.short,this.long])strand.advance(dt,new Map([[0,strand.points[0].clone()]]),this.surfaceAt);
    for(const strand of this.fragments){
      const side=this.heldOffcuts.get(strand),target=side?holds?.[side]:undefined;
      if(side&&!target)this.heldOffcuts.delete(strand);
      strand.advance(dt,target?new Map([[strand.count-1,target]]):new Map(),this.surfaceAt);
    }
  }
  private initialized=false;
  private availableSlack=0;
  private releasedEnds=0;
  private seed(strand:ThreadStrand,a:THREE.Vector3,b:THREE.Vector3) {
    const bow=Math.sqrt(Math.max(0,strand.length**2-a.distanceToSquared(b)))/2;
    const middle=a.clone().lerp(b,0.5);middle.y=Math.max(0.45,middle.y-bow*0.8);middle.z+=bow*0.6;
    strand.reset([a,middle,b]);
  }
  update(dt:number,frame:KnotSlackFrame) {
    if(this.trimmed){this.advanceTrimmed(dt);return;}
    this.released={short:!!frame.releaseShort,long:!!frame.releaseLong};
    this.enabled=frame.enabled;this.releasedEnds=Number(!!frame.releaseShort)+Number(!!frame.releaseLong);
    if(!this.enabled) {this.initialized=false;return;}
    if(!frame.holdMaterial)this.material.update(frame.loopLength??0,frame.shortStart.distanceTo(frame.shortEnd),frame.longStart.distanceTo(frame.longEnd),{dt,seating:frame.seating??0,seatedThrows:frame.seatedThrows??0,retainedLength:frame.retainedLength??0});
    this.short.setMaterialLength(this.material.short);this.long.setMaterialLength(this.material.long);
    if(!this.initialized) {
      this.seed(this.short,frame.shortStart,frame.shortEnd);this.seed(this.long,frame.longStart,frame.longEnd);this.initialized=true;
    }
    const shortPins=new Map([[0,frame.shortStart]]),longPins=new Map([[0,frame.longStart]]);
    if(!frame.releaseShort)shortPins.set(this.short.count-1,frame.shortEnd);
    if(!frame.releaseLong)longPins.set(this.long.count-1,frame.longEnd);
    this.short.tissueContact=this.long.tissueContact=this.tissueContact;
    this.short.advance(dt,shortPins,this.surfaceAt);this.long.advance(dt,longPins,this.surfaceAt);
    this.availableSlack=Math.max(0,this.short.length-frame.shortStart.distanceTo(frame.shortEnd))+Math.max(0,this.long.length-frame.longStart.distanceTo(frame.longEnd));
  }
  get state() {if(this.trimmed)return 'Tails trimmed · Knot retained';if(this.releasedEnds)return this.releasedEnds===2?'Both thread ends released':'One thread end released';if(this.material.overreach)return 'Thread at reach limit';return this.availableSlack>0.3?'Free spans slack':this.availableSlack>0.2?'Slack reducing':'Free spans nearly taut';}
  reset() {this.heldOffcuts.clear();this.detached.clear();this.released={short:true,long:true};this.trimmed=false;this.fragments.length=0;this.short=new ThreadStrand(1.35,32);this.long=new ThreadStrand(1.35,36);this.enabled=false;this.initialized=false;this.availableSlack=0;this.releasedEnds=0;this.material.reset();this.short.setMaterialLength(this.material.short);this.long.setMaterialLength(this.material.long);}
}
