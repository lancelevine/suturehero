import {Quaternion,Vector3} from 'three';
import type {MarkerObservation} from './arucoTracking';
import {solvePrismPose,type PrismPose} from './prismPose';
type Alignment={rotation:Quaternion;translation:Vector3;samples:number;at:number};
/** A side face establishes the shared body axes. Learn a small-camera/printed
 * mounting correction from overlap before allowing an extra face to drive alone. */
export class RingPoseTracker {
 private alignments=new Map<number,Alignment>();
 status='Show a side face';
 solve(markers:MarkerObservation[],firstId:number,width:number,height:number,at:number,previous?:PrismPose,predicted?:PrismPose):PrismPose|null{
  const sides=markers.filter(m=>m.id>=firstId&&m.id<firstId+6),angled=markers.filter(m=>m.id===firstId+6||m.id===firstId+7);
  const side=solvePrismPose(sides,firstId,width,height,previous,predicted,'ring8');
  if(side&&side.error<5){
   this.status='Side faces drive rotation';
   if(side.error<2.5)for(const marker of angled){
    const raw=solvePrismPose([marker],firstId,width,height,undefined,undefined,'ring8');
    if(!raw||raw.error>2.5)continue;
    const rotation=raw.quaternion.clone().invert().multiply(side.quaternion).normalize();
    const translation=side.translation.clone().sub(raw.translation).applyQuaternion(raw.quaternion.clone().invert());
    let a=this.alignments.get(marker.id);if(a?.at===at)continue;
    // Require several agreeing image samples; a noisy planar flip must not
    // become a new face alignment, or erase an already validated alignment.
    if(a&&a.rotation.angleTo(rotation)>.15){if(a.samples<5)this.alignments.delete(marker.id);continue;}
    if(!a){a={rotation,translation,samples:1,at};this.alignments.set(marker.id,a);}
    else{const weight=1/Math.min(a.samples+1,20);a.rotation.slerp(rotation,weight);a.translation.lerp(translation,weight);a.samples++;a.at=at;}
    if(a.samples>=5)this.status+=' · ID '+marker.id+' aligned';
   }
   return side;
  }
  const candidates=angled.flatMap(marker=>{
   const a=this.alignments.get(marker.id);if(!a||a.samples<5)return [];
   const raw=solvePrismPose([marker],firstId,width,height,undefined,undefined,'ring8');if(!raw||raw.error>3)return [];
   return [{...raw,quaternion:raw.quaternion.clone().multiply(a.rotation).normalize(),translation:raw.translation.clone().add(a.translation.clone().applyQuaternion(raw.quaternion))}];
  });
  const reference=predicted??previous;
  candidates.sort((a,b)=>(a.error+(reference?a.quaternion.angleTo(reference.quaternion)*2:0))-(b.error+(reference?b.quaternion.angleTo(reference.quaternion)*2:0)));
  this.status=candidates.length?'Aligned angled face drives rotation':'Show side and angled face together to align';
  return candidates[0]??null;
 }
}
