import {KnotTechniqueSequence,type KnotTechnique} from './KnotTechnique';
import * as THREE from 'three';
import type { ToolCommand } from '../input/types';
/** Guided throw sequence, not a knot topology, friction, or tension simulation. */
export class GuidedKnot {
  phase: 'idle'|'wrapping'|'tail'|'seating'|'between'|'complete'='idle';
  throws=0;
  sequence?:KnotTechniqueSequence;
  get targetThrows(){return this.sequence?.technique==='sliding'?3:2;}
  get wraps(){return this.sequence?(this.phase==='between'||this.phase==='complete'?this.sequence.throws.at(-1)?.wraps??1:this.sequence.requiredWraps):1;}
  wrapsForThrow(index:number){return this.sequence?.throws[index]?.wraps??1;}
  directionForThrow(index:number){return this.sequence?.throws[index]?.direction??(index===0?1:-1);}
  get retainedWraps(){const count=this.phase==='between'||this.phase==='complete'?this.throws-1:this.throws;let total=0;for(let n=0;n<count;n++)total+=this.wrapsForThrow(n);return total;}
  wrap=0;
  seating=0;
  tailPositioned=false;
  readonly center=new THREE.Vector3(0,1.1,0.35);
  readonly tail=new THREE.Vector3(0.4,0.95,-0.15);
  get active() { return this.phase!=='idle'; }
  get direction() {if(this.sequence){if(this.phase==='between'||this.phase==='complete')return this.sequence.throws.at(-1)?.direction??1;return this.sequence.requiredDirection||1;}return this.throws===0?1:-1; }
  begin(technique?:KnotTechnique) { if(this.phase!=='idle') return false;this.sequence=technique?new KnotTechniqueSequence(technique):undefined; this.phase='wrapping'; return true; }
  nextThrow() {
    if(this.phase!=='between') return false;
    this.wrap=0; this.seating=0; this.tailPositioned=false; this.phase='wrapping'; return true;
  }
  positionTail() { if(this.phase!=='tail') return false; this.tailPositioned=true; return true; }
  update(left: ToolCommand,right: ToolCommand,leftJaw: number,rightJaw: number,dt: number) {
    const step=Math.max(0,Math.min(dt,0.05));
    if(this.phase==='wrapping' && leftJaw<=0.2) {
      this.wrap=THREE.MathUtils.clamp(this.wrap+left.rotation[2]*this.direction*step*0.45/this.wraps,0,1);
      if(this.wrap>=1) this.phase='tail';
    } else if(this.phase==='tail' && this.tailPositioned && leftJaw<=0.2 && rightJaw<=0.2) {
      this.phase='seating';
    } else if(this.phase==='seating') {
      if(rightJaw>=0.45) { this.phase='tail'; this.seating=0; return; }
      if(leftJaw>0.2 || rightJaw>0.2) return;
      const forcepsDirection=-this.direction;
      const separation=Math.min(Math.max(0,left.translation[0]*forcepsDirection),Math.max(0,-right.translation[0]*forcepsDirection));
      this.seating=Math.min(1,this.seating+separation*step*0.65);
      if(this.seating>=1) {this.sequence?.seat({wraps:this.wraps,direction:this.direction,postHeld:true});this.throws++;this.phase=this.throws===this.targetThrows?'complete':'between';}
    }
  }
  get leftPosition() {
    if(this.phase==='wrapping') {
      const a=this.wrap*Math.PI*2*this.direction*this.wraps;
      return this.center.clone().add(new THREE.Vector3(-Math.cos(a)*0.55,Math.sin(a)*0.55,0));
    }
    const forcepsSide=-this.direction;
    const seat=this.phase==='between' || this.phase==='complete'?1:this.seating;
    // During a finished throw, throws already points to the next direction.
    const side=this.phase==='between'? -1:this.phase==='complete'?1:forcepsSide;
    return new THREE.Vector3(-0.55+(side*1.25+0.55)*seat,1.1-0.38*seat,0.35-0.35*seat);
  }
  get rightPosition() {
    if(this.phase==='wrapping' || (this.phase==='tail' && !this.tailPositioned)) return new THREE.Vector3(0,1.1,-0.2);
    const seat=this.phase==='between' || this.phase==='complete'?1:this.seating;
    const side=this.phase==='between'?1:this.phase==='complete'?-1:this.direction;
    return this.tail.clone().lerp(new THREE.Vector3(side*1.25,0.72,0),seat).sub(new THREE.Vector3(0,0,0.05));
  }
  get takeUp() {
    if(this.phase==='between' || this.phase==='complete')return 1;
    return this.phase==='seating'?THREE.MathUtils.smoothstep(this.seating,0,0.3):0;
  }
  get threadState() {
    if(this.phase==='complete' || this.phase==='between')return 'Throw seated';
    if(this.phase!=='seating')return 'Thread slack';
    return this.seating<0.3?'Sliding loop off driver':this.seating<0.7?'Tightening loop around tail':'Seating tightened loop';
  }
  get progress() { return this.phase==='wrapping'?this.wrap:this.phase==='seating'?this.seating:this.phase==='between' || this.phase==='complete'?1:0; }
  get instruction() {
    const throwName=this.throws===0?(this.wraps===2?'First double throw':'First throw'):this.sequence?.technique==='sliding'&&this.throws===1?'Same-direction sliding throw':'Opposing locking throw';
    if(this.phase==='wrapping') return `${throwName} · Hold ${this.direction===1?'R':'Y'} to wrap ${this.wraps===2?'twice':'once'} around the driver`;
    if(this.phase==='tail') return this.tailPositioned?'Close right driver with comma to grasp the short tail':'Click Position driver at tail';
    if(this.phase==='seating') return `${throwName} · Hold ${this.direction===1?'A + Right arrow':'D + Left arrow'} to pull the ends apart`;
    if(this.phase==='between') return `${this.throws===1?'First throw seated':this.throws+' throws seated'} · Click Next ${this.sequence?.technique==='sliding'&&this.throws===1?'same-direction':'opposing'} throw`;
    if(this.phase==='complete') return this.sequence?.technique==='sliding'?'Guided sliding-knot sequence complete ✓ · Same-direction start + opposing lock':this.sequence?'Guided surgeon’s square-knot sequence complete ✓ · Double start + opposing lock':'Guided square-knot sequence complete ✓ · Two opposing throws';
    return 'Complete the curved needle pass before knot tying';
  }
  reset() {this.sequence=undefined; this.phase='idle'; this.throws=0; this.wrap=0; this.seating=0; this.tailPositioned=false; }
}
