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
type GrayImage={width:number;height:number;data:number[]};
type LegacyDetector={grey:GrayImage;thres:GrayImage;binary:number[];contours:Point[][];
 findCandidates:(contours:Point[][],minSize:number,epsilon:number,minLength:number)=>Point[][];
 clockwiseCorners:(candidates:Point[][])=>Point[][];notTooNear:(candidates:Point[][],distance:number)=>Point[][];
 findMarkers:(image:GrayImage,candidates:Point[][],size:number)=>Array<MarkerObservation&{hammingDistance?:number}>;
 detect:(frame:ImageData)=>MarkerObservation[];candidates?:unknown[];polys?:unknown[]};
type ArucoGlobal={DICTIONARIES:Record<string,{nBits:number;tau:number;codeList:number[]}>;Detector:new(options:{dictionaryName:string;maxHammingDistance:number})=>LegacyDetector};
type CvGlobal={grayscale:(frame:ImageData,image:GrayImage)=>void;adaptiveThreshold:(gray:GrayImage,binary:GrayImage,radius:number,bias:number)=>void;findContours:(image:GrayImage,binary:number[])=>Point[][]};
const workerScope=self as DedicatedWorkerGlobalScope & {AR?:ArucoGlobal;CV?:CvGlobal};
const base='https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/';
let detector:LegacyDetector|null=null;
const canvas=new OffscreenCanvas(1,1),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
const source=new OffscreenCanvas(1,1),sourceContext=source.getContext('2d',{willReadFrequently:true})!;
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
 detector=new workerScope.AR.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:2});
}


type Point={x:number;y:number};

const lastMotion=new Map<number,Point>();
let roiHints:MarkerObservation[]=[];
const hintSeenAt=new Map<number,number>();
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

// Refine decoded corners against the actual black/white boundary. A small
// Harris response search corrects pixel quantization without changing IDs or
// allowing corners to jump to a different square.
function refineCorners(frame:ImageData,markers:MarkerObservation[]):MarkerObservation[]{
 const w=frame.width,h=frame.height,data=frame.data;
 const gray=new Uint8Array(w*h);
 for(let i=0;i<gray.length;i++){const j=i*4;gray[i]=Math.round(.299*data[j]+.587*data[j+1]+.114*data[j+2]);}
 const pixel=(x:number,y:number)=>gray[y*w+x];
 const score=(x:number,y:number)=>{
  if(x<3||y<3||x>=w-3||y>=h-3)return -Infinity;
  let xx=0,xy=0,yy=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const px=x+dx,py=y+dy;
   const gx=(pixel(px+1,py)-pixel(px-1,py))*.5;
   const gy=(pixel(px,py+1)-pixel(px,py-1))*.5;
   xx+=gx*gx;xy+=gx*gy;yy+=gy*gy;
  }
  return xx*yy-xy*xy-.04*(xx+yy)*(xx+yy);
 };
 return markers.map(marker=>({...marker,corners:marker.corners.map(c=>{
  const x=Math.round(c.x),y=Math.round(c.y);
  let best=score(x,y),bx=x,by=y;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const value=score(x+dx,y+dy);
   if(value>best){best=value;bx=x+dx;by=y+dy;}
  }
  // Weak or ambiguous responses should preserve the decoder's original corner.
  if(best<100000)return c;
  const offsetX=Math.max(-2,Math.min(2,bx-c.x));
  const offsetY=Math.max(-2,Math.min(2,by-c.y));
  return {x:c.x+offsetX,y:c.y+offsetY};
 })}));
}

