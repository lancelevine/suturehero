/// <reference lib="webworker" />
// Classic worker: keep these codes in sync with arucoDictionary.ts.
// check-ring-markers.mjs exercises both decoders against an OpenCV fixture.
const MARKER_CODES = [
  0xb532, 0x0f9a, 0x332d, 0x9946, 0x549e, 0x79cd, 0x9e2e, 0xc4f2, 0xfeda, 0xcf56,
  0xf991, 0x11a7, 0x0eb7, 0x2a0f, 0x24b1, 0x263e, 0x4665, 0x6600, 0x6c5e, 0x76af,
  0x868b, 0xb02b, 0xccd5, 0xdd82, 0xfe47, 0x9471, 0xace4, 0xa554, 0x2123, 0x346f,
  0x4415, 0x57b2, 0x9ecf, 0xf0cb, 0x08ae, 0x0929, 0x1875, 0x04ff, 0x0df6, 0x1c5a,
  0x1718, 0x2a28, 0x328c, 0x38b2, 0x24e8, 0x2eeb, 0x2d3f, 0x4b64, 0x502e, 0x5013
];
function isSupportedMarkerId(id:number){return Number.isInteger(id)&&id>=0&&id<MARKER_CODES.length;}
type MarkerObservation={id:number;corners:Array<{x:number;y:number}>};
type LegacyDetector={detect:(frame:ImageData)=>MarkerObservation[];candidates?:unknown[];polys?:unknown[]};
type ArucoGlobal={DICTIONARIES:Record<string,{nBits:number;tau:number;codeList:number[]}>;Detector:new(options:{dictionaryName:string;maxHammingDistance:number})=>LegacyDetector};
const workerScope=self as DedicatedWorkerGlobalScope & {AR?:ArucoGlobal};
const base='https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/';
let detector:LegacyDetector|null=null;
const canvas=new OffscreenCanvas(1,1),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
function candidatesOf(){return (Array.isArray(detector?.candidates)?detector.candidates:Array.isArray(detector?.polys)?detector.polys:[])??[];}
function cornersOf(candidate:unknown,ratio:number):Array<{x:number;y:number}>|null{
 const obj=candidate as {corners?:unknown;points?:unknown;vertices?:unknown}|null;
 const vertices=Array.isArray(candidate)?candidate:obj?.corners??obj?.points??obj?.vertices;
 if(!Array.isArray(vertices)||vertices.length!==4)return null;
 const pts=vertices.map((p:unknown)=>{if(Array.isArray(p))return {x:Number(p[0])*ratio,y:Number(p[1])*ratio};const q=p as {x?:number;y?:number};return {x:Number(q?.x)*ratio,y:Number(q?.y)*ratio};});
 return pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?pts:null;
}
async function initialize(){
 if(detector)return;
 importScripts(base+'cv.js',base+'aruco.js');
 if(!workerScope.AR)throw Error('ArUco library did not initialize in worker');
 workerScope.AR.DICTIONARIES.SUTUREHERO_4X4_50={nBits:16,tau:2,codeList:MARKER_CODES};
 detector=new workerScope.AR.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
}

