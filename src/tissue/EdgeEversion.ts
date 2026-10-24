import {TissueTraction} from './TissueTraction';
import { TISSUE_LAYERS } from './anatomy';
import * as THREE from 'three';
export interface TissueGripPose {jaw:THREE.Vector3;rotation:THREE.Quaternion;openness:number}
/** Local upper skin-edge tissue grip and visual roll, independent of input devices.
 * Prescribed deformation, not an elastic tissue or tissue-damage solver. */
export class EdgeEversion {
  readonly traction=new TissueTraction();
  tractionEnabled=true;
  private slipCount=0;
  // Monotonic event identity; the session owns per-stitch counts.
  get slipSerial(){return this.slipCount;}
  edgeX=.05;
  padOffsetZ=0;
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
  get ready(){return this.held && this.lift>=0.09 && this.lift<=0.3 && this.angle>=0.2&&(!this.tractionEnabled||this.traction.state==='gentle');}
  get instruction(){return this.tractionEnabled&&this.traction.state==='slipped'?'Skin grasp slipped · Open X, position forceps at the edge, then close Z':this.held&&this.tractionEnabled&&this.traction.state==='slipping'?'Grasp slipping · Ease the pull toward the skin edge':this.held&&this.tractionEnabled&&this.traction.state==='stretching'?'Skin stretching · Reduce the forceps pull':!this.held?'Position forceps at the right skin edge · Close Z to grasp the skin edge':this.ready?'Skin edge everted · Stop lifting, then click Begin needle pass':'Skin edge held · Hold E briefly to lift and evert · Shift slows movement';}
  begin(){this.reset();this.active=true;}
  update(pose:TissueGripPose,dt:number,allowGrasp=true,guidedSite=false){
    if(this.held && pose.openness>=0.45){this.held=false;this.traction.release();}
    if(!this.held && allowGrasp && pose.openness<=0.2 && this.previousOpen>0.2){
      const resting=this.target.distanceTo(this.anchor)<0.01 && this.angle<0.02;
      const candidate=guidedSite || !resting?this.target.clone():new THREE.Vector3(pose.jaw.x<0?-this.edgeX:this.edgeX,(TISSUE_LAYERS.epidermis.bottom+TISSUE_LAYERS.epidermis.top)/2,THREE.MathUtils.clamp(pose.jaw.z,-1.55-this.padOffsetZ,1.55-this.padOffsetZ));
      if(pose.jaw.distanceTo(candidate)<0.09){
        if(resting && !guidedSite){this.anchor.copy(candidate);this.target.copy(candidate);this.angle=0;this.revision++;}
        this.held=true;this.active=true;this.traction.beginGrip();this.local.copy(this.target).sub(pose.jaw).applyQuaternion(pose.rotation.clone().invert());this.initialRotation.copy(pose.rotation);
      }
    }
    this.previousOpen=pose.openness;
    const before=this.target.clone(),oldAngle=this.angle,oldStretch=this.traction.stretch;
    if(this.held){
      this.target.copy(this.local).applyQuaternion(pose.rotation).add(pose.jaw);
      const extension=this.target.distanceTo(this.anchor);
      if(extension>0.4 || this.target.y<0.25){
        this.held=false;
        if(this.tractionEnabled){
          const delta=this.target.clone().sub(this.anchor).clampLength(0,.38);this.target.copy(this.anchor).add(delta);this.target.y=Math.max(.25,this.target.y);
          this.traction.slip();this.slipCount++;
        }
      }else if(this.tractionEnabled&&!this.traction.advance(dt,extension)){this.held=false;this.slipCount++;}
      if(this.held){
        const up=new THREE.Vector3(0,1,0).applyQuaternion(pose.rotation.clone().multiply(this.initialRotation.clone().invert()));
        this.angle=THREE.MathUtils.clamp(this.lift/0.16*0.55+Math.atan2(up.x,up.y)*Math.sign(this.anchor.x)*0.5,0,0.75);
      }
    }
    if(!this.held){
      this.traction.relax(dt);
      const t=1-Math.exp(-12*Math.max(0,Math.min(dt,0.05)));
      this.target.lerp(this.anchor,t);this.angle=THREE.MathUtils.lerp(this.angle,0,t);
      if(this.target.distanceTo(this.anchor)<0.0001 && this.angle<0.0001){this.target.copy(this.anchor);this.angle=0;if(!guidedSite)this.active=false;}
    }
    if(!before.equals(this.target) || oldAngle!==this.angle || oldStretch!==this.traction.stretch)this.revision++;
  }
  deformPoint(point:THREE.Vector3,target=point.clone()){
    const side=Math.sign(this.anchor.x);
    if(point.x*side<0 || (this.angle===0 && this.target.equals(this.anchor)))return target.copy(point);
    const across=1-THREE.MathUtils.smoothstep(Math.abs(point.x-this.anchor.x),0,0.25+(this.tractionEnabled?this.traction.stretch*.1:0));
    const along=Math.exp(-(((point.z-this.anchor.z)/(0.45+(this.tractionEnabled?this.traction.stretch*.1:0)))**2));
    const depth=THREE.MathUtils.smoothstep(point.y,TISSUE_LAYERS.fat.bottom,TISSUE_LAYERS.dermis.bottom),weight=across*along*depth;
    const moved=point.clone().sub(this.anchor).applyAxisAngle(new THREE.Vector3(0,0,1),-side*this.angle).add(this.target);
    // Deep attached tissue follows the epidermal lift without crossing the opposing edge.
    moved.x=side*Math.max(0.006,side*moved.x);
    return target.copy(point).lerp(moved,weight);
  }
  reset(){this.traction.reset();this.active=false;this.held=false;this.anchor.set(this.edgeX,(TISSUE_LAYERS.epidermis.bottom+TISSUE_LAYERS.epidermis.top)/2,0);this.target.copy(this.anchor);this.angle=0;this.previousOpen=0.65;this.revision++;}
}
