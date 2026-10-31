import type {MarkerObservation} from './arucoTracking';
export type GrayFrame={width:number;height:number;pixels:Uint8Array};
type FramePixels={width:number;height:number;data:ArrayLike<number>};
type Point={x:number;y:number};
export const framePyramid=(frame:FramePixels)=>pyramid(grayFrame(frame));
function grayFrame(frame:FramePixels):GrayFrame{
 const width=Math.ceil(frame.width/2),height=Math.ceil(frame.height/2),pixels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let value=0;
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
   const k=(Math.min(frame.height-1,y*2+j)*frame.width+Math.min(frame.width-1,x*2+i))*4;
   value+=.299*frame.data[k]+.587*frame.data[k+1]+.114*frame.data[k+2];
  }
  pixels[y*width+x]=Math.round(value/4);
 }
 return {width,height,pixels};
}
function pyramid(frame:GrayFrame):GrayFrame[]{
 const levels=[frame];
 for(let k=1;k<5;k++){
  const src=levels[k-1],width=Math.floor(src.width/2),height=Math.floor(src.height/2);
  if(width<32||height<32)break;
  const pixels=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=y*2*src.width+x*2;
   pixels[y*width+x]=(src.pixels[i]+src.pixels[i+1]+src.pixels[i+src.width]+src.pixels[i+src.width+1])/4;
  }
  levels.push({width,height,pixels});
 }
 return levels;
}
function sample(f:GrayFrame,x:number,y:number):number{
 const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,i=iy*f.width+ix;
 return f.pixels[i]*(1-dx)*(1-dy)+f.pixels[i+1]*dx*(1-dy)+f.pixels[i+f.width]*(1-dx)*dy+f.pixels[i+f.width+1]*dx*dy;
}
function valid(f:GrayFrame,x:number,y:number,r:number){return x>=r+2&&y>=r+2&&x<f.width-r-2&&y<f.height-r-2;}
/** Coarse-to-fine inverse-compositional Lucas–Kanade with subpixel interpolation. */
function lk(a:GrayFrame[],b:GrayFrame[],point:Point,initial:Point={x:0,y:0}):Point|null{
 const top=Math.min(a.length,b.length)-1;
 let dx=initial.x/(2**(top+1)),dy=initial.y/(2**(top+1));
 for(let level=top;level>=0;level--){
  if(level<top){dx*=2;dy*=2;}
  const scale=2**(level+1),x=point.x/scale,y=point.y/scale,r=3,A=a[level],B=b[level];
  if(!valid(A,x,y,r))return null;
  let hxx=0,hxy=0,hyy=0;
  const patches:Array<{ox:number;oy:number;value:number;gx:number;gy:number}>=[];
  for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){
   const xx=x+i,yy=y+j,gx=(sample(A,xx+1,yy)-sample(A,xx-1,yy))/2,gy=(sample(A,xx,yy+1)-sample(A,xx,yy-1))/2;
   patches.push({ox:i,oy:j,value:sample(A,xx,yy),gx,gy});
   hxx+=gx*gx;hxy+=gx*gy;hyy+=gy*gy;
  }
  const det=hxx*hyy-hxy*hxy;
  // Small, partially blurred markers can have weaker gradients while remaining trackable.
  if(det<3500)return null;
  for(let iter=0;iter<12;iter++){
   if(!valid(B,x+dx,y+dy,r))return null;
   let bx=0,by=0;
   for(const p of patches){
    const err=p.value-sample(B,x+dx+p.ox,y+dy+p.oy);
    bx+=p.gx*err;by+=p.gy*err;
   }
   const sx=(hyy*bx-hxy*by)/det,sy=(hxx*by-hxy*bx)/det;
   if(!Number.isFinite(sx)||!Number.isFinite(sy))return null;
   dx+=Math.max(-6,Math.min(6,sx));dy+=Math.max(-6,Math.min(6,sy));
   if(sx*sx+sy*sy<.0025)break;
  }
 }
 const result={x:point.x+dx*2,y:point.y+dy*2};
 if(!valid(b[0],result.x/2,result.y/2,4))return null;
 return result;
}

