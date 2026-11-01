import type {MarkerObservation} from './arucoTracking';
type Anchor={corners:MarkerObservation['corners'];seenAt:number};
/** Holds pose only while an already-known face still has stationary image geometry.
 * Newly visible faces may join that reference; real motion accumulates against
 * the reference, so small continuous movement is never discarded frame by frame. */
export class MarkerRestLatch {
 private anchors=new Map<number,Anchor>();private lastAt=-Infinity;
 observe(markers:readonly MarkerObservation[],at:number){
  if(!markers.length)return false;
  if(at-this.lastAt>700)this.anchors.clear();this.lastAt=at;
  let stationary=false;
  for(const marker of markers){
   const anchor=this.anchors.get(marker.id);if(!anchor||at-anchor.seenAt>700||marker.corners.length!==4)continue;
   const side=anchor.corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-anchor.corners[(i+1)%4].x,p.y-anchor.corners[(i+1)%4].y),0)/4;
   const rms=Math.sqrt(marker.corners.reduce((sum,p,i)=>sum+(p.x-anchor.corners[i].x)**2+(p.y-anchor.corners[i].y)**2,0)/4);
   if(rms<=Math.max(1,Math.min(2,side*.02)))stationary=true;
  }
  if(!stationary)this.anchors.clear();
  for(const marker of markers){const old=this.anchors.get(marker.id);if(old)old.seenAt=at;else this.anchors.set(marker.id,{corners:marker.corners.map(p=>({...p})),seenAt:at});}
  return stationary;
 }
}