const adaptiveProfiles=[[2,3],[5,5],[9,7]] as const;
let adaptiveProfile=0,lastAdaptiveScan=-Infinity,lastAdaptiveExplore=-Infinity;
function decodedCandidates(width:number,epsilons:readonly number[]){
 const d=detector!;const found:MarkerObservation[]=[];
 for(const epsilon of epsilons){
  const quads=d.notTooNear(d.clockwiseCorners(d.findCandidates(d.contours,Math.max(16,width*.005),epsilon,6)),3);
  // Bound candidate work on busy backgrounds; retries require an exact code.
  const score=(quad:Point[])=>quad.reduce((n,p,i)=>n+Math.hypot(p.x-quad[(i+1)%4].x,p.y-quad[(i+1)%4].y),0);
  quads.sort((a,b)=>score(b)-score(a));
  // A 4x4 code plus border has six cells: warp to an exact 6x10 grid.
  found.push(...d.findMarkers(d.grey,quads.slice(0,64),60).filter(m=>m.hammingDistance===0));
 }
 return found;
}
function adaptiveDecode(frame:ImageData,profile:number){
 const d=detector!,cv=workerScope.CV!,[radius,bias]=adaptiveProfiles[profile];
 cv.grayscale(frame,d.grey);cv.adaptiveThreshold(d.grey,d.thres,radius,bias);
 d.contours=cv.findContours(d.thres,d.binary);
 return decodedCandidates(frame.width,[.025,.05]);
}
function recoverNative(frame:ImageData,original:MarkerObservation[]){
 const found=[...decodedCandidates(frame.width,[.025,.075])];
 const ids=new Set([...original,...found].map(m=>m.id));
 // Recover recently seen faces locally at native resolution. Recognizing one
 // easy face must not suppress recovery of the other instruments/faces.
 for(const marker of roiHints.filter(m=>!ids.has(m.id)&&performance.now()-(hintSeenAt.get(m.id)??-Infinity)<1500).slice(0,3)){
  const xs=marker.corners.map(p=>p.x),ys=marker.corners.map(p=>p.y);
  const side=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  if(side>240)continue;
  const pad=Math.max(12,side*.6),left=Math.max(0,Math.floor(Math.min(...xs)-pad)),top=Math.max(0,Math.floor(Math.min(...ys)-pad));
  const width=Math.min(frame.width-left,Math.ceil(side+pad*2)),height=Math.min(frame.height-top,Math.ceil(side+pad*2));
  if(width<12||height<12)continue;
  const crop=new ImageData(width,height);
  for(let y=0;y<height;y++)crop.data.set(frame.data.subarray(((top+y)*frame.width+left)*4,((top+y)*frame.width+left+width)*4),y*width*4);
  for(let profile=0;profile<adaptiveProfiles.length;profile++){
   const recovered=adaptiveDecode(crop,profile).filter(m=>m.id===marker.id);
   if(recovered.length){found.push(...recovered.map(m=>({...m,corners:m.corners.map(p=>({x:p.x+left,y:p.y+top}))})));ids.add(marker.id);break;}
  }
 }
 // Always retain the baseline full scan. Periodic alternate full scans also
 // discover new weak faces, even while another marker is recognized.
 if(original.length===0||performance.now()-lastAdaptiveScan>=500){
  lastAdaptiveScan=performance.now();
  const explore=lastAdaptiveScan-lastAdaptiveExplore>=1000;
  if(explore){lastAdaptiveExplore=lastAdaptiveScan;adaptiveProfile=(adaptiveProfile+1)%adaptiveProfiles.length;}
  let adaptiveFound=false;
  const passes=frame.width*frame.height<=640*480?3:1;
  for(let attempt=0;attempt<passes;attempt++){
   const profile=(adaptiveProfile+attempt)%adaptiveProfiles.length;
   const recovered=adaptiveDecode(frame,profile);found.push(...recovered);
   if(recovered.length){adaptiveProfile=profile;adaptiveFound=true;break;}
  }
  if(!adaptiveFound)adaptiveProfile=(adaptiveProfile+1)%adaptiveProfiles.length;
 }
 return found;
}