// Recover a known marker's translation by matching its previous grayscale patch.
// This does not attempt to decode a new ID; only a previously tracked marker
// can be recovered, and ambiguous / low-texture matches are rejected.
function recoverPatch(a:GrayFrame[],b:GrayFrame[],center:Point,motion:Point):Point|null{
 const level=Math.min(1,a.length-1,b.length-1),A=a[level],B=b[level],scale=2**(level+1);
 const x=center.x/scale,y=center.y/scale;
 if(!valid(A,x,y,5))return null;
 const offsets=[-4,-2,0,2,4];
 const samples=offsets.flatMap(dy=>offsets.map(dx=>({dx,dy,value:sample(A,x+dx,y+dy)})));
 const mean=samples.reduce((sum,p)=>sum+p.value,0)/samples.length;
 const variance=samples.reduce((sum,p)=>sum+(p.value-mean)**2,0)/samples.length;
 if(variance<180)return null;
 let best=Infinity,second=Infinity,bx=0,by=0;
 const px=Math.round(motion.x/scale),py=Math.round(motion.y/scale);
 // Search both predicted motion and direction reversals, up to 100px/frame.
 const origins=[{x:px,y:py},{x:0,y:0}];
 const visited=new Set<string>();
 for(const origin of origins)for(let dy=origin.y-24;dy<=origin.y+24;dy+=2)for(let dx=origin.x-24;dx<=origin.x+24;dx+=2){
  const key=dx+","+dy;if(visited.has(key))continue;visited.add(key);
  if(!valid(B,x+dx,y+dy,5))continue;
  let error=0;
  for(const p of samples){const delta=sample(B,x+dx+p.dx,y+dy+p.dy)-p.value;error+=delta*delta;}
  error/=samples.length;
  if(error<best){second=best;best=error;bx=dx;by=dy;}
  else if(error<second)second=error;
 }
 // Reject blurry, ambiguous or background-like patches.
 if(best>Math.max(280,variance*.65)||second-best<Math.max(12,best*.04))return null;
 // Confirm with a reverse local patch search and a second, independent feature.
 const displacement={x:bx*scale,y:by*scale};
 const check=lk(b,a,{x:center.x+displacement.x,y:center.y+displacement.y},{x:-displacement.x,y:-displacement.y});
 if(!check||Math.hypot(check.x-center.x,check.y-center.y)>4)return null;
 return displacement;
}

