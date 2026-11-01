import {Vector3} from 'three';
import type {Axis} from './InstrumentCalibration';
export const guidedDirections=[
 'Tilt RIGHT (~30–45°)', 'Tilt LEFT (~30–45°)',
 'Tilt FORWARD / away from you (~30–45°)', 'Tilt BACK / toward you (~30–45°)',
 'ROLL clockwise, looking from the handle toward the tip (~30–45°)',
 'ROLL counterclockwise, looking from the handle toward the tip (~30–45°)',
] as const;
/** Only independent, opposite pairs can define a signed axis permutation. */
export function solveGuidedRotation(samples:Vector3[]){
 if(samples.length!==6)return null;
 const axes:Axis[]=[],invert:boolean[]=[];
 for(let pair=0;pair<3;pair++){
  const a=samples[pair*2],b=samples[pair*2+1],length=a.length(),other=b.length();
  if(length<.35||other<.35||length>1.4||other>1.4)return null;
  if(a.dot(b)/(length*other)>-.85||Math.min(length,other)/Math.max(length,other)<.55)return null;
  const direction=a.clone().sub(b).normalize(),values=direction.toArray().map(Math.abs),axis=values.indexOf(Math.max(...values)) as Axis;
  // Axis swaps cannot correct an oblique mount. Do not silently invent one.
  if(values[axis]<.9||axes.includes(axis))return null;
  axes.push(axis);invert.push(a.getComponent(axis)<0);
 }
 return {rotationAxes:axes as [Axis,Axis,Axis],rotationInvert:invert as [boolean,boolean,boolean]};
}
export class GuidedCalibration {
 step=0;neutral=true;readonly samples:Vector3[]=[];
 private window:{at:number;rotation:Vector3}[]=[];
 observe(rotation:Vector3|null,at:number,now:number){
  if(!rotation||now-at>350){this.window=[];return;}
  if(this.window.at(-1)?.at===at)return;
  if(this.window.length&&at-this.window.at(-1)!.at>500)this.window=[];
  this.window.push({at,rotation:rotation.clone()});this.window=this.window.filter(s=>at-s.at<=900);
 }
 readiness(){
  if(this.step>=6)return 'Calibration complete';
  if(this.window.length<3||this.window.at(-1)!.at-this.window[0].at<500)return 'Hold steady with the marker visible for half a second';
  const mean=this.window.reduce((v,s)=>v.add(s.rotation),new Vector3()).multiplyScalar(1/this.window.length);
  if(this.window.some(s=>s.rotation.distanceTo(mean)>.045))return 'Still moving or tracking is noisy — hold steady';
  if(this.neutral)return mean.length()<.12?'Ready':'Return to your original neutral pose (within 7°)';
  return mean.length()<.35?'Rotate at least 20°':mean.length()>1.4?'Use a smaller rotation (20–80°)':'Ready';
 }
 capture(){
  if(this.readiness()!=='Ready')return false;
  if(this.neutral)this.neutral=false;
  else {this.samples.push(this.window.reduce((v,s)=>v.add(s.rotation),new Vector3()).multiplyScalar(1/this.window.length));this.step++;this.neutral=true;}
  this.window=[];return true;
 }
}
