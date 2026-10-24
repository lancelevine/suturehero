/// <reference lib="webworker" />
import {MARKER_CODES} from './arucoDetector';
import type {MarkerObservation} from './arucoTracking';
type LegacyDetector={detect:(frame:ImageData)=>MarkerObservation[];candidates?:unknown[];polys?:unknown[]};
type ArucoGlobal={DICTIONARIES:Record<string,{nBits:number;tau:number;codeList:number[]}>;Detector:new(options:{dictionaryName:string;maxHammingDistance:number})=>LegacyDetector};
declare const self:DedicatedWorkerGlobalScope & {AR?:ArucoGlobal};
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
 if(!self.AR)throw Error('ArUco library did not initialize in worker');
 self.AR.DICTIONARIES.SUTUREHERO_4X4_50={nBits:16,tau:2,codeList:MARKER_CODES};
 detector=new self.AR.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
}
function detect(frame:ImageData){
 const start=performance.now(),raw=detector!.detect(frame);
 const all=[...raw],candidates=[...candidatesOf()].map(c=>cornersOf(c,1)).filter((c):c is Array<{x:number;y:number}>=>!!c);
 let pass='Original',contrast='Unmodified';
 if(raw.length===0){
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
 const found=all.filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4);
 return {found,candidates,diagnostics:{candidateCount:candidates.length,rawMarkerCount:all.length,recognizedCount:found.length,rejectedCount:all.length-found.length,durationMs:performance.now()-start,note:candidates.length===0?'No quadrilaterals found':found.length===0?'Candidate shapes found; marker decode failed':'Markers recognized',pass,contrast}};
}
self.onmessage=async(e:MessageEvent<{type:string;frame?:ImageData;id?:number}>)=>{
 try{
  if(e.data.type==='init'){await initialize();self.postMessage({type:'ready'});}
  else if(e.data.type==='detect'&&e.data.frame){const result=detect(e.data.frame);self.postMessage({type:'result',id:e.data.id,...result});}
 }catch(error){self.postMessage({type:'error',id:e.data.id,message:String(error)});}
};