function detect(frame:ImageData){
 const start=performance.now();
 const now=performance.now();
 const recovering=consecutiveRoiMisses>0||[...recoveryMisses.values()].some(n=>n>0);
 // Prioritize reliable reacquisition over ROI speed: stale ROI hints can
 // repeatedly miss a perfectly still, clearly visible marker.
 const useFull=true;
 const local=useFull?null:decodeRegions(frame);
 // If the marker rotated outside its normal crop, expand locally before
 // paying for a full-frame scan. A stationary instrument stays in one area.
 const expanded=local&&local.markers.length===0?decodeRegions(frame,ROI_PADDING*2):null;
 const effectiveLocal=expanded&&expanded.markers.length?expanded:local;
 const raw=effectiveLocal?effectiveLocal.markers:detector!.detect(frame);
 if(effectiveLocal){consecutiveRoiMisses=raw.length?0:consecutiveRoiMisses+1;}else{consecutiveRoiMisses=0;}
 if(!effectiveLocal)lastFullScan=now;
 const nativeRecovery=effectiveLocal?[]:recoverNative(frame,raw);
 const all=[...raw,...nativeRecovery],candidates:Point[][]=effectiveLocal?[...effectiveLocal.candidates]:[...candidatesOf()].map(c=>cornersOf(c,1)).filter((c):c is Point[]=>!!c);
 let pass=effectiveLocal?effectiveLocal.pass+(expanded&&expanded.markers.length?' · expanded':''):'Full frame',contrast='Unmodified';
 if(nativeRecovery.length)pass+=' + native candidate/adaptive recovery';
 // Expensive fallback passes only run during periodic full-frame reacquisition.
 if(all.length===0&&!effectiveLocal){
  const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2)),ratio=frame.width/w;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  if(source.width!==frame.width||source.height!==frame.height){source.width=frame.width;source.height=frame.height;}
  sourceContext.putImageData(frame,0,0);
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
 const unique=new Map<number,MarkerObservation>();
 for(const marker of all)if(isSupportedMarkerId(marker.id)&&marker.corners.length===4&&!unique.has(marker.id))unique.set(marker.id,marker);
 const decoded=refineCorners(frame,[...unique.values()]);
 if(decoded.length){for(const marker of decoded)recoveryMisses.delete(marker.id);lastSuccessfulDecodeAt=performance.now();const merged=new Map(roiHints.map(m=>[m.id,m]));for(const m of decoded){merged.set(m.id,m);hintSeenAt.set(m.id,performance.now());}roiHints=[...merged.values()];}
 // Expire stale search hints: a marker that has been absent should not
 // permanently trap the decoder in the wrong part of the image.
 if(!decoded.length&&performance.now()-lastSuccessfulDecodeAt>4000){roiHints=[];consecutiveRoiMisses=0;}
 const found=[...decoded];
 return {found,candidates,diagnostics:{candidateCount:candidates.length,rawMarkerCount:new Set(all.map(m=>m.id)).size,recognizedCount:found.length,rejectedCount:all.filter(m=>!isSupportedMarkerId(m.id)).length,durationMs:performance.now()-start,note:(decoded.length?'Markers decoded':'No tracked marker'),pass,contrast}};
}
self.onmessage=async(e:MessageEvent<{type:string;frame?:ImageData;id?:number;flowOnly?:boolean;markers?:MarkerObservation[]}>)=>{
 try{
  if(e.data.type==='init'){await initialize();self.postMessage({type:'ready'});}
  else if(e.data.type==='seed'){
   const markers=e.data.markers??[];
   const merged=new Map(roiHints.map(m=>[m.id,m]));
   for(const marker of markers){merged.set(marker.id,marker);hintSeenAt.set(marker.id,performance.now());recoveryMisses.delete(marker.id);}
   roiHints=[...merged.values()];
  }
  else if(e.data.type==='detect'&&e.data.frame){const result=detect(e.data.frame);self.postMessage({type:'result',id:e.data.id,...result});}
 }catch(error){self.postMessage({type:'error',id:e.data.id,message:String(error)});}
};
