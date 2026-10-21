import { TISSUE_LAYERS } from './anatomy';
import * as THREE from 'three';
export interface TissueGripPose {jaw:THREE.Vector3;rotation:THREE.Quaternion;openness:number}
/** Local upper skin-edge tissue grip and visual roll, independent of input devices.
 * Prescribed deformation, not an elastic tissue or tissue-damage solver. */
export class EdgeEversion {
  readonly anchor=new THREE.Vector3(0.05,(TISSUE_LAYERS.epidermis.bottom+TISSUE_LAYERS.epidermis.top)/2,0);
  readonly target=this.anchor.clone();
  active=false;
  held=false;
  angle=0;
  revision=0;
  private previousOpen=0.65;
  private local=new THREE.Vector3();
  private initialRotation=new THREE.Quaternion();
  get lift(){return this.target.y-this.anchor.y;}
  get ready(){return this.held && this.lift>=0.09 && this.lift<=0.3 && this.angle>=0.2;}
  get instruction(){return !this.held?'Position forceps at the right skin edge · Close Z to grasp the skin edge':this.ready?'Skin edge everted · Stop lifting, then click Begin needle pass':'Skin edge held · Hold E briefly to lift and evert · Shift slows movement';}
  begin(){this.reset();this.active=true;}
  update(pose:TissueGripPose,dt:number,allowGrasp=true,guidedSite=false){
    if(this.held && pose.openness>=0.45)this.held=false;
    if(!this.held && allowGrasp && pose.openness<=0.2 && this.previousOpen>0.2){
      const resting=this.target.distanceTo(this.anchor)<0.01 && this.angle<0.02;
      const candidate=guidedSite || !resting?this.target.clone():new THREE.Vector3(pose.jaw.x<0?-0.05:0.05,(TISSUE_LAYERS.epidermis.bottom+TISSUE_LAYERS.epidermis.top)/2,THREE.MathUtils.clamp(pose.jaw.z,-1.55,1.55));
      if(pose.jaw.distanceTo(candidate)<0.09){
        if(resting && !guidedSite){this.anchor.copy(candidate);this.target.copy(candidate);this.angle=0;this.revision++;}
        this.held=true;this.active=true;this.local.copy(this.target).sub(pose.jaw).applyQuaternion(pose.rotation.clone().invert());this.initialRotation.copy(pose.rotation);
      }
    }
    this.previousOpen=pose.openness;
    const before=this.target.clone(),oldAngle=this.angle;
    if(this.held){
      this.target.copy(this.local).applyQuaternion(pose.rotation).add(pose.jaw);
      if(this.target.distanceTo(this.anchor)>0.4 || this.target.y<0.25)this.held=false;
      else {
        const up=new THREE.Vector3(0,1,0).applyQuaternion(pose.rotation.clone().multiply(this.initialRotation.clone().invert()));
        this.angle=THREE.MathUtils.clamp(this.lift/0.16*0.55+Math.atan2(up.x,up.y)*Math.sign(this.anchor.x)*0.5,0,0.75);
      }
    }
    if(!this.held){
      const t=1-Math.exp(-12*Math.max(0,Math.min(dt,0.05)));
      this.target.lerp(this.anchor,t);this.angle=THREE.MathUtils.lerp(this.angle,0,t);
      if(this.target.distanceTo(this.anchor)<0.0001 && this.angle<0.0001){this.target.copy(this.anchor);this.angle=0;if(!guidedSite)this.active=false;}
    }
    if(!before.equals(this.target) || oldAngle!==this.angle)this.revision++;
  }
  deformPoint(point:THREE.Vector3,target=point.clone()){
    const side=Math.sign(this.anchor.x);
    if(point.x*side<0 || (this.angle===0 && this.target.equals(this.anchor)))return target.copy(point);
    const across=1-THREE.MathUtils.smoothstep(Math.abs(point.x-this.anchor.x),0,0.25);
    const along=Math.exp(-(((point.z-this.anchor.z)/0.45)**2));
    const depth=THREE.MathUtils.smoothstep(point.y,TISSUE_LAYERS.fat.bottom,TISSUE_LAYERS.dermis.bottom),weight=across*along*depth;
    const moved=point.clone().sub(this.anchor).applyAxisAngle(new THREE.Vector3(0,0,1),-side*this.angle).add(this.target);
    // Deep attached tissue follows the epidermal lift without crossing the opposing edge.
    moved.x=side*Math.max(0.006,side*moved.x);
    return target.copy(point).lerp(moved,weight);
  }
  reset(){this.active=false;this.held=false;this.anchor.set(0.05,(TISSUE_LAYERS.epidermis.bottom+TISSUE_LAYERS.epidermis.top)/2,0);this.target.copy(this.anchor);this.angle=0;this.previousOpen=0.65;this.revision++;}
}
