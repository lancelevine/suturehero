import {Quaternion,Vector3} from 'three';
export type FallbackPose={position:Vector3;quaternion:Quaternion;at:number};
export type MonoView=FallbackPose&{camera:0|1;axis:Vector3};
/** All poses share camera 1's metric frame; source changes never reset calibration. */
export class StereoFallback {
 private output:FallbackPose|undefined;
 private anchors=new Map<number,{view:MonoView;pose:FallbackPose}>();
 private source:number|'stereo'='stereo';
 private switchedAt=0;private lastAt=0;private lastStereo=-Infinity;
 private depth=0;private recovery:Vector3|undefined;private recoveryRotation:Quaternion|undefined;
 update(stereo:FallbackPose|undefined,views:MonoView[],now:number){
  const fresh=views.filter(v=>now-v.at<180);
  const dt=Math.max(0,Math.min(.1,(now-this.lastAt)/1000));this.lastAt=now;
  if(stereo&&now-stereo.at<100){
   if(this.output&&this.source!=='stereo'){
    this.recovery=this.output.position.clone().sub(stereo.position);
    this.recoveryRotation=this.output.quaternion.clone().multiply(stereo.quaternion.clone().invert());
   }
   this.source='stereo';this.lastStereo=now;
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
  // Hold the last stereo distance briefly; then ease in marker-size depth.
  const approximate=now-Math.max(this.lastStereo,this.switchedAt)>350;
  this.depth+=( (approximate?along:0)-this.depth)*(1-Math.exp(-dt/.3));
  delta.addScaledVector(view.axis,this.depth-along);
  this.output={position:anchor.pose.position.clone().add(delta),quaternion:view.quaternion.clone().multiply(anchor.view.quaternion.clone().invert()).multiply(anchor.pose.quaternion).normalize(),at:view.at};
  return {...this.clone(this.output),source:view.camera===0?'camera1' as const:'camera2' as const};
 }
 private clone(p:FallbackPose):FallbackPose{return {position:p.position.clone(),quaternion:p.quaternion.clone(),at:p.at};}
 private cloneView(v:MonoView):MonoView{return {...this.clone(v),camera:v.camera,axis:v.axis.clone()};}
}
