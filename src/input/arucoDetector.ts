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
export interface DetectorDiagnostics {candidateCount:number|null;rawMarkerCount:number;recognizedCount:number;rejectedCount:number;durationMs:number;note:string}
export class BrowserArucoDetector implements ArucoDetector {
 private detector:LegacyDetector|null=null;
 candidateCorners:Array<Array<{x:number;y:number}>>=[];
 diagnostics:DetectorDiagnostics={candidateCount:null,rawMarkerCount:0,recognizedCount:0,rejectedCount:0,durationMs:0,note:'Waiting for first frame'};
 async initialize():Promise<void>{
  await loadArucoLibrary();
  this.detector=new window.AR!.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
 }
 async detect(frame:ImageData):Promise<MarkerObservation[]>{
  if(!this.detector)throw new Error('ArUco detector not initialized');
  const start=performance.now();
  const raw=this.detector.detect(frame);
  const recognized=raw.filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4);
  const candidates=Array.isArray(this.detector.candidates)?this.detector.candidates:Array.isArray(this.detector.polys)?this.detector.polys:null;
  // js-aruco2 exposes candidate quadrilaterals as arrays of {x,y} vertices.
  // Ignore malformed entries rather than drawing misleading outlines.
  const cornersOf=(candidate:unknown):Array<{x:number;y:number}>|null=>{
   const object=candidate as {corners?:unknown;points?:unknown;vertices?:unknown}|null;
   const vertices=Array.isArray(candidate)?candidate:object?.corners??object?.points??object?.vertices;
   if(!Array.isArray(vertices)||vertices.length!==4)return null;
   const corners=vertices.map((point:unknown)=>{
    if(Array.isArray(point)&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1]))return {x:point[0] as number,y:point[1] as number};
    if(point&&typeof point==='object'){const p=point as {x?:number;y?:number};if(Number.isFinite(p.x)&&Number.isFinite(p.y))return {x:p.x!,y:p.y!};}
    return null;
   });
   return corners.every(Boolean)?corners as Array<{x:number;y:number}>:null;
  };
  this.candidateCorners=(candidates??[]).map(cornersOf).filter((corners):corners is Array<{x:number;y:number}>=>corners!==null);
  this.diagnostics={candidateCount:candidates?.length??null,rawMarkerCount:raw.length,recognizedCount:recognized.length,rejectedCount:Math.max(0,raw.length-recognized.length),durationMs:performance.now()-start,note:candidates===null?'Candidate count unavailable from detector library':candidates.length===0?'No candidate quadrilaterals found':recognized.length===0?'Candidates found but no requested marker ID decoded':'Markers recognized'};
  return recognized;
 }
}
