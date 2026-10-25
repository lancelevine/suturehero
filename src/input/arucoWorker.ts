/// <reference lib="webworker" />
const MARKER_CODES=[0xb532,0x0f9a,0x332d,0x9946,0x549e,0x79cd,0x9e2e,0xc4f2,0xfeda];
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
const lastDecodedAt=new Map<number,number>();
const lastFlowAt=new Map<number,number>();
// A confirmed ID remains valid while geometrically consistent flow keeps updating it.
const MAX_FLOW_GAP_MS=500;
const MAX_UNCONFIRMED_MS=5000;
let frameNumber=0;
let flowOnly=false;
let flowAccepted=0,flowRejected=0;
let roiHints:MarkerObservation[]=[];
let lastFullScan=0;
const FULL_SCAN_INTERVAL_MS=2500;
const ROI_PADDING=90;
// Hold a stable work-area ROI instead of following every noisy corner update.
const roiAnchors=new Map<number,{x:number;y:number;radius:number;seen:number}>();
function decodeRegions(frame:ImageData,padding=ROI_PADDING):{markers:MarkerObservation[];candidates:Point[][];pass:string;durationMs:number}|null{
 if(!roiHints.length)return null;
 const start=performance.now();
 const regions:Array<{x:number;y:number;w:number;h:number}>=[];
 for(const marker of roiHints){
  const xs=marker.corners.map(p=>p.x),ys=marker.corners.map(p=>p.y);
  const centerX=(Math.min(...xs)+Math.max(...xs))/2,centerY=(Math.min(...ys)+Math.max(...ys))/2;
  const radius=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/2+padding;
  const anchor=roiAnchors.get(marker.id);
  // Large displacement means the working area moved: reacquire immediately.
  const displaced=anchor&&Math.hypot(centerX-anchor.x,centerY-anchor.y)>Math.max(anchor.radius*0.7,80);
  const cx=anchor&&!displaced?anchor.x:centerX,cy=anchor&&!displaced?anchor.y:centerY;
  const searchRadius=Math.max(radius,anchor&&!displaced?anchor.radius:0);
  const x=Math.max(0,Math.floor(cx-searchRadius)),y=Math.max(0,Math.floor(cy-searchRadius));
  const right=Math.min(frame.width,Math.ceil(cx+searchRadius)),bottom=Math.min(frame.height,Math.ceil(cy+searchRadius));
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
  const found=detector!.detect(cropped);
  for(const marker of found)if(marker.id>=0&&marker.id<=8&&!markers.some(m=>m.id===marker.id))markers.push({...marker,corners:marker.corners.map(p=>({x:p.x+region.x,y:p.y+region.y}))});
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
 for(let k=1;k<4;k++){
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
function lk(a:GrayFrame[],b:GrayFrame[],point:Point):Point|null{
 const top=Math.min(a.length,b.length)-1;
 let dx=0,dy=0;
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
  if(det<10000)return null;
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
function flowTrack(a:GrayFrame[]|null,b:GrayFrame[]):MarkerObservation[]{
 if(!a||!tracked.length)return [];
 const results:MarkerObservation[]=[];
 for(const marker of tracked){
  const now=performance.now();
  if(now-(lastFlowAt.get(marker.id)??lastDecodedAt.get(marker.id)??0)>MAX_FLOW_GAP_MS || now-(lastDecodedAt.get(marker.id)??0)>MAX_UNCONFIRMED_MS)continue;
  // Track the center as well as corners. Center motion helps validate a coherent rigid patch.
  const center={x:marker.corners.reduce((n,p)=>n+p.x,0)/4,y:marker.corners.reduce((n,p)=>n+p.y,0)/4};
  const points=[...marker.corners,center];
  const moved=points.map(p=>lk(a,b,p));
  const good=points.map((p,i)=>{
   const next=moved[i];if(!next)return false;
   const reverse=lk(b,a,next);
   return !!reverse&&Math.hypot(reverse.x-p.x,reverse.y-p.y)<2.5;
  });
  const goodCorners=good.slice(0,4).filter(Boolean).length;
  if(goodCorners<3){flowRejected++;continue;}
  // Recover one lost corner by translating it with the median displacement.
  const xs=moved.slice(0,4).map((p,i)=>good[i]&&p?p.x-marker.corners[i].x:null).filter((v):v is number=>v!==null).sort((x,y)=>x-y);
  const ys=moved.slice(0,4).map((p,i)=>good[i]&&p?p.y-marker.corners[i].y:null).filter((v):v is number=>v!==null).sort((x,y)=>x-y);
  const mx=xs[Math.floor(xs.length/2)],my=ys[Math.floor(ys.length/2)];
  const corners=marker.corners.map((p,i)=>good[i]&&moved[i]?moved[i]!:{x:p.x+mx,y:p.y+my});
  const area=(cs:Point[])=>Math.abs(cs.reduce((sum,p,i)=>sum+p.x*cs[(i+1)%4].y-cs[(i+1)%4].x*p.y,0))/2;
  const oldArea=area(marker.corners),newArea=area(corners);
  const coherent=corners.every((p,i)=>Math.hypot(p.x-marker.corners[i].x-mx,p.y-marker.corners[i].y-my)<Math.max(12,Math.sqrt(oldArea)*.55));
  if(!coherent||newArea<80||newArea<oldArea*.5||newArea>oldArea*2){flowRejected++;continue;}
  if(good[4]&&moved[4]&&Math.hypot(moved[4]!.x-center.x-mx,moved[4]!.y-center.y-my)>Math.max(12,Math.sqrt(oldArea)*.4)){flowRejected++;continue;}
  flowAccepted++;
  lastFlowAt.set(marker.id,now);
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
 if(flowOnly){tracked=flowed;return {found:flowed,candidates:[],diagnostics:{candidateCount:0,rawMarkerCount:0,recognizedCount:flowed.length,rejectedCount:0,durationMs:0,note:'Fast flow · accepted '+flowAccepted+' / rejected '+flowRejected,pass:'Optical flow',contrast:'Forward/backward checked'}};}

 const start=performance.now();
 const now=performance.now();
 const useFull=now-lastFullScan>=FULL_SCAN_INTERVAL_MS||roiHints.length===0;
 const local=useFull?null:decodeRegions(frame);
 // If the marker rotated outside its normal crop, expand locally before
 // paying for a full-frame scan. A stationary instrument stays in one area.
 const expanded=local&&local.markers.length===0?decodeRegions(frame,ROI_PADDING*2):null;
 const effectiveLocal=expanded&&expanded.markers.length?expanded:local;
 const raw=effectiveLocal?effectiveLocal.markers:detector!.detect(frame);
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
 const decoded=all.filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4);
 if(decoded.length){const merged=new Map(roiHints.map(m=>[m.id,m]));for(const m of decoded){merged.set(m.id,m);const xs=m.corners.map(p=>p.x),ys=m.corners.map(p=>p.y);const x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;const radius=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/2+ROI_PADDING;const old=roiAnchors.get(m.id);roiAnchors.set(m.id,old&&Math.hypot(x-old.x,y-old.y)<old.radius*.7?{x:old.x*.95+x*.05,y:old.y*.95+y*.05,radius:Math.max(radius,old.radius*.98),seen:performance.now()}:{x,y,radius,seen:performance.now()});}roiHints=[...merged.values()];}
 for(const marker of decoded)lastDecodedAt.set(marker.id,performance.now());
 const found=[...decoded];
 for(const marker of flowed)if(!found.some(m=>m.id===marker.id))found.push(marker);
 tracked=found;
 return {found,candidates,diagnostics:{candidateCount:candidates.length,rawMarkerCount:all.length,recognizedCount:found.length,rejectedCount:all.length-found.length,durationMs:performance.now()-start,note:(decoded.length?'Markers decoded':flowed.length?'Flow maintained marker':'No tracked marker')+' · flow accepted '+flowAccepted+' / rejected '+flowRejected,pass,contrast}};
}
self.onmessage=async(e:MessageEvent<{type:string;frame?:ImageData;id?:number;flowOnly?:boolean;markers?:MarkerObservation[]}>)=>{
 try{
  if(e.data.type==='init'){flowOnly=!!(e.data as {flowOnly?:boolean}).flowOnly;if(!flowOnly)await initialize();self.postMessage({type:'ready'});}
  else if(e.data.type==='seed'){const markers=(e.data as {markers?:MarkerObservation[]}).markers??[];if(!flowOnly&&markers.length){const merged=new Map(roiHints.map(m=>[m.id,m]));for(const m of markers)merged.set(m.id,m);roiHints=[...merged.values()];}for(const marker of markers){lastDecodedAt.set(marker.id,performance.now());lastFlowAt.set(marker.id,performance.now());const idx=tracked.findIndex(m=>m.id===marker.id);if(idx>=0){if(!flowOnly)tracked[idx]=marker;/* Never replace newer flow corners with a stale decode snapshot. */}else tracked.push(marker);}}
  else if(e.data.type==='detect'&&e.data.frame){const result=detect(e.data.frame);self.postMessage({type:'result',id:e.data.id,...result});}
 }catch(error){self.postMessage({type:'error',id:e.data.id,message:String(error)});}
};
