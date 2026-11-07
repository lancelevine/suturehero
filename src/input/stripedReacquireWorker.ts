/// <reference lib="webworker" />
import type {BallBlob} from './ballPairTracking';
import {sphereSeeds,findSphereSilhouette} from './sphereSilhouette';
import {findStripedBalls} from './stripedBallSearch';
self.onmessage=({data})=>{
 const {id,bitmap,radius,center,marker,maxReach}=data;
 try{
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(bitmap,0,0);bitmap.close();
  const frame=context.getImageData(0,0,canvas.width,canvas.height),{seeds}=sphereSeeds(frame.data,frame.width,frame.height,radius,true);
  seeds.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y));
  const found:BallBlob[]=[];
  for(const seed of seeds){
   if(marker&&Math.hypot(seed.x-marker.x,seed.y-marker.y)>maxReach)continue;
   const extent=Math.ceil(radius*2.3),left=Math.max(0,Math.floor(seed.x-extent)),top=Math.max(0,Math.floor(seed.y-extent)),w=Math.min(frame.width-left,extent*2),h=Math.min(frame.height-top,extent*2);
   const pixels=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)pixels.set(frame.data.subarray(((top+y)*frame.width+left)*4,((top+y)*frame.width+left+w)*4),y*w*4);
   const local={x:seed.x-left,y:seed.y-top},refined=findSphereSilhouette(pixels,w,h,local,radius);
   const centers=refined.length?refined.slice(0,2):[local];
   const balls=centers.flatMap(center=>findStripedBalls(pixels,w,h,center,radius));
   for(const b of balls){const ball={...b,x:b.x+left,y:b.y+top};if(!found.some(p=>Math.hypot(p.x-ball.x,p.y-ball.y)<radius))found.push(ball);}
   if(found.length>=6)break;
  }
  self.postMessage({id,found});
 }catch(error){bitmap?.close();self.postMessage({id,error:String(error)});}
};