export function trackMarker(a:GrayFrame[],b:GrayFrame[],marker:MarkerObservation,motion:Point={x:0,y:0}):MarkerObservation|null {
 // Keep at least 16 marker pixels at the coarsest level. Otherwise a small
 // marker disappears into the background before LK ever reaches fine detail.
 const side=Math.min(...marker.corners.map((p,i)=>Math.hypot(p.x-marker.corners[(i+1)%4].x,p.y-marker.corners[(i+1)%4].y)));
 const levels=Math.max(1,Math.floor(Math.log2(side/16)));
 a=a.slice(0,levels);b=b.slice(0,levels);
 if(!a.length||!b.length||a[0].width!==b[0].width||a[0].height!==b[0].height)return null;
  // Track the center as well as corners. Center motion helps validate a coherent rigid patch.
  const center={x:marker.corners.reduce((n,p)=>n+p.x,0)/4,y:marker.corners.reduce((n,p)=>n+p.y,0)/4};
  const points=[...marker.corners,center];
  // Predict from the last validated displacement, then refine using a
  // modest-resolution image search. Avoid the coarsest pyramid level: a
  // 12 mm marker has too little detail there and can match the background.
  const predicted=motion;
  const A=a[0],B=b[0];
  // Match the whole marker and its border, not a repeated bit at its center.
  // Search both the prediction and zero so reversals do not leave the window.
  const samples:Array<{x:number;y:number;value:number}>=[];
  for(let j=0;j<9;j++)for(let i=0;i<9;i++){
   const u=-.13+i*1.27/8,v=-.11+j*1.23/8,c=marker.corners;
   const x=((1-u)*(1-v)*c[0].x+u*(1-v)*c[1].x+u*v*c[2].x+(1-u)*v*c[3].x)/2;
   const y=((1-u)*(1-v)*c[0].y+u*(1-v)*c[1].y+u*v*c[2].y+(1-u)*v*c[3].y)/2;
   if(valid(A,x,y,0))samples.push({x,y,value:sample(A,x,y)});
  }
  if(samples.length<30)return null;
  const score=(dx:number,dy:number)=>{
   let sum=0,squared=0;
   for(const p of samples){if(!valid(B,p.x+dx,p.y+dy,0))return Infinity;const d=sample(B,p.x+dx,p.y+dy)-p.value;sum+=d;squared+=d*d;}
   return (squared-sum*sum/samples.length)/samples.length;
  };
  let best={x:0,y:0},bestError=Infinity;
  for(const origin of [predicted,{x:0,y:0}]){
   const cx=Math.round(origin.x/2),cy=Math.round(origin.y/2);
   for(let y=cy-24;y<=cy+24;y+=2)for(let x=cx-24;x<=cx+24;x+=2){const error=score(x,y);if(error<bestError){bestError=error;best={x:x*2,y:y*2};}}
  }
  const bx=best.x/2,by=best.y/2;
  for(let y=by-2;y<=by+2;y+=.5)for(let x=bx-2;x<=bx+2;x+=.5){const error=score(x,y);if(error<bestError){bestError=error;best={x:x*2,y:y*2};}}
  // Try prediction and the coarse image match. The fallback to zero
  // motion avoids trapping a marker when the instrument reverses direction.
  const guesses=[best,predicted,{x:0,y:0}];
  let moved:Array<Point|null>=[];
  let good:boolean[]=[];
  for(const guess of guesses){
   const candidate=points.map(p=>lk(a,b,p,guess));
   const validated=points.map((p,i)=>{
    const next=candidate[i];if(!next)return false;
    const reverse=lk(b,a,next,{x:p.x-next.x,y:p.y-next.y});
    return !!reverse&&Math.hypot(reverse.x-p.x,reverse.y-p.y)<3.5;
   });
   if(validated.filter(Boolean).length>good.filter(Boolean).length){moved=candidate;good=validated;}
   if(good.filter(Boolean).length>=3)break;
  }
  const goodCorners=good.slice(0,4).filter(Boolean).length;
  if(good.filter(Boolean).length<3||goodCorners<2){
   const recovered=recoverPatch(a,b,center,predicted);
   if(recovered){
    const corners=marker.corners.map(p=>({x:p.x+recovered.x,y:p.y+recovered.y}));
    if(corners.every(p=>p.x>=0&&p.y>=0&&p.x<b[0].width*2&&p.y<b[0].height*2)){
     return {id:marker.id,corners};
    }
   }
   return null;
  }
  // Fit a shared rotation and scale from independent validated features. This
  // preserves a coherent square while allowing it to turn between decodes.
  const pairs=points.flatMap((p,i)=>good[i]&&moved[i]?[{p,q:moved[i]!}]:[]);
  const mean=(key:'p'|'q')=>({x:pairs.reduce((n,v)=>n+v[key].x,0)/pairs.length,y:pairs.reduce((n,v)=>n+v[key].y,0)/pairs.length});
  const from=mean('p'),to=mean('q');
  let dot=0,cross=0,energy=0;
  for(const {p,q} of pairs){const x=p.x-from.x,y=p.y-from.y,u=q.x-to.x,v=q.y-to.y;dot+=x*u+y*v;cross+=x*v-y*u;energy+=x*x+y*y;}
  if(energy<1)return null;
  const ca=dot/energy,sa=cross/energy;
  const transform=(p:Point)=>({x:to.x+ca*(p.x-from.x)-sa*(p.y-from.y),y:to.y+sa*(p.x-from.x)+ca*(p.y-from.y)});
  if(pairs.some(({p,q})=>{const v=transform(p);return Math.hypot(v.x-q.x,v.y-q.y)>Math.max(3,side*.08);}))return null;
  // Refine the shared transform against the marker's full appearance, which
  // prevents small corner biases accumulating into a frozen or shrinking box.
  let pose={x:to.x/2,y:to.y/2,angle:Math.atan2(sa,ca),scale:Math.hypot(ca,sa)};
  const poseScore=(p:typeof pose)=>{
   const c=Math.cos(p.angle)*p.scale,s=Math.sin(p.angle)*p.scale;let sum=0,squared=0;
   for(const q of samples){const dx=q.x-from.x/2,dy=q.y-from.y/2,x=p.x+c*dx-s*dy,y=p.y+s*dx+c*dy;if(!valid(B,x,y,0))return Infinity;const d=sample(B,x,y)-q.value;sum+=d;squared+=d*d;}
   return (squared-sum*sum/samples.length)/samples.length;
  };
  let cost=poseScore(pose);
  for(const factor of [1,.5,.25])for(let iteration=0;iteration<3;iteration++){
   for(const [key,step] of [['x',factor],['y',factor],['angle',factor*.08],['scale',factor*.04]] as const){
    for(const direction of [-1,1]){const candidate={...pose,[key]:pose[key]+direction*step};if(candidate.scale<.75||candidate.scale>1.3)continue;const error=poseScore(candidate);if(error<cost){cost=error;pose=candidate;}}
   }
  }
  const c=Math.cos(pose.angle)*pose.scale,s=Math.sin(pose.angle)*pose.scale;
  const corners=marker.corners.map(p=>({x:pose.x*2+c*(p.x-from.x)-s*(p.y-from.y),y:pose.y*2+s*(p.x-from.x)+c*(p.y-from.y)}));
  const mx=pose.x*2-from.x,my=pose.y*2-from.y;
  const area=(cs:Point[])=>Math.abs(cs.reduce((sum,p,i)=>sum+p.x*cs[(i+1)%4].y-cs[(i+1)%4].x*p.y,0))/2;
  const oldArea=area(marker.corners),newArea=area(corners);
  const coherent=corners.every((p,i)=>Math.hypot(p.x-marker.corners[i].x-mx,p.y-marker.corners[i].y-my)<Math.max(6,Math.sqrt(oldArea)*.3));
  if(!coherent||newArea<80||newArea<oldArea*.5||newArea>oldArea*2)return null;
  if(good[4]&&moved[4]&&Math.hypot(moved[4]!.x-center.x-mx,moved[4]!.y-center.y-my)>Math.max(12,Math.sqrt(oldArea)*.4))return null;
  return {id:marker.id,corners};
}
