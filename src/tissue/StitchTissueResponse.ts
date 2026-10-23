import * as THREE from 'three';
import {TISSUE_LAYERS} from './anatomy';
/** Small local skin deformation driven by dermal approximation and relative pull demand. */
export class StitchTissueResponse {
 revision=0;eversion=0;pucker=0;peakDemand=0;
 private prepared=[0,0];
 prepare(side:number,angle:number){const i=side>0?1:0;this.prepared[i]=Math.max(this.prepared[i],THREE.MathUtils.clamp(angle/.75,0,1));}
 update(closure:number,demand:number,dt:number){
  const old=this.eversion,oldPucker=this.pucker,t=1-Math.exp(-6*Math.max(0,Math.min(dt,.05)));
  this.peakDemand=Math.max(this.peakDemand,demand);
  const ease=(value:number,target:number)=>Math.abs(value-target)<.00005?target:THREE.MathUtils.lerp(value,target,t);
  this.eversion=ease(this.eversion,closure*(.008+.012*Math.max(...this.prepared)));
  this.pucker=ease(this.pucker,closure*.025*THREE.MathUtils.clamp(demand,0,1));
  if(this.eversion!==old||this.pucker!==oldPucker)this.revision++;
 }
 liftAt(point:THREE.Vector3){return this.lift(point.x,point.y,point.z);}
 surfaceLiftAt(point:THREE.Vector3){return this.lift(point.x,TISSUE_LAYERS.epidermis.top,point.z);}
 private lift(x:number,y:number,z:number){
  if((this.eversion===0&&this.pucker===0)||Math.abs(x)>.8||Math.abs(z)>.9)return 0;
  const depth=THREE.MathUtils.smoothstep(y,TISSUE_LAYERS.dermis.bottom,TISSUE_LAYERS.epidermis.top);
  const across=Math.exp(-(((Math.abs(x)-.05)/.2)**2)),along=Math.exp(-((z/.45)**2));
  return depth*across*along*(this.eversion+(this.pucker?this.pucker*Math.sin(z*14)**2:0));
 }
 reset(){this.prepared=[0,0];this.eversion=this.pucker=this.peakDemand=0;this.revision++;}
}
