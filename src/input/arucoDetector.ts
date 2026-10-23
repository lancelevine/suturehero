import type {MarkerObservation} from './arucoTracking';

/** OpenCV DICT_4X4_50, first nine IDs, generated from OpenCV 4.13's
 * generateImageMarker and encoded as row-major white=1 bits. */
export const MARKER_CODES = [0xb532,0x0f9a,0x332d,0x9946,0x549e,0x79cd,0x9e2e,0xc4f2,0xfeda];

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
  if(original.length===0&&fullCandidates.length===0){
   const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2));
   this.reducedCanvas.width=w;this.reducedCanvas.height=h;
   const source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;
   source.getContext('2d')!.putImageData(frame,0,0);
   this.reducedContext.drawImage(source,0,0,w,h);
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
   raw=this.detector.detect(reduced);
   const secondCandidates=Array.isArray(this.detector.candidates)?this.detector.candidates:Array.isArray(this.detector.polys)?this.detector.polys:null;
   candidates=secondCandidates?[...secondCandidates]:[];
   scale=frame.width/w;
   pass='Half-resolution contrast';
  }
  const recognized=raw.filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4).map(m=>({...m,corners:m.corners.map(p=>({x:p.x*scale,y:p.y*scale}))}));
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
