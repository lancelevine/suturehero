import {Vector3} from 'three';
/** Keep initial acquisition jump-free, with explicit XY placement on neutral. */
export class TrackedPositionBridge {
 private source?:Vector3;private scene?:Vector3;private alignXY=false;
 alignOnNeutral(){this.alignXY=true;}
 target(source:Vector3,current:Vector3){
  if(!this.source||!this.scene||this.alignXY){
   this.source=source.clone();this.scene=this.alignXY?new Vector3(source.x,source.y,current.z):current.clone();this.alignXY=false;
  }
  return this.scene.clone().add(source.clone().sub(this.source));
 }
}
