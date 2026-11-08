/// <reference lib="webworker" />
import {framePyramid,trackMarker,type GrayFrame} from './markerFlow';
import type {MarkerObservation} from './arucoTracking';
import {KeptFrames} from './flowFrames';
type Track={marker:MarkerObservation;reference:GrayFrame[];decodedAt:number;trackedAt:number;motion:{x:number;y:number};pending?:{marker:MarkerObservation;reference:GrayFrame[]}};
const tracks=new Map<number,Track>();
// Frames kept for seeding after a decode (src/input/flowFrames.ts), so the main thread never sends the same image twice.
// A decode-only frame is kept as its unread bitmap and only read/processed if a seed actually uses it
// (0.112 built a pyramid for every such frame, ~20 ms of flow-worker time, mostly never used).
type Kept=GrayFrame[]|ImageBitmap;
const kept=new KeptFrames<Kept>(undefined,frame=>{if(frame instanceof ImageBitmap)frame.close();});
let readCanvas:OffscreenCanvas|null=null,readContext:OffscreenCanvasRenderingContext2D|null=null;
/** Pixels of a transferred ImageBitmap, read here instead of on the main thread. */
function readBitmap(bitmap:ImageBitmap):ImageData{
 if(!readCanvas||readCanvas.width!==bitmap.width||readCanvas.height!==bitmap.height){readCanvas=new OffscreenCanvas(bitmap.width,bitmap.height);readContext=readCanvas.getContext('2d',{willReadFrequently:true});}
 readContext!.drawImage(bitmap,0,0);bitmap.close();
 return readContext!.getImageData(0,0,readCanvas.width,readCanvas.height);
}
let accepted=0,rejected=0;
self.onmessage=(event:MessageEvent<{type:string;at?:number;id?:number;frame?:ImageData;bitmap?:ImageBitmap;keep?:number;key?:number;markers?:MarkerObservation[];ids?:number[]}>)=>{
 const {type,id,markers=[],ids=[],keep,key}=event.data;
 const received=performance.now();
 // A transferred bitmap is read here; its time is reported as "worker readback".
 const storedBitmap=type==='store'?event.data.bitmap:undefined;
 const frame=event.data.bitmap&&!storedBitmap?readBitmap(event.data.bitmap):event.data.frame;
 const readbackMs=event.data.bitmap&&!storedBitmap?performance.now()-received:0;
 try{
  if(type==='init'){self.postMessage({type:'ready'});return;}
  const now=event.data.at??performance.now();
  if(type==='confirm'){for(const id of ids){const track=tracks.get(id);if(track)track.decodedAt=now;}return;}
  if(type==='store'){
   if(keep!==undefined&&storedBitmap)kept.keep(keep,storedBitmap);
   else if(keep!==undefined&&frame)kept.keep(keep,framePyramid(frame));
   return;
  }
  if(type==='seed'){
   const stored=key!==undefined?kept.take(key):undefined;
   const reference=stored instanceof ImageBitmap?framePyramid(readBitmap(stored)):stored??(frame?framePyramid(frame):undefined);
   if(!reference)return;
   for(const marker of markers){
    const track=tracks.get(marker.id);
    if(track&&now-track.trackedAt<=450){track.pending={marker,reference};track.decodedAt=now;}
    else tracks.set(marker.id,{marker,reference,decodedAt:now,trackedAt:now,motion:{x:0,y:0}});
   }
   return;
  }
  if(type!=='detect'||!frame)return;
  const start=received,current=framePyramid(frame),found:MarkerObservation[]=[];
  if(keep!==undefined)kept.keep(keep,current);
  for(const [markerId,track] of tracks){
   if(now-track.trackedAt>450||now-track.decodedAt>5000){tracks.delete(markerId);continue;}
   // Each quadrilateral owns its source image. A failed frame never advances
   // that reference, and an asynchronous decoded seed includes its own image.
   // Project fresh decoded geometry into the current image before accepting
   // it. A difficult delayed seed must not discard an already-good live track.
   const correction=track.pending?trackMarker(track.pending.reference,current,track.pending.marker):null;
   track.pending=undefined;
   const moved=correction??trackMarker(track.reference,current,track.marker,track.motion);
   if(!moved){rejected++;continue;}
   const motion={x:0,y:0};
   moved.corners.forEach((p,i)=>{motion.x+=(p.x-track.marker.corners[i].x)/4;motion.y+=(p.y-track.marker.corners[i].y)/4;});
   track.marker=moved;track.reference=current;track.trackedAt=now;track.motion=motion;accepted++;found.push(moved);
  }
  self.postMessage({type:'result',id,found,candidates:[],diagnostics:{candidateCount:0,rawMarkerCount:0,recognizedCount:found.length,rejectedCount:0,durationMs:performance.now()-start,timings:readbackMs?{'worker readback':readbackMs}:undefined,note:(found.length?'Tracking':tracks.size?'Recovering marker':'Marker lost')+' · accepted '+accepted+' / rejected '+rejected,pass:'Optical flow',contrast:'Frame-aligned, forward/backward checked'}});
 }catch(error){self.postMessage({type:'error',id,message:String(error)});}
};
