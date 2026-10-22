import {TRACT_START,TRACT_SWEEP} from '../tissue/sutureTract';
import * as THREE from 'three';
import { NEEDLE_ARC,NEEDLE_RADIUS } from './needleGeometry';
import type { ThreadStrand } from './ThreadStrand';
/** Sliding material coordinates through the existing circular tissue tract. */
export class TissueThreadGuide {
  private exteriorCount=3;
  state='Thread following needle';
  reset() {this.exteriorCount=3;this.state='Thread following needle';}
  anchors(strand:ThreadStrand,eye:THREE.Vector3,tipAngle:number|null,center:THREE.Vector3) {
    const pins=new Map<number,THREE.Vector3>([[0,eye.clone()]]);
    const eyeAngle=tipAngle===null?-1:tipAngle-NEEDLE_ARC;
    if(eyeAngle<=0) {this.state='Thread following needle';return pins;}
    const radius=NEEDLE_RADIUS,rest=strand.restLength;
    const arc=Math.min(TRACT_SWEEP,eyeAngle)*radius;
    const arcCount=Math.ceil(arc/rest);
    let offset=0;
    if(eyeAngle>TRACT_SWEEP) {
      const exit=center.clone().add(new THREE.Vector3(-radius*Math.cos(TRACT_START),-radius*Math.sin(TRACT_START),0));
      const distance=exit.distanceTo(eye);
      // A few spare segments preserve exterior slack. Hysteresis avoids index chatter.
      const needed=Math.ceil(distance/rest)+2;
      if(needed>this.exteriorCount)this.exteriorCount=needed;
      else if(needed<this.exteriorCount-2)this.exteriorCount--;
      offset=THREE.MathUtils.clamp(this.exteriorCount,2,strand.count-arcCount-6);
      pins.set(offset,exit);
      this.state=distance>offset*rest?'Thread at reach limit':'Thread sliding through tissue';
    } else this.state='Thread feeding through entry';
    const steps=Math.min(arcCount,strand.count-offset-6);
    for(let i=offset===0?1:0;i<=steps;i++) {
      const angle=TRACT_START+Math.max(0,Math.min(TRACT_SWEEP,eyeAngle)-(i/steps)*arc/radius);
      pins.set(offset+i,center.clone().add(new THREE.Vector3(Math.cos(angle)*radius,-Math.sin(angle)*radius,0)));
    }
    return pins;
  }
}
export function threadSurfaceAt(p:THREE.Vector3):number {
  if(Math.abs(p.x)<=2.68 && Math.abs(p.z)<=1.68)return 0.423;
  if(Math.abs(p.x)<=3.5 && Math.abs(p.z)<=2.5)return 0.055;
  return -0.075;
}