type GrayFrame={width:number;height:number;pixels:Uint8Array};
type Point={x:number;y:number};
let previous:GrayFrame[]|null=null;
let tracked:MarkerObservation[]=[];
// A failed optical-flow frame must not erase the last known marker geometry.
const lastReliableAt=new Map<number,number>();
const lastMotion=new Map<number,Point>();
let lastFlowStatus='Waiting for marker';
const TRACK_RECOVERY_MS=450;
const lastDecodedAt=new Map<number,number>();
const lastFlowAt=new Map<number,number>();
// Allow geometrically consistent optical flow to bridge missed decodes.
const MAX_FLOW_GAP_MS=650;
const MAX_UNCONFIRMED_MS=5000;
let frameNumber=0;
let flowOnly=false;
let flowAccepted=0,flowRejected=0;
let roiHints:MarkerObservation[]=[];
let lastFullScan=0;
const FULL_SCAN_INTERVAL_MS=1200;
let consecutiveRoiMisses=0;
let lastSuccessfulDecodeAt=0;
const ROI_PADDING=90;
const recoveryMisses=new Map<number,number>();
function decodeRegions(frame:ImageData,padding=ROI_PADDING):{markers:MarkerObservation[];candidates:Point[][];pass:string;durationMs:number}|null{
 if(!roiHints.length)return null;
 const start=performance.now();
 const regions:Array<{x:number;y:number;w:number;h:number}>=[];
 for(const marker of roiHints){
  const xs=marker.corners.map(p=>p.x),ys=marker.corners.map(p=>p.y);
  const misses=recoveryMisses.get(marker.id)??0;
  const velocity=lastMotion.get(marker.id)??{x:0,y:0};
  const extra=Math.min(220,misses*45);
  const predictedX=velocity.x*Math.min(3,misses),predictedY=velocity.y*Math.min(3,misses);
  const x=Math.max(0,Math.floor(Math.min(...xs, ...xs.map(v=>v+predictedX))-padding-extra)),y=Math.max(0,Math.floor(Math.min(...ys,...ys.map(v=>v+predictedY))-padding-extra));
  const right=Math.min(frame.width,Math.ceil(Math.max(...xs,...xs.map(v=>v+predictedX))+padding+extra)),bottom=Math.min(frame.height,Math.ceil(Math.max(...ys,...ys.map(v=>v+predictedY))+padding+extra));
  if(right-x>=24&&bottom-y>=24)regions.push({x,y,w:right-x,h:bottom-y});
 }
 if(!regions.length)return null;
 const markers:MarkerObservation[]=[],candidates:Point[][]=[];
 for(const region of regions){
  const cropped=new ImageData(region.w,region.h);
  for(let y=0;y<region.h;y++){
   const offset=((region.y+y)*frame.width+region.x)*4;
   cropped.data.set(frame.data.subarray(offset,offset+region.w*4),y*region.w*4);
  }
  let found=detector!.detect(cropped);
  // A still marker may be missed repeatedly by a single global threshold.
  // Retry locally with contrast enhancement without rescanning the whole camera.
  if(!found.length){
   let low=255,high=0;
   for(let i=0;i<cropped.data.length;i+=4){const v=Math.round(.299*cropped.data[i]+.587*cropped.data[i+1]+.114*cropped.data[i+2]);low=Math.min(low,v);high=Math.max(high,v);}
   if(high-low>=16){
    const enhanced=new ImageData(new Uint8ClampedArray(cropped.data),region.w,region.h);
    const factor=255/(high-low);
    for(let i=0;i<enhanced.data.length;i+=4){const v=Math.round(.299*enhanced.data[i]+.587*enhanced.data[i+1]+.114*enhanced.data[i+2]);const adjusted=Math.max(0,Math.min(255,Math.round((v-low)*factor)));enhanced.data[i]=adjusted;enhanced.data[i+1]=adjusted;enhanced.data[i+2]=adjusted;}
    found=detector!.detect(enhanced);
   }
  }
  for(const marker of found)if(isSupportedMarkerId(marker.id)&&!markers.some(m=>m.id===marker.id))markers.push({...marker,corners:marker.corners.map(p=>({x:p.x+region.x,y:p.y+region.y}))});
  for(const candidate of candidatesOf()){
   const corners=cornersOf(candidate,1);
   if(corners)candidates.push(corners.map(p=>({x:p.x+region.x,y:p.y+region.y})));
  }
 }
 return {markers,candidates,pass:'ROI ('+regions.length+' regions)',durationMs:performance.now()-start};
}

