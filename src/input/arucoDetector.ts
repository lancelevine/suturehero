import type {MarkerObservation} from './arucoTracking';

/** OpenCV DICT_4X4_50, first nine IDs, generated from OpenCV 4.13's
 * generateImageMarker and encoded as row-major white=1 bits. */
export const MARKER_CODES = [0xb532,0x0f9a,0x332d,0x9946,0x549e,0x79cd,0x9e2e,0xc4f2,0xfeda];

interface LegacyDetector {detect(frame:ImageData):MarkerObservation[]}
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
export class BrowserArucoDetector implements ArucoDetector {
 private detector:LegacyDetector|null=null;
 async initialize():Promise<void>{
  await loadArucoLibrary();
  this.detector=new window.AR!.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
 }
 async detect(frame:ImageData):Promise<MarkerObservation[]>{
  if(!this.detector)throw new Error('ArUco detector not initialized');
  return this.detector.detect(frame).filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4);
 }
}
