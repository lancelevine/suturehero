import * as THREE from 'three';
import { ThreadStrand } from './ThreadStrand';
import { threadSurfaceAt } from './TissueThreadGuide';
export interface KnotSlackFrame {
  enabled:boolean;
  shortStart:THREE.Vector3;
  shortEnd:THREE.Vector3;
  longStart:THREE.Vector3;
  longEnd:THREE.Vector3;
}
/** Two free spans for the first throw; the winding and knot topology remain guided. */
export class KnotSlack {
  readonly short=new ThreadStrand(1.35,32);
  readonly long=new ThreadStrand(1.35,36);
  enabled=false;
  private initialized=false;
  private availableSlack=0;
  private seed(strand:ThreadStrand,a:THREE.Vector3,b:THREE.Vector3) {
    const bow=Math.sqrt(Math.max(0,strand.length**2-a.distanceToSquared(b)))/2;
    const middle=a.clone().lerp(b,0.5);middle.y=Math.max(0.45,middle.y-bow*0.8);middle.z+=bow*0.6;
    strand.reset([a,middle,b]);
  }
  update(dt:number,frame:KnotSlackFrame) {
    this.enabled=frame.enabled;
    if(!this.enabled) {this.initialized=false;return;}
    if(!this.initialized) {
      this.seed(this.short,frame.shortStart,frame.shortEnd);this.seed(this.long,frame.longStart,frame.longEnd);this.initialized=true;
    }
    this.short.advance(dt,new Map([[0,frame.shortStart],[this.short.count-1,frame.shortEnd]]),threadSurfaceAt);
    this.long.advance(dt,new Map([[0,frame.longStart],[this.long.count-1,frame.longEnd]]),threadSurfaceAt);
    this.availableSlack=Math.max(0,this.short.length-frame.shortStart.distanceTo(frame.shortEnd))+Math.max(0,this.long.length-frame.longStart.distanceTo(frame.longEnd));
  }
  get state() {return this.availableSlack>0.3?'Free spans slack':this.availableSlack>0.15?'Slack reducing':'Free spans nearly taut';}
  reset() {this.enabled=false;this.initialized=false;this.availableSlack=0;}
}
