import type {BallBlob} from './ballPairTracking';
export interface StripedBallDiagnostics {reason:string;diameterPx:number;contrast:number}
const chordSamples=[-.6,-.3,0,.3,.6];
/** Experimental side-view detector for a white sphere with three dark parallel
 * bands. All measurements are image pixels; use native-resolution local crops. */
export function findStripedBalls(pixels:Uint8ClampedArray,w:number,h:number,center:{x:number;y:number},expectedRadius:number,diagnostics?:StripedBallDiagnostics):BallBlob[]{
 if(diagnostics){diagnostics.reason='No three-band pattern in search area';diagnostics.diameterPx=expectedRadius*2;diagnostics.contrast=0;}
 let progress=0;
 if(w<1||h<1||pixels.length<w*h*4)return [];
 const gray=new Uint8Array(w*h),hist=new Uint32Array(256);
 for(let i=0;i<gray.length;i++){gray[i]=Math.round(.299*pixels[i*4]+.587*pixels[i*4+1]+.114*pixels[i*4+2]);hist[gray[i]]++;}
 const quantile=(fraction:number)=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=gray.length*fraction)return i;}return 255;};
 const low=quantile(.0005),high=quantile(.999),contrast=high-low;if(diagnostics)diagnostics.contrast=contrast;if(contrast<45){if(diagnostics)diagnostics.reason='Insufficient black/white contrast';return [];}
 const dark=low+contrast*.43,light=low+contrast*.65;
 const seeds:Array<{x:number;y:number;r:number;angle:number}>=[];
 for(const dx of [-1,0,1])for(const dy of [-1,0,1])seeds.push({x:center.x+dx,y:center.y+dy,r:expectedRadius,angle:0});
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
 for(let start=0;start<gray.length;start++){
  if(seen[start]||gray[start]>dark)continue;
  let head=0,tail=1;queue[0]=start;seen[start]=1;
  let sx=0,sy=0,sxx=0,syy=0,sxy=0;
  while(head<tail){
   const i=queue[head++],x=i%w,y=Math.floor(i/w);sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;
   for(let direction=0;direction<4;direction++){
    const nx=x+(direction===0?1:direction===1?-1:0),ny=y+(direction===2?1:direction===3?-1:0);if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;
    if(!seen[j]&&gray[j]<=dark){seen[j]=1;queue[tail++]=j;}
   }
  }
  if(tail<5||tail>Math.min(gray.length*.35,12000))continue;
  const x=sx/tail,y=sy/tail,vx=sxx/tail-x*x,vy=syy/tail-y*y,cov=sxy/tail-x*y;
  const eigen=(vx+vy+Math.hypot(vx-vy,2*cov))/2,r=Math.sqrt(Math.max(0,3*eigen));
  if(r<5||r>80)continue;
  seeds.push({x,y,r,angle:.5*Math.atan2(2*cov,vx-vy)+Math.PI/2});
 }
 seeds.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y));
 const sample=(x:number,y:number)=>gray[Math.round(y)*w+Math.round(x)];
 const found:BallBlob[]=[];
 seedLoop: for(const seed of seeds.slice(0,25)){
  const radii=[seed.r*.9,seed.r,seed.r*1.1,...[.7,.85,1,1.2,1.4].map(v=>expectedRadius*v)].filter(r=>r>=7&&r<=80);
  for(const r of radii){
   if(seed.x-r*1.5<0||seed.y-r*1.5<0||seed.x+r*1.5>=w||seed.y+r*1.5>=h)continue;
   for(let turn=0;turn<12;turn++){
    const angle=seed.angle+turn*Math.PI/12,nx=Math.cos(angle),ny=Math.sin(angle),ux=-ny,uy=nx;
    const bins=Math.max(17,Math.min(41,Math.round(r*1.7)|1)),profile:number[]=[];
    for(let i=0;i<bins;i++){
     const t=(i/(bins-1)*1.6-.8),chord=Math.sqrt(1-t*t)*r;
     let value=0;for(const u of chordSamples)value+=sample(seed.x+nx*t*r+ux*u*chord,seed.y+ny*t*r+uy*u*chord);
     profile.push(value/5);
    }
    const runs:Array<{start:number;end:number}>=[];
    for(let i=0;i<bins;i++)if(profile[i]<dark){const start=i;while(i+1<bins&&profile[i+1]<dark)i++;runs.push({start,end:i});}
    if(runs.length!==3||profile[0]<light||profile.at(-1)!<light)continue;
    if(runs.some(run=>(run.end-run.start+1)/bins>.25))continue;
    if(runs.some((run,i)=>i&&run.start-runs[i-1].end<2))continue;
    const mid=runs.map(run=>(run.start+run.end)/2/(bins-1)*1.6-.8);
    if(mid[0]>-.12||mid[2]<.12||Math.abs(mid[1])>.22||Math.abs((mid[1]-mid[0])-(mid[2]-mid[1]))>.22)continue;
    progress=Math.max(progress,1);
    // Bands must span the ball, rather than being three isolated dark specks.
    if(mid.some(t=>{
     const chord=Math.sqrt(1-t*t)*r;
     return [-.65,.65].some(u=>sample(seed.x+nx*t*r+ux*u*chord,seed.y+ny*t*r+uy*u*chord)>light);
    }))continue;
    progress=Math.max(progress,2);
    // Outside a round ball, the background should not continue the stripes.
    // This rejects a rectangular striped label, including on a white background.
    const ring=Array.from({length:16},(_,i)=>sample(seed.x+r*1.16*Math.cos(angle+i*Math.PI/8),seed.y+r*1.16*Math.sin(angle+i*Math.PI/8)));
    const background=[...ring].sort((a,b)=>a-b).slice(2,-2);
    const mean=background.reduce((a,b)=>a+b,0)/background.length,variance=background.reduce((a,b)=>a+(b-mean)**2,0)/background.length;
    if(variance>contrast*contrast*.065)continue;
    progress=Math.max(progress,3);
    const darkBackground=mean<dark;
    const sections=darkBackground
     ?[(runs[0].end+runs[1].start)/2,(runs[1].end+runs[2].start)/2,(runs[0].start-1)/2,(runs[2].end+bins)/2].map(i=>i/(bins-1)*1.6-.8)
     :mid;
    const inferred:number[]=[],halfSpans:number[]=[],chordCenters:number[]=[];
    for(const t of sections){
     let left=Infinity,right=-Infinity;
     for(let u=-r*1.4;u<=r*1.4;u+=.5){
      const value=sample(seed.x+nx*t*r+ux*u,seed.y+ny*t*r+uy*u);
      if(darkBackground?value>light:value<dark){left=Math.min(left,u);right=Math.max(right,u);}
     }
     if(left>-.5*r||right<.5*r){inferred.length=0;break;}
     chordCenters.push((right+left)/2);halfSpans.push((right-left)/2);inferred.push(Math.hypot((right-left)/2,t*r));
    }
    const sorted=[...inferred].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
    const inliers=inferred.map((value,i)=>({value,i})).filter(p=>Math.abs(p.value-median)<=Math.max(1,r*.06));
    if(inliers.length<(darkBackground?3:2))continue;
    if(!darkBackground&&(halfSpans[0]>=halfSpans[1]-.35||halfSpans[2]>=halfSpans[1]-.35))continue;
    const score=contrast*.12-Math.hypot(seed.x-center.x,seed.y-center.y)*.15-Math.abs(r-expectedRadius)*.25;
    const measuredRadius=inliers.reduce((a,p)=>a+p.value,0)/inliers.length;
    const u=inliers.reduce((a,p)=>a+chordCenters[p.i],0)/inliers.length;
    found.push({x:seed.x+ux*u+nx*mid[1]*r,y:seed.y+uy*u+ny*mid[1]*r,count:Math.PI*measuredRadius*measuredRadius,score});
    if(Math.hypot(found.at(-1)!.x-center.x,found.at(-1)!.y-center.y)<Math.max(2,r*.2)){if(diagnostics){diagnostics.reason='Three-band sphere recognized';diagnostics.diameterPx=2*measuredRadius;}return [found.at(-1)!];}
    continue seedLoop;
   }
  }
 }
 found.sort((a,b)=>b.score-a.score);
 const result:BallBlob[]=[];
 for(const ball of found)if(!result.some(p=>Math.hypot(p.x-ball.x,p.y-ball.y)<Math.sqrt(ball.count/Math.PI)*.8)){result.push(ball);if(result.length===6)break;}
 if(diagnostics){diagnostics.reason=result.length?'Three-band sphere recognized':expectedRadius<7?'Ball too small: move closer / increase resolution':progress>=3?'Stripe pattern found; round outline rejected':progress>=2?'Stripe pattern found; surrounding background rejected':progress>=1?'Three bands found; stripe shape rejected':'Three separate bands not resolved';if(result.length)diagnostics.diameterPx=2*Math.sqrt(result[0].count/Math.PI);}
 return result;
}
