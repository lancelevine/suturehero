import * as THREE from 'three';
/** Relative displacement feedback and grasp loss, not measured force or tissue damage. */
export class TissueTraction {
 state:'released'|'gentle'|'stretching'|'slipping'|'slipped'='released';
 load=0;stretch=0;progress=0;peakLoad=0;
 beginGrip(){this.state='gentle';this.load=this.stretch=this.progress=0;}
 advance(dt:number,extension:number){
  const step=Math.max(0,Math.min(dt,.05)),target=THREE.MathUtils.smoothstep(extension,.18,.34),blend=1-Math.exp(-8*step);
  this.load=THREE.MathUtils.lerp(this.load,target,blend);this.stretch=this.load;this.peakLoad=Math.max(this.peakLoad,this.load);
  this.progress=extension>.28?Math.min(1,this.progress+step*THREE.MathUtils.smoothstep(extension,.26,.38)/.55):Math.max(0,this.progress-step*3);
  this.state=extension>.28?'slipping':extension>.25?'stretching':'gentle';
  if(this.progress>=1){this.slip();return false;}return true;
 }
 slip(){this.state='slipped';this.progress=1;this.peakLoad=1;}
 release(){if(this.state!=='slipped')this.state='released';this.progress=0;}
 relax(dt:number){const t=1-Math.exp(-10*Math.max(0,Math.min(dt,.05)));this.load=THREE.MathUtils.lerp(this.load,0,t);this.stretch=this.load;if(this.load<.0001)this.load=this.stretch=0;}
 reset(){this.state='released';this.load=this.stretch=this.progress=this.peakLoad=0;}
}
