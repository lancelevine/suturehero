import type {MarkerObservation} from './arucoTracking';

import {MARKER_CODES,isSupportedMarkerId} from './arucoDictionary';
export {MARKER_CODES} from './arucoDictionary';

interface LegacyDetector {detect(frame:ImageData):MarkerObservation[];candidates?:unknown[];polys?:unknown[]}
interface LegacyAR {DICTIONARIES:Record<string,{nBits:number;tau:number;codeList:number[]}>;Detector:new(options:{dictionaryName:string;maxHammingDistance:number})=>LegacyDetector}
declare global {interface Window {AR?:LegacyAR}}
const LIB_BASE='https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/';
let loadPromise:Promise<void>|undefined;
function loadScript(path:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=LIB_BASE+path;script.async=false;
  script.onload=()=>resolve();script.onerror=()=>reject(new Error('Could not load ArUco detector library ('+path+'). Check network or content blockers.'));
  document.head.append(script);
 });
}
export function loadArucoLibrary():Promise<void>{
 return loadPromise??=(async()=>{
  await loadScript('cv.js');
  await loadScript('aruco.js');
  if(!window.AR)throw new Error('ArUco detector library did not initialize');
  window.AR.DICTIONARIES.SUTUREHERO_4X4_50={nBits:16,tau:2,codeList:MARKER_CODES};
 })().catch(error=>{loadPromise=undefined;throw error});
}
export interface ArucoDetector {detect(frame:ImageData):Promise<MarkerObservation[]>;dispose?():void}
export interface DetectorDiagnostics {candidateCount:number|null;rawMarkerCount:number;recognizedCount:number;rejectedCount:number;durationMs:number;note:string;pass:string;contrast:string}
export class BrowserArucoDetector implements ArucoDetector {
 private detector:LegacyDetector|null=null;
 private reducedCanvas=document.createElement('canvas');
 private sourceCanvas=document.createElement('canvas');
 private sourceContext=this.sourceCanvas.getContext('2d')!;
 private reducedContext=this.reducedCanvas.getContext('2d',{willReadFrequently:true})!;
 candidateCorners:Array<Array<{x:number;y:number}>>=[];
 diagnostics:DetectorDiagnostics={candidateCount:null,rawMarkerCount:0,recognizedCount:0,rejectedCount:0,durationMs:0,note:'Waiting for first frame',pass:'—',contrast:'—'};
 async initialize():Promise<void>{
  await loadArucoLibrary();
  this.detector=new window.AR!.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
 }
 async detect(frame:ImageData):Promise<MarkerObservation[]>{
  if(!this.detector)throw new Error('ArUco detector not initialized');
  const start=performance.now();
  // Try full resolution first. If no candidates are found, retry with
  // contrast-stretched pixels at half resolution; webcams often produce
  // soft edges that fail the first polygon approximation.
  const original=this.detector.detect(frame);
  const firstCandidates=Array.isArray(this.detector.candidates)?this.detector.candidates:Array.isArray(this.detector.polys)?this.detector.polys:null;
  const fullCandidates=firstCandidates?[...firstCandidates]:[];
  let raw=original;
  let candidates:unknown[]=fullCandidates;
  let scale=1;
  let pass='Original';
  let contrast='Unmodified';
  if(original.length===0){
   const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2));
   this.reducedCanvas.width=w;this.reducedCanvas.height=h;
   this.sourceCanvas.width=frame.width;this.sourceCanvas.height=frame.height;
   this.sourceContext.putImageData(frame,0,0);
   this.reducedContext.drawImage(this.sourceCanvas,0,0,w,h);
   const reduced=this.reducedContext.getImageData(0,0,w,h);
   // Stretch grayscale contrast based on the sampled luminance range.
   const histogram=new Uint32Array(256);
   for(let i=0;i<reduced.data.length;i+=4){const y=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);histogram[y]++;}
   const count=w*h;let acc=0,low=0,high=255;
   for(let i=0;i<256;i++){acc+=histogram[i];if(acc>=count*.02){low=i;break;}}
   acc=0;for(let i=255;i>=0;i--){acc+=histogram[i];if(acc>=count*.02){high=i;break;}}
   if(high-low>=12){
    const factor=255/(high-low);
    for(let i=0;i<reduced.data.length;i+=4){const y=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);const v=Math.max(0,Math.min(255,Math.round((y-low)*factor)));reduced.data[i]=v;reduced.data[i+1]=v;reduced.data[i+2]=v;}
    contrast=`Stretched ${low}–${high}`;
   }else contrast='Low dynamic range';
   const fallbackRaw=this.detector.detect(reduced);
   const secondCandidates=Array.isArray(this.detector.candidates)?this.detector.candidates:Array.isArray(this.detector.polys)?this.detector.polys:null;
   const fallbackCandidates=secondCandidates?[...secondCandidates]:[];
   const ratio=frame.width/w;
   const scaled=(m:MarkerObservation):MarkerObservation=>({...m,corners:m.corners.map(p=>({x:p.x*ratio,y:p.y*ratio}))});
   raw=[...original,...fallbackRaw.map(scaled)];
   // Preserve original full-resolution candidates; background squares must not
   // prevent the small-marker fallback or erase previous observations.
   const toFull=(c:unknown):unknown=>{
    const vertices=Array.isArray(c)?c:(c as {corners?:unknown})?.corners;
    if(!Array.isArray(vertices))return c;
    return vertices.map(p=>Array.isArray(p)?[p[0]*ratio,p[1]*ratio]:{x:p.x*ratio,y:p.y*ratio});
   };
   candidates=[...fullCandidates,...fallbackCandidates.map(toFull)];
   // Third pass: locally adaptive binarization, independent of room lighting.
   // Integral image provides constant-time mean intensity per neighborhood.
   if(fallbackRaw.length===0){
    const gray=new Uint8Array(w*h),integral=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++){
     let rowSum=0;
     for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      const g=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);
      gray[y*w+x]=g;rowSum+=g;
      integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+rowSum;
     }
    }
    const radius=12;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1);
     const sum=integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0];
     const v=gray[y*w+x]>sum/((x1-x0)*(y1-y0))-7?255:0;
     const i=(y*w+x)*4;reduced.data[i]=v;reduced.data[i+1]=v;reduced.data[i+2]=v;
    }
    const adaptiveRaw=this.detector.detect(reduced);
    const adaptiveCandidates=Array.isArray(this.detector.candidates)?this.detector.candidates:Array.isArray(this.detector.polys)?this.detector.polys:null;
    raw.push(...adaptiveRaw.map(scaled));
    if(adaptiveCandidates)candidates.push(...adaptiveCandidates.map(toFull));
    pass='Original + contrast + adaptive';
    contrast+=' · local mean threshold';
   }
   scale=1;
   pass='Original + half-resolution contrast';
  }
  const recognized=raw.filter(m=>isSupportedMarkerId(m.id)&&m.corners.length===4).map(m=>({...m,corners:m.corners.map(p=>({x:p.x*scale,y:p.y*scale}))}));
  const cornersOf=(candidate:unknown):Array<{x:number;y:number}>|null=>{
   const object=candidate as {corners?:unknown;points?:unknown;vertices?:unknown}|null;
   const vertices=Array.isArray(candidate)?candidate:object?.corners??object?.points??object?.vertices;
   if(!Array.isArray(vertices)||vertices.length!==4)return null;
   const corners=vertices.map((point:unknown)=>{
    if(Array.isArray(point)&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1]))return {x:(point[0] as number)*scale,y:(point[1] as number)*scale};
    if(point&&typeof point==='object'){const p=point as {x?:number;y?:number};if(Number.isFinite(p.x)&&Number.isFinite(p.y))return {x:p.x!*scale,y:p.y!*scale};}
    return null;
   });
   return corners.every(Boolean)?corners as Array<{x:number;y:number}>:null;
  };
  this.candidateCorners=candidates.map(cornersOf).filter((corners):corners is Array<{x:number;y:number}>=>corners!==null);
  this.diagnostics={candidateCount:candidates.length,rawMarkerCount:raw.length,recognizedCount:recognized.length,rejectedCount:Math.max(0,raw.length-recognized.length),durationMs:performance.now()-start,pass,contrast,note:candidates.length===0?'No quadrilaterals found on either pass':recognized.length===0?'Candidate shapes found; marker decode failed':'Markers recognized'};
  return recognized;
 }
}
