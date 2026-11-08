import type {MarkerObservation} from './arucoTracking';
type Frame={at:number;markers:MarkerObservation[]};
/** Pair source images, never worker completion times. Interpolate only inside
 * the observed interval, without predicting unseen motion or missing IDs. */
export class StereoFrames {
 private frames:[Frame[],Frame[]]=[[],[]];
 /** Why the most recent pair() returned null (for diagnostics), else null. */
 lastFailure:string|null=null;
 clear(){this.frames=[[],[]];}
 push(camera:0|1,at:number,markers:MarkerObservation[]){
  const frames=this.frames[camera];if(frames.length&&at<=frames.at(-1)!.at)return;
  frames.push({at,markers:markers.map(m=>({id:m.id,corners:m.corners.map(p=>({...p}))}))});
  while(frames.length>10||frames.length>1&&at-frames[0].at>400)frames.shift();
 }
 pair(now:number){
  const a=this.frames[0],b=this.frames[1],lastA=a.at(-1),lastB=b.at(-1);
  this.lastFailure=null;
  if(!lastA||!lastB){this.lastFailure=`no frames yet from camera ${lastA?2:1}`;return null;}
  if(now-lastA.at>180||now-lastB.at>180){
   const stale=now-lastA.at>180?1:2;
   this.lastFailure=`camera ${stale} newest frame is ${Math.round(now-(stale===1?lastA:lastB).at)} ms old (limit 180)`;
   return null;
  }
  const at=Math.min(lastA.at,lastB.at);
  const sample=(frames:Frame[],camera:number)=>{
   const high=frames.findIndex(f=>f.at>=at);if(high<0)return null;
   if(frames[high].at===at)return frames[high].markers;
   if(high===0){this.lastFailure=`camera ${camera} has no frame before the pairing time`;return null;}
   const before=frames[high-1],after=frames[high];
   if(after.at-before.at>120){this.lastFailure=`camera ${camera} frame gap ${Math.round(after.at-before.at)} ms around the pairing time (limit 120)`;return null;}
   const t=(at-before.at)/(after.at-before.at);
   return before.markers.flatMap(m=>{
    const next=after.markers.find(n=>n.id===m.id);if(!next||m.corners.length!==4||next.corners.length!==4)return [];
    return [{id:m.id,corners:m.corners.map((p,i)=>({x:p.x+(next.corners[i].x-p.x)*t,y:p.y+(next.corners[i].y-p.y)*t}))}];
   });
  };
  const first=sample(a,1),second=first&&sample(b,2);
  return first&&second?{at,first,second}:null;
 }
}
