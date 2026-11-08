import {Quaternion,Vector3} from 'three';
export type FallbackPose={position:Vector3;quaternion:Quaternion;at:number};
export type MonoView=FallbackPose&{camera:0|1;axis:Vector3};
/** Single-marker rotation changes smaller than this are noise on small markers: hold rotation (radians). */
export const MONO_ROTATION_DEADBAND_RADIANS=4*Math.PI/180;
/** Single-camera sideways moves smaller than this (mm) are treated as noise at rest. */
export const MONO_STILL_MM=6;
/** Single-camera depth (marker-size) changes smaller than this (mm) are treated as noise at rest. */
export const MONO_STILL_DEPTH_MM=40;
/** Larger single-marker rotation changes are pose-ambiguity flips: hold rotation (radians). */
export const MONO_MAX_TURN_RADIANS=30*Math.PI/180;
/** Rotation from a single-camera view relative to its anchor. Small 12 mm
 * markers give 1–3° noise and occasional large flips per frame, so only a
 * clear, plausible turn moves the instrument; otherwise the anchor's (stereo) rotation holds. */
function monoRotation(view:MonoView,anchor:{view:MonoView;pose:FallbackPose}):Quaternion{
 const turn=view.quaternion.angleTo(anchor.view.quaternion);
 if(turn<MONO_ROTATION_DEADBAND_RADIANS||turn>MONO_MAX_TURN_RADIANS)return anchor.pose.quaternion.clone();
 return view.quaternion.clone().multiply(anchor.view.quaternion.clone().invert()).multiply(anchor.pose.quaternion).normalize();
}
/** All poses share camera 1's metric frame; source changes never reset calibration. */
export class StereoFallback {
 private output:FallbackPose|undefined;
 private anchors=new Map<number,{view:MonoView;pose:FallbackPose}>();
 private source:number|'stereo'='stereo';
 private switchedAt=0;private lastAt=0;private lastStereo=-Infinity;
 private lastStereoSample=-Infinity;
 private depth=0;private recovery:Vector3|undefined;private recoveryRotation:Quaternion|undefined;
 update(stereo:FallbackPose|undefined,views:MonoView[],now:number){
  const fresh=views.filter(v=>now-v.at<180);
  const dt=Math.max(0,Math.min(.1,(now-this.lastAt)/1000));this.lastAt=now;
  if(stereo&&now-stereo.at<180){
   if(this.output&&stereo.at===this.lastStereoSample){
    const view=fresh.find(v=>this.anchors.has(v.camera));
    if(view){
     const anchor=this.anchors.get(view.camera)!;
     const delta=view.position.clone().sub(anchor.view.position);
     delta.addScaledVector(view.axis,-delta.dot(view.axis));
     this.output={position:anchor.pose.position.clone().add(delta),quaternion:monoRotation(view,anchor),at:view.at};
    }
    return {...this.clone(this.output),source:'stereo' as const};
   }
   this.lastStereoSample=stereo.at;
   if(this.output&&this.source!=='stereo'){
    this.recovery=this.output.position.clone().sub(stereo.position);
    this.recoveryRotation=this.output.quaternion.clone().multiply(stereo.quaternion.clone().invert());
   }
   this.source='stereo';this.lastStereo=stereo.at;
   this.recovery?.multiplyScalar(Math.exp(-dt/.18));
   this.recoveryRotation?.slerp(new Quaternion(),1-Math.exp(-dt/.18));
   this.output={position:stereo.position.clone().add(this.recovery??new Vector3()),quaternion:(this.recoveryRotation?.clone()??new Quaternion()).multiply(stereo.quaternion),at:stereo.at};
   for(const view of fresh)this.anchors.set(view.camera,{view:this.cloneView(view),pose:this.clone(this.output)});
   return {...this.clone(this.output),source:'stereo' as const};
  }
  if(!this.output||!fresh.length)return null;
  const view=fresh.find(v=>v.camera===this.source)??fresh[0];
  if(this.source!==view.camera){
   if(this.source!=='stereo'||!this.anchors.has(view.camera))this.anchors.set(view.camera,{view:this.cloneView(view),pose:this.clone(this.output)});
   this.source=view.camera;this.switchedAt=now;this.depth=0;this.recovery=undefined;this.recoveryRotation=undefined;
  }
  const anchor=this.anchors.get(view.camera)!;
  const delta=view.position.clone().sub(anchor.view.position),along=delta.dot(view.axis);
  // Within single-marker noise of the last stereo pose: hold it exactly
  // position (no sideways jitter, no drift toward marker-size depth).
  const sideways=delta.clone().addScaledVector(view.axis,-along).length();
  if(sideways<MONO_STILL_MM&&Math.abs(along)<MONO_STILL_DEPTH_MM){
   this.output={position:anchor.pose.position.clone(),quaternion:monoRotation(view,anchor),at:view.at};
   return {...this.clone(this.output),source:view.camera===0?'camera1' as const:'camera2' as const};
  }
  // Hold the last stereo distance briefly; then ease in marker-size depth.
  const approximate=now-Math.max(this.lastStereo,this.switchedAt)>350;
  this.depth+=( (approximate?along:0)-this.depth)*(1-Math.exp(-dt/.3));
  delta.addScaledVector(view.axis,this.depth-along);
  this.output={position:anchor.pose.position.clone().add(delta),quaternion:monoRotation(view,anchor),at:view.at};
  return {...this.clone(this.output),source:view.camera===0?'camera1' as const:'camera2' as const};
 }
 private clone(p:FallbackPose):FallbackPose{return {position:p.position.clone(),quaternion:p.quaternion.clone(),at:p.at};}
 private cloneView(v:MonoView):MonoView{return {...this.clone(v),camera:v.camera,axis:v.axis.clone()};}
}
