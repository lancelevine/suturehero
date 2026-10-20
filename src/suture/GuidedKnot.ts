import * as THREE from 'three';
import type { ToolCommand } from '../input/types';
/** Guided throw sequence, not a knot topology, friction, or tension simulation. */
export class GuidedKnot {
  phase: 'idle'|'wrapping'|'tail'|'seating'|'between'|'complete'='idle';
  throws=0;
  wrap=0;
  seating=0;
  tailPositioned=false;
  readonly center=new THREE.Vector3(0,1.1,0.35);
  readonly tail=new THREE.Vector3(0.4,0.95,-0.15);
  get active() { return this.phase!=='idle'; }
  get direction() { return this.throws===0?1:-1; }
  begin() { if(this.phase!=='idle') return false; this.phase='wrapping'; return true; }
  nextThrow() {
    if(this.phase!=='between') return false;
    this.wrap=0; this.seating=0; this.tailPositioned=false; this.phase='wrapping'; return true;
  }
  positionTail() { if(this.phase!=='tail') return false; this.tailPositioned=true; return true; }
  update(left: ToolCommand,right: ToolCommand,leftJaw: number,rightJaw: number,dt: number) {
    const step=Math.max(0,Math.min(dt,0.05));
    if(this.phase==='wrapping' && leftJaw<=0.2) {
      this.wrap=THREE.MathUtils.clamp(this.wrap+left.rotation[2]*this.direction*step*0.45,0,1);
      if(this.wrap>=1) this.phase='tail';
    } else if(this.phase==='tail' && this.tailPositioned && leftJaw<=0.2 && rightJaw<=0.2) {
      this.phase='seating';
    } else if(this.phase==='seating') {
      if(rightJaw>=0.45) { this.phase='tail'; this.seating=0; return; }
      if(leftJaw>0.2 || rightJaw>0.2) return;
      const forcepsDirection=-this.direction;
      const separation=Math.min(Math.max(0,left.translation[0]*forcepsDirection),Math.max(0,-right.translation[0]*forcepsDirection));
      this.seating=Math.min(1,this.seating+separation*step*0.65);
      if(this.seating>=1) { this.throws++; this.phase=this.throws===2?'complete':'between'; }
    }
  }
  get leftPosition() {
    if(this.phase==='wrapping') {
      const a=this.wrap*Math.PI*2*this.direction;
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
    return this.seating<0.3?'Taking up slack':'Seating the throw';
  }
  get progress() { return this.phase==='wrapping'?this.wrap:this.phase==='seating'?this.seating:this.phase==='between' || this.phase==='complete'?1:0; }
  get instruction() {
    const throwName=this.throws===0?'First throw':'Opposing throw';
    if(this.phase==='wrapping') return `${throwName} · Hold ${this.direction===1?'R':'Y'} to wrap the long strand around the driver`;
    if(this.phase==='tail') return this.tailPositioned?'Close right driver with comma to grasp the short tail':'Click Position driver at tail';
    if(this.phase==='seating') return `${throwName} · Hold ${this.direction===1?'A + Right arrow':'D + Left arrow'} to pull the ends apart`;
    if(this.phase==='between') return 'First throw seated · Click Next opposing throw';
    if(this.phase==='complete') return 'Guided square-knot sequence complete ✓ · Two opposing throws';
    return 'Complete the curved needle pass before knot tying';
  }
  reset() { this.phase='idle'; this.throws=0; this.wrap=0; this.seating=0; this.tailPositioned=false; }
}
