import {trackingPerformance as perf} from '../diagnostics/TrackingPerformance';
import {ReplayWorkQueue} from '../trackingLab/ReplayWorkQueue';
import {recordedInput} from '../trackingLab/runtime';
import {ARUCO_LIBRARY_URLS} from './arucoLibraryUrls';
import type {MarkerObservation} from './arucoTracking';
import type {DetectorDiagnostics} from './arucoDetector';
import {isFlowSeedRef,type FlowSeedRef} from './flowFrames';

/**
 * A marker decode or flow worker with promise-based requests (moved out of tracking.ts,
 * 2026-11-26; code unchanged). During Tracking Lab replay, decode requests run one at a
 * time through a shared queue so replays are repeatable.
 */
const replayWorkQueue=new ReplayWorkQueue();
export class WorkerDetector {
 private worker:Worker|null=null;
 private pending=new Map<number,{resolve:(markers:MarkerObservation[])=>void;reject:(error:Error)=>void;started:number}>();
 constructor(private label:string){}
 lastFrameSize={width:0,height:0};
 lastDetectedIds:number[]=[];lastResultAt=-Infinity;
 get busy(){return this.pending.size>0;}
 private sequence=0;
 candidateCorners:Array<Array<{x:number;y:number}>>=[];
 diagnostics:DetectorDiagnostics={candidateCount:null,rawMarkerCount:0,recognizedCount:0,rejectedCount:0,durationMs:0,note:'Waiting',pass:'—',contrast:'—'};
 async initialize(flowOnly=false){
  this.dispose();
  const worker=flowOnly?new Worker(new URL('./arucoFlowWorker.ts',import.meta.url),{type:'module'}):new Worker(new URL('./arucoWorker.ts',import.meta.url));
  this.worker=worker;
  await new Promise<void>((resolve,reject)=>{
   const timeout=window.setTimeout(()=>reject(new Error('Detector worker initialization timed out')),15000);
   worker.onmessage=(event:MessageEvent<{type:string;id?:number;found?:MarkerObservation[];candidates?:Array<Array<{x:number;y:number}>>;diagnostics?:DetectorDiagnostics;message?:string}>)=>{
    const data=event.data;
    if(data.type==='ready'){clearTimeout(timeout);resolve();return;}
    if(data.type==='error'&&data.id===undefined){clearTimeout(timeout);reject(new Error(data.message));return;}
    if(data.id===undefined)return;
    const pending=this.pending.get(data.id);if(!pending)return;
    this.pending.delete(data.id);
    if(data.type==='error'){perf.count(this.label+' errors');pending.reject(new Error(data.message));return;}
    const elapsed=performance.now()-pending.started,worker=data.diagnostics?.durationMs??0;perf.sample(this.label+' round trip',elapsed);perf.sample(this.label+' worker',worker);perf.sample(this.label+' transfer/callback',Math.max(0,elapsed-worker));
    for(const [stage,ms] of Object.entries(data.diagnostics?.timings??{}))perf.sample(this.label+' '+stage,ms);
    this.candidateCorners=data.candidates??[];
    if(data.diagnostics)this.diagnostics=data.diagnostics;
    this.lastDetectedIds=(data.found??[]).map(m=>m.id);this.lastResultAt=pending.started;
    pending.resolve(data.found??[]);
   };
   worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Detector worker failed to load'));};
   worker.postMessage({type:'init',flowOnly,libraries:ARUCO_LIBRARY_URLS});
  });
 }
 confirm(markers:MarkerObservation[]){this.worker?.postMessage({type:'confirm',at:recordedInput()?performance.now():undefined,ids:markers.map(m=>m.id)});}
 seed(markers:MarkerObservation[],frame?:ImageData|FlowSeedRef){
  // A kept frame (src/input/flowFrames.ts) is referenced by key once the message that stores it has been posted.
  if(isFlowSeedRef(frame)){void frame.ready.then(()=>this.worker?.postMessage({type:'seed',at:recordedInput()?performance.now():undefined,markers,key:frame.key}));return;}
  this.worker?.postMessage({type:'seed',at:recordedInput()?performance.now():undefined,markers,frame});
 }
 /** Flow from a transferred bitmap; `keep` asks the worker to keep this frame for a later seed. */
 detectBitmap(bitmap:ImageBitmap,keep?:number,origin?:{x:number;y:number}):Promise<MarkerObservation[]>{
  if(!this.worker)return Promise.reject(new Error('Detector worker not initialized'));
  const id=++this.sequence;this.lastFrameSize={width:bitmap.width,height:bitmap.height};
  return new Promise<MarkerObservation[]>((resolve,reject)=>{this.pending.set(id,{resolve,reject,started:performance.now()});this.worker!.postMessage({type:'detect',id,bitmap,keep,origin},[bitmap]);});
 }
 /** Keep a frame in the flow worker for a later seed, without running flow on it. */
 store(bitmap:ImageBitmap,keep:number){if(this.worker)this.worker.postMessage({type:'store',bitmap,keep},[bitmap]);else bitmap.close();}
 detect(frame:ImageData,origin={x:0,y:0}):Promise<MarkerObservation[]>{
  if(!this.worker)return Promise.reject(new Error('Detector worker not initialized'));
  const id=++this.sequence;this.lastFrameSize={width:frame.width,height:frame.height};
  const request=()=>new Promise<MarkerObservation[]>((resolve,reject)=>{this.pending.set(id,{resolve,reject,started:performance.now()});this.worker!.postMessage({type:'detect',at:recordedInput()?performance.now():undefined,id,frame,origin},[frame.data.buffer]);});
  return recordedInput()?replayWorkQueue.run(request):request();
 }
 dispose(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values())p.reject(new Error('Worker stopped'));this.pending.clear();}
}
