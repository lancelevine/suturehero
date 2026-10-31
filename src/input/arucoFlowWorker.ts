/// <reference lib="webworker" />
import {framePyramid,trackMarker,type GrayFrame} from './markerFlow';
import type {MarkerObservation} from './arucoTracking';
type Track={marker:MarkerObservation;reference:GrayFrame[];decodedAt:number;trackedAt:number;motion:{x:number;y:number};pending?:{marker:MarkerObservation;reference:GrayFrame[]}};
const tracks=new Map<number,Track>();
let accepted=0,rejected=0;
self.onmessage=(event:MessageEvent<{type:string;id?:number;frame?:ImageData;markers?:MarkerObservation[];ids?:number[]}>)=>{
 const {type,id,frame,markers=[],ids=[]}=event.data;
 try{
  if(type==='init'){self.postMessage({type:'ready'});return;}
  const now=performance.now();
  if(type==='confirm'){for(const id of ids){const track=tracks.get(id);if(track)track.decodedAt=now;}return;}
  if(type==='seed'){
   if(!frame)return;
   const reference=framePyramid(frame);
   for(const marker of markers){
    const track=tracks.get(marker.id);
    if(track&&now-track.trackedAt<=450){track.pending={marker,reference};track.decodedAt=now;}
    else tracks.set(marker.id,{marker,reference,decodedAt:now,trackedAt:now,motion:{x:0,y:0}});
   }
   return;
  }
  if(type!=='detect'||!frame)return;
  const start=performance.now(),current=framePyramid(frame),found:MarkerObservation[]=[];
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
  self.postMessage({type:'result',id,found,candidates:[],diagnostics:{candidateCount:0,rawMarkerCount:0,recognizedCount:found.length,rejectedCount:0,durationMs:performance.now()-start,note:(found.length?'Tracking':tracks.size?'Recovering marker':'Marker lost')+' · accepted '+accepted+' / rejected '+rejected,pass:'Optical flow',contrast:'Frame-aligned, forward/backward checked'}});
 }catch(error){self.postMessage({type:'error',id,message:String(error)});}
};