function grayFrame(frame:ImageData):GrayFrame{
 const width=Math.ceil(frame.width/2),height=Math.ceil(frame.height/2),pixels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(Math.min(frame.height-1,y*2)*frame.width+Math.min(frame.width-1,x*2))*4;
  pixels[y*width+x]=Math.round(.299*frame.data[i]+.587*frame.data[i+1]+.114*frame.data[i+2]);
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
 for(const origin of origins)for(let dy=origin.y-24;dy<=origin.y+24;dy+=2)for(let dx=origin.x-24;dx<=origin.x+24;dx+=2){
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

function flowTrack(a:GrayFrame[]|null,b:GrayFrame[]):MarkerObservation[]{
 if(!a||!tracked.length)return [];
 const results:MarkerObservation[]=[];
 for(const marker of tracked){
  const now=performance.now();
  if(now-(lastFlowAt.get(marker.id)??lastDecodedAt.get(marker.id)??0)>MAX_FLOW_GAP_MS || now-(lastDecodedAt.get(marker.id)??0)>MAX_UNCONFIRMED_MS)continue;
  // Track the center as well as corners. Center motion helps validate a coherent rigid patch.
  const center={x:marker.corners.reduce((n,p)=>n+p.x,0)/4,y:marker.corners.reduce((n,p)=>n+p.y,0)/4};
  const points=[...marker.corners,center];
  // Predict from the last validated displacement, then refine using a
  // modest-resolution image search. Avoid the coarsest pyramid level: a
  // 12 mm marker has too little detail there and can match the background.
  const predicted=lastMotion.get(marker.id)??{x:0,y:0};
  const level=Math.min(2,a.length-1,b.length-1);
  const A=a[level],B=b[level],scale=2**(level+1);
  const ax=center.x/scale,ay=center.y/scale;
  let best={x:predicted.x,y:predicted.y},bestError=Infinity;
  const cx=Math.round(predicted.x/scale),cy=Math.round(predicted.y/scale);
  for(let oy=cy-8;oy<=cy+8;oy+=2)for(let ox=cx-8;ox<=cx+8;ox+=2){
   if(!valid(A,ax,ay,3)||!valid(B,ax+ox,ay+oy,3))continue;
   let error=0;
   for(let py=-2;py<=2;py++)for(let px=-2;px<=2;px++){
    const d=sample(A,ax+px,ay+py)-sample(B,ax+ox+px,ay+oy+py);
    error+=d*d;
   }
   if(error<bestError){bestError=error;best={x:ox*scale,y:oy*scale};}
  }
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
  if(goodCorners<1&&!good[4]){
   const recovered=recoverPatch(a,b,center,predicted);
   if(recovered){
    const corners=marker.corners.map(p=>({x:p.x+recovered.x,y:p.y+recovered.y}));
    if(corners.every(p=>p.x>=0&&p.y>=0&&p.x<b[0].width*2&&p.y<b[0].height*2)){
     lastMotion.set(marker.id,recovered);lastFlowAt.set(marker.id,now);lastReliableAt.set(marker.id,now);
     flowAccepted++;lastFlowStatus='Patch recovered '+marker.id;results.push({id:marker.id,corners});continue;
    }
   }
   flowRejected++;lastFlowStatus='Flow rejected: no validated points';continue;
  }
  // Recover one lost corner by translating it with the median displacement.
  const xs=moved.map((p,i)=>good[i]&&p?p.x-points[i].x:null).filter((v):v is number=>v!==null).sort((x,y)=>x-y);
  const ys=moved.map((p,i)=>good[i]&&p?p.y-points[i].y:null).filter((v):v is number=>v!==null).sort((x,y)=>x-y);
  const mx=xs[Math.floor(xs.length/2)],my=ys[Math.floor(ys.length/2)];
  // Translation-only: preserve decoded quadrilateral geometry and move it as one rigid patch.
  const corners=marker.corners.map(p=>({x:p.x+mx,y:p.y+my}));
  const area=(cs:Point[])=>Math.abs(cs.reduce((sum,p,i)=>sum+p.x*cs[(i+1)%4].y-cs[(i+1)%4].x*p.y,0))/2;
  const oldArea=area(marker.corners),newArea=area(corners);
  const coherent=corners.every((p,i)=>Math.hypot(p.x-marker.corners[i].x-mx,p.y-marker.corners[i].y-my)<Math.max(12,Math.sqrt(oldArea)*.55));
  if(!coherent||newArea<80||newArea<oldArea*.5||newArea>oldArea*2){flowRejected++;continue;}
  if(good[4]&&moved[4]&&Math.hypot(moved[4]!.x-center.x-mx,moved[4]!.y-center.y-my)>Math.max(12,Math.sqrt(oldArea)*.4)){flowRejected++;continue;}
  flowAccepted++;
  lastMotion.set(marker.id,{x:mx,y:my});
  lastFlowStatus='Flow tracked: '+good.filter(Boolean).length+'/5 points · dx '+mx.toFixed(1)+' dy '+my.toFixed(1);
  lastFlowAt.set(marker.id,now);
  lastReliableAt.set(marker.id,now);
  results.push({id:marker.id,corners});
 }
 return results;
}

function detect(frame:ImageData){
 const current=flowOnly?pyramid(grayFrame(frame)):null;
 const flowed=flowOnly?flowTrack(previous,current!):[];
 if(flowOnly)previous=current;
 frameNumber++;
 // Decoder and optical flow run independently; valid flow retains an ID between decodes.
 if(flowOnly){
  const successful=new Set(flowed.map(m=>m.id));
  const now=performance.now();
  const retained=tracked.filter(m=>!successful.has(m.id)&&now-(lastReliableAt.get(m.id)??lastDecodedAt.get(m.id)??0)<TRACK_RECOVERY_MS);
  tracked=[...flowed,...retained];
  for(const marker of flowed)recoveryMisses.delete(marker.id);
  for(const marker of retained)recoveryMisses.set(marker.id,(recoveryMisses.get(marker.id)??0)+1);
  return {found:flowed,candidates:[],diagnostics:{candidateCount:0,rawMarkerCount:0,recognizedCount:flowed.length,rejectedCount:0,durationMs:0,note:(flowed.length?'Tracking':retained.length?'Recovering '+retained.length+' marker(s)':'Marker lost')+' · '+lastFlowStatus+' · accepted '+flowAccepted+' / rejected '+flowRejected,pass:'Optical flow',contrast:'Forward/backward checked'}};}

 const start=performance.now();
 const now=performance.now();
 const recovering=consecutiveRoiMisses>0||[...recoveryMisses.values()].some(n=>n>0);
 const useFull=now-lastFullScan>=(recovering?300:FULL_SCAN_INTERVAL_MS)||roiHints.length===0||consecutiveRoiMisses>=3;
 const local=useFull?null:decodeRegions(frame);
 // If the marker rotated outside its normal crop, expand locally before
 // paying for a full-frame scan. A stationary instrument stays in one area.
 const expanded=local&&local.markers.length===0?decodeRegions(frame,ROI_PADDING*2):null;
 const effectiveLocal=expanded&&expanded.markers.length?expanded:local;
 const raw=effectiveLocal?effectiveLocal.markers:detector!.detect(frame);
 if(effectiveLocal){consecutiveRoiMisses=raw.length?0:consecutiveRoiMisses+1;}else{consecutiveRoiMisses=0;}
 if(!effectiveLocal)lastFullScan=now;
 const all=[...raw],candidates:Point[][]=effectiveLocal?[...effectiveLocal.candidates]:[...candidatesOf()].map(c=>cornersOf(c,1)).filter((c):c is Point[]=>!!c);
 let pass=effectiveLocal?effectiveLocal.pass+(expanded&&expanded.markers.length?' · expanded':''):'Full frame',contrast='Unmodified';
 // Expensive fallback passes only run during periodic full-frame reacquisition.
 if(raw.length===0&&!effectiveLocal){
  const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2)),ratio=frame.width/w;
  canvas.width=w;canvas.height=h;
  const source=new OffscreenCanvas(frame.width,frame.height);
  source.getContext('2d')!.putImageData(frame,0,0);
  ctx.drawImage(source,0,0,w,h);
  const reduced=ctx.getImageData(0,0,w,h);
  const histogram=new Uint32Array(256);
  for(let i=0;i<reduced.data.length;i+=4){const v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);histogram[v]++;}
  let acc=0,low=0,high=255;
  for(let i=0;i<256;i++){acc+=histogram[i];if(acc>=w*h*.02){low=i;break;}}
  acc=0;for(let i=255;i>=0;i--){acc+=histogram[i];if(acc>=w*h*.02){high=i;break;}}
  if(high-low>=12){const factor=255/(high-low);for(let i=0;i<reduced.data.length;i+=4){const v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);const y=Math.max(0,Math.min(255,Math.round((v-low)*factor)));reduced.data[i]=y;reduced.data[i+1]=y;reduced.data[i+2]=y;}contrast='Stretched '+low+'–'+high;}
  const fallback=detector!.detect(reduced);
  all.push(...fallback.map(m=>({...m,corners:m.corners.map(p=>({x:p.x*ratio,y:p.y*ratio}))})));
  candidates.push(...candidatesOf().map(c=>cornersOf(c,ratio)).filter((c):c is Array<{x:number;y:number}>=>!!c));
  pass='Original + half-resolution contrast';
  if(fallback.length===0){
   const gray=new Uint8Array(w*h),integral=new Float64Array((w+1)*(h+1));
   for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=(y*w+x)*4,v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);gray[y*w+x]=v;row+=v;integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-12),x1=Math.min(w,x+13),y0=Math.max(0,y-12),y1=Math.min(h,y+13),sum=integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0],v=gray[y*w+x]>sum/((x1-x0)*(y1-y0))-7?255:0,i=(y*w+x)*4;reduced.data[i]=v;reduced.data[i+1]=v;reduced.data[i+2]=v;}
   const adaptive=detector!.detect(reduced);
   all.push(...adaptive.map(m=>({...m,corners:m.corners.map(p=>({x:p.x*ratio,y:p.y*ratio}))})));
   candidates.push(...candidatesOf().map(c=>cornersOf(c,ratio)).filter((c):c is Array<{x:number;y:number}>=>!!c));
   pass='Original + contrast + adaptive';contrast+=' · local mean threshold';
  }
 }
 const decoded=all.filter(m=>isSupportedMarkerId(m.id)&&m.corners.length===4);
 if(decoded.length){for(const marker of decoded)recoveryMisses.delete(marker.id);lastSuccessfulDecodeAt=performance.now();const merged=new Map(roiHints.map(m=>[m.id,m]));for(const m of decoded)merged.set(m.id,m);roiHints=[...merged.values()];}
 // Expire stale search hints: a marker that has been absent should not
 // permanently trap the decoder in the wrong part of the image.
 if(!decoded.length&&performance.now()-lastSuccessfulDecodeAt>4000){roiHints=[];consecutiveRoiMisses=0;}
 for(const marker of decoded)lastDecodedAt.set(marker.id,performance.now());
 const found=[...decoded];
 for(const marker of flowed)if(!found.some(m=>m.id===marker.id))found.push(marker);
 tracked=found;
 return {found,candidates,diagnostics:{candidateCount:candidates.length,rawMarkerCount:all.length,recognizedCount:found.length,rejectedCount:all.length-found.length,durationMs:performance.now()-start,note:(decoded.length?'Markers decoded':flowed.length?'Flow maintained marker':'No tracked marker')+' · flow accepted '+flowAccepted+' / rejected '+flowRejected,pass,contrast}};
}
self.onmessage=async(e:MessageEvent<{type:string;frame?:ImageData;id?:number;flowOnly?:boolean;markers?:MarkerObservation[]}>)=>{
 try{
  if(e.data.type==='init'){flowOnly=!!(e.data as {flowOnly?:boolean}).flowOnly;if(!flowOnly)await initialize();self.postMessage({type:'ready'});}
  else if(e.data.type==='seed'){const markers=(e.data as {markers?:MarkerObservation[]}).markers??[];if(!flowOnly&&markers.length){const merged=new Map(roiHints.map(m=>[m.id,m]));for(const m of markers)merged.set(m.id,m);roiHints=[...merged.values()];}for(const marker of markers){recoveryMisses.delete(marker.id);lastMotion.delete(marker.id);lastReliableAt.set(marker.id,performance.now());lastDecodedAt.set(marker.id,performance.now());lastFlowAt.set(marker.id,performance.now());const idx=tracked.findIndex(m=>m.id===marker.id);if(idx>=0)tracked[idx]=marker;else tracked.push(marker);}}
  else if(e.data.type==='detect'&&e.data.frame){const result=detect(e.data.frame);self.postMessage({type:'result',id:e.data.id,...result});}
 }catch(error){self.postMessage({type:'error',id:e.data.id,message:String(error)});}
};
