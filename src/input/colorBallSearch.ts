import type {BallBlob} from './ballPairTracking';
export const partnerSearchCenter=(known:{x:number;y:number},expectedKnown:{x:number;y:number},expectedMissing:{x:number;y:number})=>({x:known.x+expectedMissing.x-expectedKnown.x,y:known.y+expectedMissing.y-expectedKnown.y});
/** Bounded color/shape search; relaxed matching is only for a guided local region. */
export function findColorBalls(pixels:Uint8ClampedArray,w:number,h:number,color:readonly number[],brightness:number,center:{x:number;y:number},radius:number,continuationRadius=0,relaxedTolerance=.105){
 const results:BallBlob[]=[];
  const minX=Math.max(0,Math.floor(center.x-radius)),maxX=Math.min(w-1,Math.ceil(center.x+radius));
  const minY=Math.max(0,Math.floor(center.y-radius)),maxY=Math.min(h-1,Math.ceil(center.y+radius));
  if(maxX<minX||maxY<minY)return results;
  // Binary color mask and eight-connected components, evaluated at full
  // 640px width so a 7mm ball spans enough pixels for shape localization.
  const bw=maxX-minX+1,bh=maxY-minY+1;
  const mask=new Uint8Array(bw*bh);
  const selectedSaturation=Math.max(...color)-Math.min(...color);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const p=(y*w+x)*4,r=pixels[p],g=pixels[p+1],bl=pixels[p+2],sum=r+g+bl;
   const saturation=(Math.max(r,g,bl)-Math.min(r,g,bl))/Math.max(1,sum);
   if(sum<Math.max(40,brightness*.25)||saturation<Math.max(.03,selectedSaturation*.35))continue;
   const tolerance=continuationRadius>0&&Math.hypot(x-center.x,y-center.y)<=continuationRadius ? relaxedTolerance : .075;
   if(Math.hypot(r/sum-color[0],g/sum-color[1],bl/sum-color[2])<tolerance)mask[(y-minY)*bw+x-minX]=1;
  }
  const queue=new Int32Array(mask.length);
  for(let index=0;index<mask.length;index++){
   if(mask[index]!==1)continue;
   let head=0,tail=1;queue[0]=index;mask[index]=2;
   let sx=0,sy=0,count=0,minCx=bw,maxCx=0,minCy=bh,maxCy=0;
   while(head<tail){
    const v=queue[head++],px=v%bw,py=Math.floor(v/bw);
    sx+=px;sy+=py;count++;
    minCx=Math.min(minCx,px);maxCx=Math.max(maxCx,px);
    minCy=Math.min(minCy,py);maxCy=Math.max(maxCy,py);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(!dx&&!dy)continue;
     const nx=px+dx,ny=py+dy;
     if(nx<0||nx>=bw||ny<0||ny>=bh)continue;
     const ni=ny*bw+nx;
     if(mask[ni]===1){mask[ni]=2;queue[tail++]=ni;}
    }
   }
   if(count<8||count>900)continue;
   const cw=maxCx-minCx+1,ch=maxCy-minCy+1,aspect=Math.max(cw,ch)/Math.max(1,Math.min(cw,ch));
   const fill=count/(cw*ch);
   if(aspect>1.9||fill<.32)continue;
   const x=minX+sx/count,y=minY+sy/count;
   const distance=Math.hypot(x-center.x,y-center.y);
   if(distance>radius)continue;
   const score=Math.log1p(count)*3-distance*.16-Math.abs(1-aspect)*3;
   results.push({x,y,count,score});
  }
  results.sort((a,b)=>b.score-a.score);return results.slice(0,8);
}
