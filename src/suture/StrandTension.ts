import * as THREE from 'three';
/** Relative geometric feedback. Kinematic reach demand is not a force measurement. */
export class StrandTension {
 state:'released'|'slack'|'gentle'|'excessive'='released';
 demand=0;tautness=0;peakDemand=0;
 update(dt:number,ratio:number,excessSegments:number,held:boolean){
  const t=1-Math.exp(-10*Math.max(0,Math.min(dt,.05)));
  const target=held?THREE.MathUtils.clamp(excessSegments*2,0,1):0;
  this.demand=THREE.MathUtils.lerp(this.demand,target,t);
  this.tautness=held?THREE.MathUtils.smoothstep(ratio,.85,.99):0;
  this.peakDemand=Math.max(this.peakDemand,this.demand);
  this.state=!held?'released':this.demand>.45?'excessive':ratio<.9?'slack':'gentle';
 }
 reset(){this.state='released';this.demand=this.tautness=this.peakDemand=0;}
}
/** Bound a sudden jump when a held arm is nearly taut; ordinary motion is unchanged. */
export function limitSlackTakeUp(previous:THREE.Vector3,target:THREE.Vector3,anchor:THREE.Vector3,material:number,rest:number,dt:number){
 if(material<=0||target.distanceTo(anchor)<material*.9)return;
 const delta=target.clone().sub(previous),limit=3*Math.max(0,Math.min(dt,.05))+rest*.25;
 if(delta.length()>Math.max(rest*3,limit))target.copy(previous).add(delta.clampLength(0,limit));
}
