import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {availableCameras,MARKER_GROUPS,openCamera,type MarkerObservation} from './input/arucoTracking';
import type {DetectorDiagnostics} from './input/arucoDetector';
import {estimateMarkerPose} from './input/markerPose';
import {Instrument} from './instruments/Instrument';
import './style.css';
import './tracking.css';

declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">INSTRUMENT TRACKING LAB · BUILD ${__SUTUREHERO_BUILD__} (${__SUTUREHERO_REVISION__})</span><a href="./">← Return to practice</a></header>
<main class="tracking-layout"><section class="tracking-panel"><div class="eyebrow">01 / CAMERA</div><h1>Instrument tracking</h1><p class="intro">Start your webcam to detect ArUco markers IDs 0–8. Outlines and IDs appear on the video.</p>
<div class="tracking-actions"><label for="tracking-mode">Tracking mode</label><select id="tracking-mode"><option value="mono">1 camera · 3D tracking</option><option value="stereo">2 cameras · experimental</option></select><label><input id="lock-depth" type="checkbox" checked> Lock depth</label></div><p class="tracking-message" id="tracking-mode-info">1 camera: filtered approximate depth, with optional depth lock. Rotation is approximate. Two-camera stereo tracking is not calibrated yet.</p>
<div class="tracking-actions"><label for="camera-select">Camera</label><select id="camera-select"><option value="">Default camera</option></select><button id="start-camera">Start camera 1</button><button id="stop-camera" disabled>Stop camera</button></div>
<div class="tracking-video"><video id="camera-video" autoplay playsinline muted></video><canvas id="camera-overlay"></canvas><span id="camera-placeholder">Camera is off</span></div>
<div class="tracking-actions"><label for="camera-select-2">Second camera</label><select id="camera-select-2"><option value="">Choose second camera</option></select><button id="start-camera-2">Start second camera</button><button id="stop-camera-2" disabled>Stop second camera</button></div>
<div class="tracking-video"><video id="camera-video-2" autoplay playsinline muted></video><canvas id="camera-overlay-2"></canvas><span id="camera-placeholder-2">Second camera is off</span></div>
<details class="tracking-details"><summary>Diagnostics &amp; Calibration</summary><div class="tracking-details-body"><p class="tracking-message" id="camera-status-2">Second camera ready. Independent marker detection only; stereo fusion is not enabled yet.</p><p class="tracking-message" id="stereo-match-status">Stereo matching: waiting for both cameras.</p>
<section class="tracking-panel" style="margin-top:12px;padding:14px">
 <div class="eyebrow">STEREO CALIBRATION · CAPTURE</div>
 <p class="tracking-message">Checkerboard: <strong>8 × 8 squares · 7 × 7 inner corners · 37 mm squares</strong>. Hold the entire board in view of both cameras. Capture 20–30 varied poses, including corners of the workspace and tilted angles. Keep both cameras fixed.</p>
 <div class="tracking-actions"><button id="capture-stereo-pair">Capture checkerboard pair</button><button id="export-stereo-pairs" disabled>Export captures</button><button id="clear-stereo-pairs">Clear captures</button></div>
 <p class="tracking-message" id="stereo-calibration-status">0 pairs captured. This stage records paired images; calibration solving and triangulation are not enabled yet.</p>
</section>
<label class="tracking-message"><input id="show-threshold" type="checkbox"> Show thresholded camera image (diagnostic)</label><canvas id="threshold-preview" style="display:none;width:100%;aspect-ratio:16/9;background:#15242c;image-rendering:pixelated"></canvas><label class="tracking-message"><input id="show-crop" type="checkbox"> Show center crop (place prism in center of camera)</label><div id="crop-views" style="display:none;grid-template-columns:1fr 1fr;gap:8px"><div><small>Original crop</small><canvas id="crop-original" style="width:100%;image-rendering:pixelated"></canvas></div><div><small>Adaptive threshold crop</small><canvas id="crop-adaptive" style="width:100%;image-rendering:pixelated"></canvas></div></div><p class="tracking-message"><span style="color:#179a68;font-weight:bold">Green</span> = decoded marker</p>
<p class="tracking-message" id="camera-status" role="status">Ready. Camera permission requires localhost or HTTPS.</p>
<details class="tracking-details"><summary>Camera Focus &amp; Exposure</summary><div class="tracking-details-body"><p class="tracking-message">Availability depends on camera and browser.</p><div id="camera-settings-controls"></div></div></details><section class="tracking-panel" style="padding:12px;margin:12px 0"><div class="eyebrow">WORKING DEPTH CALIBRATION</div><label>Working depth (mm) <input id="working-depth-mm" type="number" min="50" max="1500" step="10" value="400" style="width:90px"></label><div class="tracking-actions"><button id="set-depth-near" type="button">Set Near</button><button id="set-depth-far" type="button">Set Far</button><button id="reset-depth-range" type="button">Reset depth</button></div><p id="depth-range-status" class="tracking-message">Hold a tracked prism at the near boundary and click Set Near, then repeat at the far boundary.</p></section><div class="tracking-stats" aria-label="Live camera diagnostics">
<div><strong>Camera resolution</strong><span id="diag-resolution">Not started</span></div>
<div><strong>Frames analyzed</strong><span id="diag-frames">0</span></div><div><strong>Detection FPS</strong><span id="diag-detection-fps">0</span></div>
<div><strong>Candidate squares</strong><span id="diag-candidates">—</span></div><div><strong>Outlines drawn</strong><span id="diag-outlines">—</span></div>
<div><strong>Decoded markers</strong><span id="diag-decoded">—</span></div>
<div><strong>Detection time</strong><span id="diag-time">—</span></div><div><strong>Detection pass</strong><span id="diag-pass">—</span></div><div><strong>Image contrast</strong><span id="diag-contrast">—</span></div>
<div><strong>Detection status</strong><span id="diag-note">Waiting for camera</span></div>
</div>
</div></details><div class="tracking-actions"><label><input id="simulation" type="checkbox"> Simulated input</label><button id="reset-sim">Reset positions</button></div>
<p class="tracking-message">Live mode: move the printed markers to move the virtual instruments. Simulation mode: needle driver arrow keys, forceps W/A/S/D, scissors I/J/K/L (Shift = faster).</p>
</section><section class="tracking-panel"><div class="eyebrow">02 / VIRTUAL VIEW</div><h2>Instrument diagnostics</h2><div id="tracking-scene"></div><details class="tracking-details"><summary>Virtual View Controls &amp; Diagnostics</summary><div class="tracking-details-body"><div class="tracking-actions"><button id="reset-view">Reset view</button><span class="tracking-message">Drag to rotate · Right-drag to pan · Scroll to zoom</span></div><div class="tracking-stats"><div><strong>Needle driver</strong><span id="driver-readout">Simulated · (0, 0)</span></div><div><strong>Forceps</strong><span id="forceps-readout">Simulated · (0, 0)</span></div><div><strong>Scissors</strong><span id="scissors-readout">Simulated · (0, 0)</span></div><div><strong>V5 prism faces</strong><span id="face-overlap-readout">Waiting for camera</span></div><div><strong>Detected markers</strong><span id="marker-readout">Waiting for camera</span></div></div><p class="tracking-message">ArUco dictionary: DICT_4X4_50 · Driver IDs 0–2 (V5) · Forceps IDs 3–5. Single-camera relative 3D rotation tracking enabled (roll, pitch, yaw), with angular smoothing. Coordinates are camera-relative; depth and angles are approximate until webcam calibration. Instrument rotation uses nominal 120° V5 face offsets; exact marker print orientation may require calibration.</p><div class="tracking-tuning"><label>Rotation sensitivity <input id="rotation-sensitivity" type="range" min="0.5" max="8" step="0.5" value="3"><output id="rotation-sensitivity-value">3°</output></label><label>Rotation gain <input id="rotation-gain" type="range" min="0.1" max="1" step="0.05" value="0.1"><output id="rotation-gain-value">0.10×</output></label><label>Depth sensitivity <input id="depth-sensitivity" type="range" min="0.5" max="4" step="0.25" value="1.5"><output id="depth-sensitivity-value">1.5×</output></label><p class="tracking-message" id="tracking-filter-diagnostics">Raw and filtered depth/rotation diagnostics appear during tracking.</p></div></div></details></section></main>`;
const video=document.querySelector<HTMLVideoElement>('#camera-video')!;
const overlay=document.querySelector<HTMLCanvasElement>('#camera-overlay')!;
const status=document.querySelector<HTMLElement>('#camera-status')!;
const start=document.querySelector<HTMLButtonElement>('#start-camera')!;
const stop=document.querySelector<HTMLButtonElement>('#stop-camera')!;
const select=document.querySelector<HTMLSelectElement>('#camera-select')!;
const simulation=document.querySelector<HTMLInputElement>('#simulation')!;
const trackingMode=document.querySelector<HTMLSelectElement>('#tracking-mode')!;
const trackingModeInfo=document.querySelector<HTMLElement>('#tracking-mode-info')!;
const lockDepth=document.querySelector<HTMLInputElement>('#lock-depth')!;
const rotationSensitivity=document.querySelector<HTMLInputElement>('#rotation-sensitivity')!;
const rotationGain=document.querySelector<HTMLInputElement>('#rotation-gain')!;
const rotationGainValue=document.querySelector<HTMLOutputElement>('#rotation-gain-value')!;
const depthSensitivity=document.querySelector<HTMLInputElement>('#depth-sensitivity')!;
const rotationSensitivityValue=document.querySelector<HTMLOutputElement>('#rotation-sensitivity-value')!;
const depthSensitivityValue=document.querySelector<HTMLOutputElement>('#depth-sensitivity-value')!;
const filterDiagnostics=document.querySelector<HTMLElement>('#tracking-filter-diagnostics')!;
const workingDepthInput=document.querySelector<HTMLInputElement>('#working-depth-mm')!;
const depthRangeStatus=document.querySelector<HTMLElement>('#depth-range-status')!;
rotationSensitivity.addEventListener('input',()=>{rotationSensitivityValue.textContent=`${rotationSensitivity.value}°`;rotationFilterStates.clear();});
rotationGain.addEventListener('input',()=>{rotationGainValue.textContent=`${Number(rotationGain.value).toFixed(2)}×`;});
depthSensitivity.addEventListener('input',()=>{depthSensitivityValue.textContent=`${depthSensitivity.value}×`;depthStates.clear();});
lockDepth.addEventListener('change',()=>{liveTargets.clear();stationaryStates.clear();depthStates.clear();});
trackingMode.addEventListener('change',()=>{
 liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationGeometryStates.clear();prismFaceOffsets.clear();depthStates.clear();
 trackingModeInfo.textContent=trackingMode.value==='mono'
  ?'1 camera: filtered approximate depth, with optional depth lock. Camera 1 drives movement and rotation.'
  :'2 cameras: both feeds detect markers, but stereo fusion and metric depth require calibration. Camera 1 still drives the instruments.';
});
simulation.addEventListener('change',()=>{liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationGeometryStates.clear();rotationFilterStates.clear();depthStates.clear();driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.15);scissors.position.set(0,.25,1.05);driver.quaternion.identity();forceps.quaternion.identity();scissors.quaternion.identity();});
const markerReadout=document.querySelector<HTMLElement>('#marker-readout')!;
const driverReadout=document.querySelector<HTMLElement>('#driver-readout')!;
const forcepsReadout=document.querySelector<HTMLElement>('#forceps-readout')!;
const scissorsReadout=document.querySelector<HTMLElement>('#scissors-readout')!;
const faceOverlapReadout=document.querySelector<HTMLElement>('#face-overlap-readout')!;
class WorkerDetector {
 private worker:Worker|null=null;
 private pending=new Map<number,{resolve:(markers:MarkerObservation[])=>void;reject:(error:Error)=>void}>();
 private sequence=0;
 candidateCorners:Array<Array<{x:number;y:number}>>=[];
 diagnostics:DetectorDiagnostics={candidateCount:null,rawMarkerCount:0,recognizedCount:0,rejectedCount:0,durationMs:0,note:'Waiting',pass:'—',contrast:'—'};
 async initialize(flowOnly=false){
  this.dispose();
  const worker=new Worker(new URL('./input/arucoWorker.ts',import.meta.url));
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
    if(data.type==='error'){pending.reject(new Error(data.message));return;}
    this.candidateCorners=data.candidates??[];
    if(data.diagnostics)this.diagnostics=data.diagnostics;
    pending.resolve(data.found??[]);
   };
   worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Detector worker failed to load'));};
   worker.postMessage({type:'init',flowOnly});
  });
 }
 seed(markers:MarkerObservation[]){this.worker?.postMessage({type:'seed',markers});}
 detect(frame:ImageData):Promise<MarkerObservation[]>{
  if(!this.worker)return Promise.reject(new Error('Detector worker not initialized'));
  const id=++this.sequence;
  return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker!.postMessage({type:'detect',id,frame},[frame.data.buffer]);});
 }
 dispose(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values())p.reject(new Error('Worker stopped'));this.pending.clear();}
}
const detector=new WorkerDetector();
const fastTracker=new WorkerDetector();
let fastProcessing=false,lastFastFrame=0,lastSlowFrame=0,latestFlowAt=0,latestDecodeAt=0;
let fastFrames=0,slowFrames=0,fastWindow=performance.now();
const thresholdToggle=document.querySelector<HTMLInputElement>('#show-threshold')!;
const thresholdPreview=document.querySelector<HTMLCanvasElement>('#threshold-preview')!;
const thresholdContext=thresholdPreview.getContext('2d')!;
const cropToggle=document.querySelector<HTMLInputElement>('#show-crop')!;
const cropViews=document.querySelector<HTMLElement>('#crop-views')!;
const cropOriginal=document.querySelector<HTMLCanvasElement>('#crop-original')!;
const cropAdaptive=document.querySelector<HTMLCanvasElement>('#crop-adaptive')!;
cropToggle.addEventListener('change',()=>{cropViews.style.display=cropToggle.checked?'grid':'none';});
function renderCrop(frame:ImageData){
 const side=Math.min(440,frame.width,frame.height),sx=Math.floor((frame.width-side)/2),sy=Math.floor((frame.height-side)/2);
 const original=cropOriginal.getContext('2d')!,adaptive=cropAdaptive.getContext('2d')!;
 cropOriginal.width=side;cropOriginal.height=side;cropAdaptive.width=side;cropAdaptive.height=side;
 const source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;source.getContext('2d')!.putImageData(frame,0,0);
 original.drawImage(source,sx,sy,side,side,0,0,side,side);
 const data=original.getImageData(0,0,side,side),g=new Uint8Array(side*side),ii=new Float64Array((side+1)*(side+1));
 for(let y=0;y<side;y++){let row=0;for(let x=0;x<side;x++){const p=(y*side+x)*4,v=Math.round(.299*data.data[p]+.587*data.data[p+1]+.114*data.data[p+2]);g[y*side+x]=v;row+=v;ii[(y+1)*(side+1)+x+1]=ii[y*(side+1)+x+1]+row;}}
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  const x0=Math.max(0,x-12),x1=Math.min(side,x+13),y0=Math.max(0,y-12),y1=Math.min(side,y+13);
  const sum=ii[y1*(side+1)+x1]-ii[y0*(side+1)+x1]-ii[y1*(side+1)+x0]+ii[y0*(side+1)+x0];
  const v=g[y*side+x]>sum/((x1-x0)*(y1-y0))-7?255:0,p=(y*side+x)*4;
  data.data[p]=v;data.data[p+1]=v;data.data[p+2]=v;data.data[p+3]=255;
 }
 adaptive.putImageData(data,0,0);
}

thresholdToggle.addEventListener('change',()=>{thresholdPreview.style.display=thresholdToggle.checked?'block':'none';});
function renderThreshold(frame:ImageData){
 const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2));
 thresholdPreview.width=w;thresholdPreview.height=h;
 const source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;source.getContext('2d')!.putImageData(frame,0,0);
 thresholdContext.drawImage(source,0,0,w,h);
 const output=thresholdContext.getImageData(0,0,w,h),hist=new Uint32Array(256),gray=new Uint8Array(w*h);
 for(let i=0;i<gray.length;i++){const j=i*4;const v=Math.round(.299*output.data[j]+.587*output.data[j+1]+.114*output.data[j+2]);gray[i]=v;hist[v]++;}
 let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let back=0,weightedBack=0,best=-1,threshold=127;
 for(let i=0;i<256;i++){back+=hist[i];if(!back)continue;const front=gray.length-back;if(!front)break;weightedBack+=i*hist[i];const delta=weightedBack/back-(sum-weightedBack)/front;const variance=back*front*delta*delta;if(variance>best){best=variance;threshold=i;}}
 for(let i=0;i<gray.length;i++){const v=gray[i]>threshold?255:0;const j=i*4;output.data[j]=v;output.data[j+1]=v;output.data[j+2]=v;output.data[j+3]=255;}
 thresholdContext.putImageData(output,0,0);
}


// Second independent USB camera for stereo setup validation (not yet fused into pose).
const video2=document.querySelector<HTMLVideoElement>('#camera-video-2')!;
const overlay2=document.querySelector<HTMLCanvasElement>('#camera-overlay-2')!;
const select2=document.querySelector<HTMLSelectElement>('#camera-select-2')!;
const start2=document.querySelector<HTMLButtonElement>('#start-camera-2')!;
const stop2=document.querySelector<HTMLButtonElement>('#stop-camera-2')!;
const status2=document.querySelector<HTMLElement>('#camera-status-2')!;
const detector2=new WorkerDetector();
const frame2=document.createElement('canvas');
const context2=frame2.getContext('2d',{willReadFrequently:true})!;
const overlayContext2=overlay2.getContext('2d')!;
let stream2:MediaStream|null=null,ready2=false,processing2=false,lastDetection2=0,session2=0;
let secondaryObservations:MarkerObservation[]=[];
let secondaryObservationsAt=0;
const stereoStatus=document.querySelector<HTMLElement>('#stereo-match-status')!;
function updateStereoMatches(){
 if(!stream||!stream2||!observationsAt||!secondaryObservationsAt){stereoStatus.textContent='Stereo matching: waiting for both camera detections.';return;}
 const delta=Math.abs(observationsAt-secondaryObservationsAt);
 const matches=observations.filter(primary=>secondaryObservations.some(secondary=>secondary.id===primary.id)).map(marker=>marker.id);
 stereoStatus.textContent='Stereo: '+(delta<=250?'':'frames not synchronized · ')+(matches.length?'shared marker IDs '+matches.join(', '):'no shared marker IDs')+' · frame offset '+Math.round(delta)+' ms · calibration required for 3D';
}


const cameraSettings=document.querySelector<HTMLElement>('#camera-settings-controls')!;
function renderCameraSettings(){
 cameraSettings.replaceChildren();
 for(const [label,active] of [['Camera 1',stream],['Camera 2',stream2]] as const){
  const section=document.createElement('div');section.className='camera-settings-group';
  const heading=document.createElement('strong');heading.textContent=label;section.append(heading);
  const track=active?.getVideoTracks()[0];
  if(!track){const note=document.createElement('p');note.textContent='Start camera to configure.';section.append(note);cameraSettings.append(section);continue;}
  const capabilities=track.getCapabilities?.() as Record<string,unknown>|undefined;
  const settings=track.getSettings() as Record<string,unknown>;
  const modes=(key:string)=>Array.isArray(capabilities?.[key])?capabilities[key] as string[]:[];
  const addMode=(key:string,title:string,choices:string[])=>{
   const supported=modes(key).filter(v=>choices.includes(v));if(!supported.length)return;
   const row=document.createElement('label');row.className='camera-settings-row';
   const name=document.createElement('span');name.textContent=title;
   const select=document.createElement('select');
   for(const mode of supported){const option=document.createElement('option');option.value=mode;option.textContent=mode==='continuous'?'Auto':mode==='manual'?'Manual':mode;select.append(option);}
   select.value=typeof settings[key]==='string'?settings[key] as string:supported[0];
   select.addEventListener('change',async()=>{
    try{await track.applyConstraints({advanced:[{[key]:select.value}] as MediaTrackConstraintSet[]});}
    catch{select.value=String(track.getSettings()[key as keyof MediaTrackSettings]??supported[0]);}
   });
   row.append(name,select);section.append(row);
  };
  addMode('exposureMode','Exposure mode',['continuous','manual','single-shot']);
  addMode('focusMode','Focus mode',['continuous','manual','single-shot']);
  for(const key of ['exposureTime','gain','focusDistance']){
   const cap=capabilities?.[key] as {min:number;max:number;step?:number}|undefined;
   if(!cap||!Number.isFinite(cap.min)||!Number.isFinite(cap.max)||cap.max<=cap.min)continue;
   const row=document.createElement('label');row.className='camera-settings-row';
   const title=document.createElement('span');title.textContent=key==='exposureTime'?'Exposure':key==='focusDistance'?'Focus distance':'Gain';
   const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1000';slider.step='1';
   // Logarithmic exposure spreads the useful low end over the whole slider.
   const logarithmic=key==='exposureTime'&&cap.min>0;
   const toValue=(fraction:number)=>logarithmic?cap.min*Math.pow(cap.max/cap.min,fraction):cap.min+(cap.max-cap.min)*fraction;
   const toFraction=(value:number)=>logarithmic?Math.log(Math.max(cap.min,value)/cap.min)/Math.log(cap.max/cap.min):(value-cap.min)/(cap.max-cap.min);
   const quantize=(value:number)=>{const step=cap.step&&cap.step>0?cap.step:0;return Math.min(cap.max,Math.max(cap.min,step?cap.min+Math.round((value-cap.min)/step)*step:value));};
   const current=typeof settings[key]==='number'?settings[key] as number:cap.min;
   slider.value=String(Math.round(Math.max(0,Math.min(1,toFraction(current)))*1000));
   const output=document.createElement('output');output.textContent=String(quantize(current));
   const apply=async()=>{const value=quantize(toValue(Number(slider.value)/1000));output.textContent=String(Number(value.toPrecision(6)));try{await track.applyConstraints({advanced:[{[key]:value}] as MediaTrackConstraintSet[]});}catch{output.textContent='Unsupported';}};
   slider.addEventListener('input',()=>{output.textContent=String(Number(quantize(toValue(Number(slider.value)/1000)).toPrecision(6)));});
   slider.addEventListener('change',()=>{void apply();});
   row.append(title,slider,output);section.append(row);
  }
  if(section.children.length===1){const note=document.createElement('p');note.textContent='Manual exposure, gain and focus controls are unavailable for this camera/browser.';section.append(note);}
  cameraSettings.append(section);
 }
}

const CAMERA_STORAGE_PRIMARY='suturehero-camera-primary';
const CAMERA_STORAGE_SECONDARY='suturehero-camera-secondary';
function savedCamera(key:string){try{return localStorage.getItem(key)||'';}catch{return '';}}
function rememberCamera(key:string,value:string){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch{/* Storage may be disabled */}}
async function refreshSecondCameraList(){
 const current=select2.value||savedCamera(CAMERA_STORAGE_SECONDARY);
 const devices=await availableCameras();
 select2.innerHTML='<option value="">Choose second camera</option>';
 devices.forEach((device,i)=>{const option=document.createElement('option');option.value=device.deviceId;option.textContent=device.label||'Camera '+(i+1);select2.append(option);});
 select2.value=devices.some(d=>d.deviceId===current)?current:'';
}
async function stopSecondCamera(){detector2.dispose();
 session2++;ready2=false;stream2?.getTracks().forEach(track=>track.stop());stream2=null;
 video2.srcObject=null;secondaryObservations=[];secondaryObservationsAt=0;updateStereoMatches();overlayContext2.clearRect(0,0,overlay2.width,overlay2.height);
 start2.disabled=false;stop2.disabled=true;
 document.querySelector<HTMLElement>('#camera-placeholder-2')!.style.display='';
 status2.textContent='Second camera stopped';renderCameraSettings();
}
start2.addEventListener('click',async()=>{
 try{
  if(!select2.value){status2.textContent='Select the second USB camera first.';return;}
  if(select2.value===select.value){status2.textContent='Select a different camera from the primary camera.';return;}
  await stopSecondCamera();
  stream2=await openCamera(select2.value);video2.srcObject=stream2;await video2.play();
  document.querySelector<HTMLElement>('#camera-placeholder-2')!.style.display='none';
  start2.disabled=true;stop2.disabled=false;status2.textContent='Loading second marker detector…';
  const currentSession=session2;await detector2.initialize();
  if(currentSession!==session2)return;
  ready2=true;status2.textContent='Second camera detecting markers independently.';renderCameraSettings();
 }catch(error){status2.textContent='Second camera error: '+String(error);await stopSecondCamera();}
});
stop2.addEventListener('click',()=>{void stopSecondCamera();});
select2.addEventListener('change',()=>{rememberCamera(CAMERA_STORAGE_SECONDARY,select2.value);if(stream2)void stopSecondCamera();});
async function detectSecondFrame(now:number){
 if(!stream2||!ready2||processing2||!video2.videoWidth||now-lastDetection2<33)return;
 lastDetection2=now;processing2=true;const currentSession=session2;
 try{
  const scale2=Math.min(1,960/video2.videoWidth);const w=Math.round(video2.videoWidth*scale2),h=Math.round(video2.videoHeight*scale2);
  if(frame2.width!==w||frame2.height!==h){frame2.width=w;frame2.height=h;overlay2.width=w;overlay2.height=h;}
  context2.drawImage(video2,0,0,w,h);
  const found=await detector2.detect(context2.getImageData(0,0,w,h));
  if(currentSession!==session2)return;
  secondaryObservations=found;secondaryObservationsAt=performance.now();updateStereoMatches();
  overlayContext2.clearRect(0,0,w,h);
  for(const marker of found){
   const pts=marker.corners;overlayContext2.beginPath();overlayContext2.moveTo(pts[0].x,pts[0].y);
   for(let i=1;i<pts.length;i++)overlayContext2.lineTo(pts[i].x,pts[i].y);
   overlayContext2.closePath();overlayContext2.strokeStyle='#18e89d';overlayContext2.lineWidth=3;overlayContext2.stroke();
   overlayContext2.font='bold 20px sans-serif';overlayContext2.fillStyle='#18e89d';
   overlayContext2.fillText('ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));
  }
  status2.textContent='Second camera: '+w+' × '+h+' · '+found.length+' marker(s) detected'+(found.length?' · IDs '+found.map(m=>m.id).join(', '):'');
 }catch(error){status2.textContent='Second camera detection error: '+String(error);}
 finally{processing2=false;}
}
void refreshSecondCameraList().catch(()=>{status2.textContent='Connect both USB cameras and allow camera access.';});


interface CalibrationPair {time:string;first:{width:number;height:number;image:string};second:{width:number;height:number;image:string};frameDeltaMs:number|null}
const calibrationPairs:CalibrationPair[]=[];
const calibrationStatus=document.querySelector<HTMLElement>('#stereo-calibration-status')!;
const exportCalibration=document.querySelector<HTMLButtonElement>('#export-stereo-pairs')!;
function updateCalibrationStatus(message=''){
 calibrationStatus.textContent=calibrationPairs.length+' pairs captured (target 20–30). '+message+' Paired images only; camera calibration is not solved yet.';
 exportCalibration.disabled=calibrationPairs.length===0;
}
function captureCalibrationImage(source:HTMLVideoElement){
 const canvas=document.createElement('canvas');canvas.width=source.videoWidth;canvas.height=source.videoHeight;
 canvas.getContext('2d')!.drawImage(source,0,0,canvas.width,canvas.height);
 return {width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/jpeg',.82)};
}
document.querySelector<HTMLButtonElement>('#capture-stereo-pair')!.addEventListener('click',()=>{
 if(!stream||!stream2||video.readyState<2||video2.readyState<2){
  updateCalibrationStatus('Start both cameras before capturing.');return;
 }
 // Capture consecutively in one event handler, minimizing (but not eliminating) frame skew.
 const first=captureCalibrationImage(video),second=captureCalibrationImage(video2);
 calibrationPairs.push({time:new Date().toISOString(),first,second,frameDeltaMs:observationsAt&&secondaryObservationsAt?Math.round(Math.abs(observationsAt-secondaryObservationsAt)):null});
 updateCalibrationStatus('Captured pair '+calibrationPairs.length+'. Move and tilt the board for the next pair.');
});
document.querySelector<HTMLButtonElement>('#clear-stereo-pairs')!.addEventListener('click',()=>{
 if(calibrationPairs.length&&!window.confirm('Discard all calibration captures from this session?'))return;
 calibrationPairs.length=0;updateCalibrationStatus('Captures cleared.');
});
exportCalibration.addEventListener('click',()=>{
 if(!calibrationPairs.length)return;
 const payload={format:'suturehero-stereo-captures-v1',board:{squaresX:8,squaresY:8,innerCornersX:7,innerCornersY:7,squareSizeMm:37},camera1:select.value,camera2:select2.value,pairs:calibrationPairs};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='suturehero-stereo-calibration-'+new Date().toISOString().slice(0,10)+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 updateCalibrationStatus('Exported '+calibrationPairs.length+' pairs.');
});

const diag=(name:string)=>document.querySelector<HTMLElement>('#diag-'+name)!;
let framesAnalyzed=0,detectorFpsWindow=performance.now(),detectorFpsCount=0;
const frameCanvas=document.createElement('canvas');
const frameContext=frameCanvas.getContext('2d',{willReadFrequently:true})!;
const overlayContext=overlay.getContext('2d')!;
let observations:MarkerObservation[]=[];
const markerLastConfirmed=new Map<number,number>();
const MARKER_LIVE_MS=140,MARKER_RETAIN_MS=350;
const markerAge=(id:number,now=performance.now())=>now-(markerLastConfirmed.get(id)??-Infinity);
const liveMarkers=()=>observations.filter(m=>markerAge(m.id)<=MARKER_LIVE_MS);
function pruneMarkers(){observations=observations.filter(m=>markerAge(m.id)<=MARKER_RETAIN_MS);}

let observationsAt=0;
const trackingHoldMs=650;
const rotationStates=new Map<'needleDriver'|'forceps'|'scissors',{face:number;rawAnchor:THREE.Quaternion;outputAnchor:THREE.Quaternion;accumulatedRoll:number;faceRoll:number}>();
// Learned face-to-face transforms from simultaneous marker sightings.
// Do not assume printed face orientation from nominal prism dimensions alone.
const prismFaceOffsets=new Map<'needleDriver'|'forceps'|'scissors',Map<number,THREE.Quaternion>>();
const prismAxis=new THREE.Vector3(0,1,0);
function nominalV5FaceOffset(name:'needleDriver'|'forceps'|'scissors',id:number){
 const index=(MARKER_GROUPS[name] as readonly number[]).indexOf(id);
 return new THREE.Quaternion().setFromAxisAngle(prismAxis,-index*2*Math.PI/3);
}
const depthStates=new Map<'needleDriver'|'forceps'|'scissors',number>();
const DEPTH_STORAGE_KEY='suturehero.depthCalibration.v1';
let depthNearMm:number|null=null,depthFarMm:number|null=null;
function saveDepthCalibration(){
 try{localStorage.setItem(DEPTH_STORAGE_KEY,JSON.stringify({near:depthNearMm,far:depthFarMm,range:Number(workingDepthInput.value)||400}));}catch{/* unavailable */}
}
function restoreDepthCalibration(){
 try{
  const raw=localStorage.getItem(DEPTH_STORAGE_KEY);if(!raw)return;
  const value=JSON.parse(raw) as {near?:unknown;far?:unknown;range?:unknown};
  if(typeof value.range==='number'&&Number.isFinite(value.range)&&value.range>=50&&value.range<=1500)workingDepthInput.value=String(value.range);
  if(typeof value.near==='number'&&Number.isFinite(value.near)&&value.near>0)depthNearMm=value.near;
  if(typeof value.far==='number'&&Number.isFinite(value.far)&&depthNearMm!==null&&value.far>depthNearMm+20)depthFarMm=value.far;
 }catch{/* invalid saved calibration */}
}
restoreDepthCalibration();
const depthHistory=new Map<'needleDriver'|'forceps'|'scissors',number[]>();
const poseHistory=new Map<'needleDriver'|'forceps'|'scissors',THREE.Quaternion[]>();
type RotationGeometryState={face:number;reference:{x:number;y:number}[];last:{x:number;y:number}[];moving:boolean;pending:number;still:number};
const rotationGeometryStates=new Map<'needleDriver'|'forceps'|'scissors',RotationGeometryState>();
const depthSamples=new Map<'needleDriver'|'forceps'|'scissors',number>();
function depthRangeLabel(){const range=Math.max(50,Number(workingDepthInput.value)||400);depthRangeStatus.textContent=`Near: ${depthNearMm?.toFixed(0)??'unset'} mm · Far: ${depthFarMm?.toFixed(0)??'unset'} mm · working range: ${range} mm. ${depthNearMm===null?'Set Near first.':depthFarMm===null?'Set Far next.':'Calibrated.'}`;}
function resetDepthFilters(){depthStates.clear();stationaryStates.clear();depthHistory.clear();}
workingDepthInput.addEventListener('change',()=>{depthFarMm=null;resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#set-depth-near')!.addEventListener('click',()=>{const z=depthSamples.get('needleDriver')??depthSamples.get('forceps')??depthSamples.get('scissors');if(z===undefined){depthRangeStatus.textContent='No tracked prism visible. Start camera and show a marker.';return;}depthNearMm=z;depthFarMm=null;resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#set-depth-far')!.addEventListener('click',()=>{const z=depthSamples.get('needleDriver')??depthSamples.get('forceps')??depthSamples.get('scissors');if(z===undefined||depthNearMm===null){depthRangeStatus.textContent='Set Near first with a tracked marker visible.';return;}if(z<=depthNearMm+20){depthRangeStatus.textContent='Far must be at least 20 mm farther from camera than Near.';return;}depthFarMm=z;workingDepthInput.value=String(Math.round(z-depthNearMm));resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#reset-depth-range')!.addEventListener('click',()=>{depthNearMm=null;depthFarMm=null;workingDepthInput.value='400';resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
const rotationFilterStates=new Map<'needleDriver'|'forceps'|'scissors',{anchor:THREE.Quaternion;pending:number;moving:boolean}>();
const filterMeasurements=new Map<'needleDriver'|'forceps'|'scissors',{rawZ:number;filteredZ:number;angle:number;locked:boolean}>();
const stationaryStates=new Map<'needleDriver'|'forceps'|'scissors',{anchor:THREE.Vector3;moving:boolean;pending:number}>();
const liveTargets=new Map<'needleDriver'|'forceps'|'scissors',{position:THREE.Vector3;quaternion:THREE.Quaternion;lastSeen:number;id:number;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}>();
let detectorReady=false,processing=false,lastDetection=0,cameraSession=0;
let idleNoMarkers=true,skippedFrames=0,renderFrames=0,renderFps=0,lastFpsTime=performance.now();
const motionCanvas=document.createElement('canvas');motionCanvas.width=64;motionCanvas.height=36;
const motionCtx=motionCanvas.getContext('2d',{willReadFrequently:true})!;
let motionPrevious:Uint8Array|null=null;
function changedFrame(source:HTMLVideoElement){motionCtx.drawImage(source,0,0,64,36);const data=motionCtx.getImageData(0,0,64,36).data;const next=new Uint8Array(64*36);let changed=0;for(let i=0;i<next.length;i++){const p=i*4;next[i]=(data[p]*3+data[p+1]*6+data[p+2])/10;if(motionPrevious&&Math.abs(next[i]-motionPrevious[i])>24)changed++;}motionPrevious=next;return changed>32;}

let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value||savedCamera(CAMERA_STORAGE_PRIMARY);const devices=await availableCameras();select.innerHTML='<option value="">Default camera</option>';devices.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Camera ${i+1}`;select.append(o)});select.value=devices.some(d=>d.deviceId===current)?current:'';}catch{ /* permission or unsupported */ }
}
async function stopCamera(){cameraSession++;detector.dispose();fastTracker.dispose();fastProcessing=false;lastFastFrame=0;lastSlowFrame=0;latestFlowAt=0;latestDecodeAt=0;detectorReady=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;observations=[];observationsAt=0;liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationFilterStates.clear();depthStates.clear();overlayContext.clearRect(0,0,overlay.width,overlay.height);start.disabled=false;stop.disabled=true;document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='';status.textContent='Camera stopped.';renderCameraSettings();markerReadout.textContent='Camera stopped';diag('note').textContent='Camera stopped';}
start.addEventListener('click',async()=>{
 try {await stopCamera();detectorReady=false;stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='none';framesAnalyzed=0;detectorFpsWindow=performance.now();detectorFpsCount=0;diag('frames').textContent='0';diag('detection-fps').textContent='0';const settings=stream.getVideoTracks()[0]?.getSettings();diag('resolution').textContent=`${video.videoWidth} × ${video.videoHeight} camera · tracking ≤960px wide${settings?.frameRate?' · '+Math.round(settings.frameRate)+' fps':''}`;start.disabled=true;stop.disabled=false;status.textContent='Camera running. Loading marker detector…';const session=cameraSession;await Promise.all([detector.initialize(),fastTracker.initialize(true)]);if(session!==cameraSession)return;detectorReady=true;status.textContent='Live ArUco detection running. Hold a marker in view.';await refreshCameras();await refreshSecondCameraList();renderCameraSettings();status2.textContent='Camera 2 is optional for now.';}
 catch(e){status.textContent=`Camera error: ${e instanceof Error?e.message:String(e)}`;}
});
stop.addEventListener('click',stopCamera);
select.addEventListener('change',()=>{rememberCamera(CAMERA_STORAGE_PRIMARY,select.value);if(stream)void stopCamera();});
void refreshCameras();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x15242c);
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,3.7,6);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
const mount=document.querySelector<HTMLElement>('#tracking-scene')!;mount.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1.4;orbit.maxDistance=18;orbit.target.set(0,.5,0);orbit.update();
document.querySelector<HTMLButtonElement>('#reset-view')!.addEventListener('click',()=>{camera.position.set(0,3.7,6);orbit.target.set(0,.5,0);orbit.update();});
scene.add(new THREE.HemisphereLight(0xffffff,0x63788a,2));
const grid=new THREE.GridHelper(5,10,0x527d85,0x304852);scene.add(grid);
function instrument(id:'left'|'right',color:number){
 const model=new Instrument(id,color);
 if(id==='right')model.setDriverStyle('castro');
 const group=new THREE.Group();
 model.root.scale.setScalar(.72);
 model.root.rotation.y=-Math.PI/2;
 group.add(model.root);
 group.position.y=.25;
 scene.add(group);
 return group;
}
const driver=instrument('right',0xe3b47e),forceps=instrument('left',0x68d1bb);
// Scissors: two crossing blades and finger rings, sharing the same tracked rigid pose.
function scissorsModel(){
 const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0xc5d1d5,metalness:.85,roughness:.27});
 const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),steel);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());group.add(m);};
 for(const side of [-1,1]){rod(new THREE.Vector3(side*.11,0,1.4),new THREE.Vector3(side*.015,0,.7),.043);const blade=new THREE.Mesh(new THREE.BoxGeometry(.075,.035,.85),steel);blade.position.set(side*.055,0,.3);blade.rotation.y=side*.14;group.add(blade);const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,10,32),steel);ring.rotation.x=Math.PI/2;ring.position.set(side*.25,0,1.67);group.add(ring);}
 const pivot=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),steel);pivot.position.z=.72;group.add(pivot);group.scale.setScalar(.8);group.rotation.y=-Math.PI/2;
 const tracked=new THREE.Group();tracked.add(group);tracked.position.y=.25;scene.add(tracked);return tracked;
}
const scissors=scissorsModel();
driver.position.z=-.85;forceps.position.z=.15;scissors.position.z=1.05;
const keys=new Set<string>();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelector('#reset-sim')!.addEventListener('click',()=>{driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.65);});
/** Map webcam coordinates to the virtual scene. This is a visual mapping, not calibrated world-space tracking. */
function updateLiveTargets(){
 if(!overlay.width||!overlay.height)return;
 const now=observationsAt||performance.now();
 for(const name of ['needleDriver','forceps','scissors'] as const){
  const ids:readonly number[]=MARKER_GROUPS[name];
  const candidates=liveMarkers().filter(m=>ids.includes(m.id)).map(marker=>{
   const pose=estimateMarkerPose(marker,overlay.width,overlay.height);
   return pose?{marker,pose}:null;
  }).filter((item):item is {marker:MarkerObservation;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}=>item!==null);
  candidates.sort((a,b)=>a.pose.reprojectionError-b.pose.reprojectionError);
  const previous=liveTargets.get(name);
  // Prefer the same face when multiple faces are visible, preventing rapid ID toggling.
  const chosen=(previous&&candidates.find(c=>c.pose.id===previous.id&&c.pose.reprojectionError<4))||candidates[0];if(!chosen)continue;
  // Keep 2D translation active even with a poor 3D pose fit.
  const {pose}=chosen;
  // Nominal V5 triangular prism: consecutive marker IDs are 120 degrees apart.
  // Face transforms share one reference even when only one marker is visible.
  const offsets=prismFaceOffsets.get(name)??new Map<number,THREE.Quaternion>();
  prismFaceOffsets.set(name,offsets);
  for(const faceId of ids)if(!offsets.has(faceId))offsets.set(faceId,nominalV5FaceOffset(name,faceId));
  // Translation comes directly from the displayed marker quadrilateral, not PnP pose.
  // The size-derived distance is approximate until camera intrinsics are calibrated.
  const markerCenter={x:chosen.marker.corners.reduce((sum,p)=>sum+p.x,0)/4,y:chosen.marker.corners.reduce((sum,p)=>sum+p.y,0)/4};
  const sideLengths=chosen.marker.corners.map((p,i)=>Math.hypot(p.x-chosen.marker.corners[(i+1)%4].x,p.y-chosen.marker.corners[(i+1)%4].y));
  const markerSidePx=sideLengths.reduce((sum,n)=>sum+n,0)/4;
  if(markerSidePx<2)continue;
  const focalPx=overlay.width/(2*Math.tan(70*Math.PI/360/2));
  const sizeDistance=12*focalPx/markerSidePx;
  // First step toward rigid-body pose: estimate orientation and distance
  // together from the same four corners. A tilted face looks smaller even
  // when its actual depth is unchanged, so side length alone is misleading.
  // Only trust perspective-corrected depth when the planar fit is good.
  // Translation on screen still follows the observed marker center.
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(pose.quaternion);
  const faceTilt=Math.acos(THREE.MathUtils.clamp(Math.abs(normal.z),0,1));
  const poseDepthValid=Number.isFinite(pose.position.z)&&pose.position.z>20&&pose.reprojectionError<2.5;
  const correctedDistance=poseDepthValid?pose.position.z:sizeDistance;
  // Use the perspective solution progressively as tilt increases. When
  // nearly face-on, side-length depth is stable and less ambiguous.
  const tiltWeight=poseDepthValid?THREE.MathUtils.smoothstep(faceTilt,THREE.MathUtils.degToRad(8),THREE.MathUtils.degToRad(35)):0;
  const rawDistance=THREE.MathUtils.lerp(sizeDistance,correctedDistance,tiltWeight);
  // Camera-relative X/Y continue to follow the green-square center.
  // Depth is corrected for face orientation when the fit supports it.
  const samples=depthHistory.get(name)??[];
  samples.push(rawDistance);if(samples.length>5)samples.shift();depthHistory.set(name,samples);
  const sorted=[...samples].sort((a,b)=>a-b);
  const measuredDistance=sorted[Math.floor(sorted.length/2)];
  depthSamples.set(name,measuredDistance);
  const near=depthNearMm??100;
  const range=depthFarMm!==null&&depthNearMm!==null?depthFarMm-depthNearMm:Math.max(50,Number(workingDepthInput.value)||400);
  const depthFraction=THREE.MathUtils.clamp((measuredDistance-near)/range,0,1);
  const rawZ=-2.3+depthFraction*4.6;
  const previousZ=depthStates.get(name);
  const lockedDepth=trackingMode.value==='mono'&&lockDepth.checked;
  const baseline=name==='needleDriver'?-.65:name==='forceps'?.15:1.05;
  const desiredZ=THREE.MathUtils.clamp(rawZ*Number(depthSensitivity.value),-2.3,2.3);
  const depthDelta=previousZ===undefined?0:desiredZ-previousZ;
  const depthAlpha=Math.abs(depthDelta)>.12?.65:.25;
  const z=lockedDepth?baseline:previousZ===undefined?desiredZ:previousZ+depthDelta*depthAlpha;
  depthStates.set(name,z);
  // Perspective-correct camera-space X/Y, scaled against the same depth reference.
  const x=THREE.MathUtils.clamp(-((markerCenter.x-overlay.width/2)*measuredDistance/focalPx)/Math.max(near+range*.5,1)*7,-2.6,2.6);
  const y=THREE.MathUtils.clamp(-((markerCenter.y-overlay.height/2)*measuredDistance/focalPx)/Math.max(near+range*.5,1)*4+.55,.15,2.8);
  // The viewer's horizontal and forward axes are rotated relative to the webcam.
  // Physical camera depth now drives scene forward/back; camera X drives screen-horizontal motion.
  const position=new THREE.Vector3(-z,y,x);
  // Rotation is provisional: one marker face is not yet registered to the prism/instrument.
  const switched=!!previous&&previous.id!==pose.id;
  // Until the face-to-prism transforms are calibrated, changing faces must not rotate the instrument by 120 degrees.
  // Relative orientation avoids imposing an arbitrary marker-face orientation on the instrument.
  // On face changes, rebase the new face to the last displayed orientation.
  let rotation=rotationStates.get(name);
  let corrected=pose.quaternion.clone().multiply(offsets.get(pose.id)??new THREE.Quaternion()).normalize();
  // Fuse visible faces only when their relative transforms have been learned.
  const validFaces=candidates.filter(c=>c.pose.reprojectionError<3&&offsets.has(c.pose.id));
  if(validFaces.length>1){
   const reference=corrected.clone();
   const compatible=validFaces.map(c=>c.pose.quaternion.clone().multiply(offsets.get(c.pose.id)!).normalize())
    .filter(q=>q.angleTo(reference)<THREE.MathUtils.degToRad(18));
   // Never replace the primary face with an incompatible planar-pose solution.
   // Fuse only faces that agree with the selected primary orientation.
   if(compatible.length>1){
    const mean=compatible[0].clone();
    for(let i=1;i<compatible.length;i++)mean.slerp(compatible[i],1/(i+1));
    corrected=mean.normalize();
   }
  }
  const history=poseHistory.get(name)??[];history.push(corrected.clone());if(history.length>4)history.shift();poseHistory.set(name,history);
  if(history.length>=4){const reference=history[history.length-2];const consistent=history.filter(q=>q.angleTo(reference)<THREE.MathUtils.degToRad(15));if(consistent.length>=3){const mean=consistent[0].clone();for(let i=1;i<consistent.length;i++)mean.slerp(consistent[i],1/(i+1));if(corrected.angleTo(mean)>THREE.MathUtils.degToRad(35))corrected=mean;}}
  if(!rotation){
   rotation={face:pose.id,rawAnchor:corrected.clone(),outputAnchor:previous?.quaternion.clone()??new THREE.Quaternion(),accumulatedRoll:0,faceRoll:0};
   rotationStates.set(name,rotation);
  }else if(rotation.face!==pose.id){
   // The V5 markers are consecutive faces of a triangular prism.
   // Changing faces represents an actual 120-degree axial roll, NOT a
   // new instrument orientation to be silently zeroed out.
   const ids=MARKER_GROUPS[name] as readonly number[];
   const from=ids.indexOf(rotation.face);
   const to=ids.indexOf(pose.id);
   const distance=(to-from+3)%3;
   const steps=distance===1?1:distance===2?-1:0;
   rotation.accumulatedRoll+=rotation.faceRoll+steps*2*Math.PI/3;
   rotation.faceRoll=0;
   rotation.face=pose.id;
   rotation.rawAnchor.copy(corrected);
   rotationGeometryStates.delete(name);
   rotationFilterStates.delete(name);
   poseHistory.set(name,[corrected.clone()]);
   rotationStates.set(name,rotation);
  }
  // Use observed corner geometry to distinguish real movement from a
  // homography orientation flip while the printed marker is stationary.
  // Compare against a fixed reference: per-frame-only tests miss slow turns.
  const centerX=chosen.marker.corners.reduce((sum,p)=>sum+p.x,0)/4;
  const centerY=chosen.marker.corners.reduce((sum,p)=>sum+p.y,0)/4;
  // Remove translation: only changes in the square's SHAPE should unlock rotation.
  const corners=chosen.marker.corners.map(p=>({x:p.x-centerX,y:p.y-centerY}));
  let geometry=rotationGeometryStates.get(name);
  if(!geometry||geometry.face!==pose.id){
   geometry={face:pose.id,reference:corners,last:corners,moving:switched,pending:0,still:0};
   rotationGeometryStates.set(name,geometry);
  }
  const cornerShift=(a:{x:number;y:number}[],b:{x:number;y:number}[])=>
   a.reduce((sum,p,i)=>sum+Math.hypot(p.x-b[i].x,p.y-b[i].y),0)/4;
  const shift=cornerShift(corners,geometry.reference);
  const frameShift=cornerShift(corners,geometry.last);
  const markerWidth=corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-corners[(i+1)%4].x,p.y-corners[(i+1)%4].y),0)/4;
  const startThreshold=Math.max(1.5,markerWidth*.025);
  const stopThreshold=Math.max(.8,markerWidth*.015);
  if(!geometry.moving){
   geometry.pending=shift>startThreshold?geometry.pending+1:0;
   if(geometry.pending>=2){geometry.moving=true;geometry.pending=0;}
  }else{
   geometry.still=frameShift<stopThreshold?geometry.still+1:0;
   if(geometry.still>=3){geometry.moving=false;geometry.still=0;geometry.reference=corners;}
  }
  geometry.last=corners;
  const axis=new THREE.Vector3(-1,0,0);
  const localDelta=rotation.rawAnchor.clone().invert().multiply(corrected).normalize();
  const projection=localDelta.y;
  const twist=new THREE.Quaternion(0,projection,0,localDelta.w).normalize();
  let roll=2*Math.atan2(projection,localDelta.w);
  while(roll-rotation.faceRoll>Math.PI)roll-=2*Math.PI;
  while(roll-rotation.faceRoll< -Math.PI)roll+=2*Math.PI;
  rotation.faceRoll=roll;
  const swing=localDelta.clone().multiply(twist.clone().invert()).normalize();
  const scaledSwing=new THREE.Quaternion().slerp(swing,Number(rotationGain.value));
  const rollQuaternion=new THREE.Quaternion().setFromAxisAngle(axis,rotation.accumulatedRoll+roll);
  const desired=rotation.outputAnchor.clone().multiply(scaledSwing).multiply(rollQuaternion).normalize();
  // Hold the OUTPUT quaternion exactly, rather than attempting to
  // reconstruct it through a non-commutative quaternion multiplication.
  // That previous reconstruction could itself generate stationary jitter.
  if(!geometry.moving&&previous)desired.copy(previous.quaternion);
  const quaternion=previous?.quaternion.clone()??desired.clone();
  if(previous&&now-previous.lastSeen<600){
   const elapsed=Math.max(.016,(now-previous.lastSeen)/1000);
   // No stationary lock or gross-pose rejection on translation: when the
   // green quadrilateral moves, the rendered instrument must follow it.
   // Smooth lightly to suppress subpixel jitter without freezing motion.

   // Translation uses the latest measured marker position.
   // Rotation is independent of translation: allow deliberate rolling, pitching,
   // and yawing even when the instrument remains at a fixed position.
   // Cap angular velocity instead of discarding changes above 25 degrees:
   // rejecting those frames previously made large rotations appear frozen.
   const threshold=THREE.MathUtils.degToRad(Number(rotationSensitivity.value));
   let filter=rotationFilterStates.get(name);
   if(!filter){filter={anchor:previous.quaternion.clone(),pending:0,moving:false};rotationFilterStates.set(name,filter);}
   const displacement=filter.anchor.angleTo(desired);
   const instantaneous=previous.quaternion.angleTo(desired);
   // Require sustained angular displacement to unlock; reject isolated large pose spikes.
   {
    if(!filter.moving){
     filter.pending=displacement>threshold?filter.pending+1:0;
     if(filter.pending>=1){filter.moving=true;filter.pending=0;}
    }
    if(filter.moving){
     const maxStep=THREE.MathUtils.degToRad(540)*elapsed;
     const smooth=1-Math.exp(-elapsed*(displacement>threshold*3?24:14));
     quaternion.slerp(desired,Math.min(smooth,maxStep/Math.max(instantaneous,1e-6)));
     filter.anchor.copy(quaternion);
     if(instantaneous<threshold*.4){filter.pending++;if(filter.pending>=3){filter.moving=false;filter.pending=0;}}
     else filter.pending=0;
    }
   }
   filterMeasurements.set(name,{rawZ:measuredDistance,filteredZ:z,angle:THREE.MathUtils.radToDeg(instantaneous),locked:!filter.moving});
  }
  if(!previous)filterMeasurements.set(name,{rawZ:measuredDistance,filteredZ:z,angle:0,locked:false});
  liveTargets.set(name,{position,quaternion,lastSeen:now,id:pose.id,pose});
 }
}
function drawDetections(){
 const w=overlay.width,h=overlay.height;overlayContext.clearRect(0,0,w,h);
 pruneMarkers();
 const fresh=liveMarkers();
 for(const marker of observations){const pts=marker.corners;overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();const group=(Object.keys(MARKER_GROUPS) as Array<keyof typeof MARKER_GROUPS>).find(name=>(MARKER_GROUPS[name] as readonly number[]).includes(marker.id));const overlap=group&&fresh.filter(m=>(MARKER_GROUPS[group] as readonly number[]).includes(m.id)).length>1;const stale=markerAge(marker.id)>MARKER_LIVE_MS;overlayContext.strokeStyle=stale?'#8b929c':overlap?'#ffc14d':'#18e89d';overlayContext.lineWidth=3;overlayContext.stroke();overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.font='bold 20px sans-serif';overlayContext.fillText((stale?'HELD ':overlap?'OVERLAP ':'')+'ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));}
 updateLiveTargets();
 markerReadout.textContent=observations.length?observations.map(m=>m.id).sort((a,b)=>a-b).join(', '):'None visible';
 if(!simulation.checked){
  const readout=(name:'needleDriver'|'forceps'|'scissors')=>{
   const target=liveTargets.get(name);if(!target)return 'Not visible';
   const age=performance.now()-target.lastSeen;if(age>trackingHoldMs)return 'Not visible';
   const p=target.pose,v=p.position,e=new THREE.Euler().setFromQuaternion(p.quaternion,'XYZ');
   const deg=(r:number)=>(r*180/Math.PI).toFixed(0);
   return `${age>130?'Last seen · ':''}ID ${p.id} · X ${v.x.toFixed(1)}, Y ${v.y.toFixed(1)}, Z ${v.z.toFixed(1)} mm · RPY ${deg(e.x)}°/${deg(e.y)}°/${deg(e.z)}° · error ${p.reprojectionError.toFixed(1)} px (uncalibrated)`;
  };
  driverReadout.textContent=readout('needleDriver');forcepsReadout.textContent=readout('forceps');scissorsReadout.textContent=readout('scissors');
  filterDiagnostics.textContent=(['needleDriver','forceps','scissors'] as const).map(name=>{const m=filterMeasurements.get(name);return m?`${name}: distance ${m.rawZ.toFixed(0)} mm · virtual Z ${m.filteredZ.toFixed(2)} · Δ rotation ${m.angle.toFixed(1)}° · ${m.locked?'stationary lock':'tracking'}`:`${name}: waiting`;}).join(' | ');
  faceOverlapReadout.textContent=(Object.keys(MARKER_GROUPS) as Array<keyof typeof MARKER_GROUPS>).map(name=>{const visible=fresh.filter(m=>(MARKER_GROUPS[name] as readonly number[]).includes(m.id)).map(m=>m.id);const learned=prismFaceOffsets.get(name)?.size??0;return `${name}: ${visible.length>1?'OVERLAP '+visible.join('+'):visible.length?'face '+visible[0]:'none'} · ${learned}/3 learned`;}).join(' | ');
 }
}
const decodeCanvas=document.createElement('canvas');
const decodeContext=decodeCanvas.getContext('2d',{willReadFrequently:true})!;
async function detectFrame(now:number){
 if(!stream||!detectorReady||!video.videoWidth)return;
 const doFast=!fastProcessing&&now-lastFastFrame>=33;
 const doSlow=!processing&&now-lastSlowFrame>=160;
 if(!doFast&&!doSlow)return;
 const session=cameraSession;
 const scale=Math.min(1,960/video.videoWidth),w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);
 const nativeW=video.videoWidth,nativeH=video.videoHeight;
 const decodeScaleX=nativeW/w,decodeScaleY=nativeH/h;
 const toNative=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x*decodeScaleX,y:p.y*decodeScaleY}))}));
 const toFlow=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x/decodeScaleX,y:p.y/decodeScaleY}))}));
 if(frameCanvas.width!==w||frameCanvas.height!==h){frameCanvas.width=w;frameCanvas.height=h;overlay.width=w;overlay.height=h;}
 frameContext.drawImage(video,0,0,w,h);
 if(doFast){
  fastProcessing=true;lastFastFrame=now;
  const frame=frameContext.getImageData(0,0,w,h);
  void fastTracker.detect(frame).then(found=>{
   if(session!==cameraSession)return;
   fastFrames++;
   const stamp=performance.now();
   // A fresh optical-flow result supersedes the last decoder snapshot.
   // When flow fails, keep a recently decoded marker briefly, but never indefinitely.
   if(found.length){observations=found;observationsAt=stamp;latestFlowAt=stamp;idleNoMarkers=false;detector.seed(toNative(found));drawDetections();}
   else if(stamp-Math.max(latestFlowAt,latestDecodeAt)>350){observations=[];observationsAt=stamp;idleNoMarkers=true;drawDetections();}
   if(stamp-fastWindow>=1000){
    diag('detection-fps').textContent=(fastFrames*1000/(stamp-fastWindow)).toFixed(1)+' flow / '+(slowFrames*1000/(stamp-fastWindow)).toFixed(1)+' decode';
    fastFrames=0;slowFrames=0;fastWindow=stamp;
   }
  }).catch(e=>{if(session===cameraSession)diag('note').textContent='Flow error: '+String(e);}).finally(()=>{fastProcessing=false;});
 }
 if(doSlow){
  processing=true;lastSlowFrame=now;
  // Preserve native pixels for 12 mm marker decoding; flow stays at 960px.
  if(decodeCanvas.width!==nativeW||decodeCanvas.height!==nativeH){decodeCanvas.width=nativeW;decodeCanvas.height=nativeH;}
  decodeContext.drawImage(video,0,0,nativeW,nativeH);
  const frame=decodeContext.getImageData(0,0,nativeW,nativeH);
  if(thresholdToggle.checked)renderThreshold(frame);
  if(cropToggle.checked)renderCrop(frame);
  void detector.detect(frame).then(nativeFound=>{
   const found=toFlow(nativeFound);
   if(session!==cameraSession)return;
   slowFrames++;framesAnalyzed++;
   diag('frames').textContent=String(framesAnalyzed);
   diag('candidates').textContent=detector.diagnostics.candidateCount===null?'Unavailable':String(detector.diagnostics.candidateCount);
   diag('outlines').textContent=String(detector.candidateCorners.length);
   diag('decoded').textContent=`${found.length} matched · ${detector.diagnostics.rawMarkerCount} total`;
   diag('time').textContent=detector.diagnostics.durationMs.toFixed(0)+' ms';
   diag('pass').textContent=detector.diagnostics.pass;
   diag('contrast').textContent=detector.diagnostics.contrast;
   diag('note').textContent=detector.diagnostics.note+' · '+fastTracker.diagnostics.note;
   if(found.length){
    fastTracker.seed(found);
    latestDecodeAt=performance.now();
    // Flow may already have advanced beyond this decode. Use the decode
    // only for missing IDs, avoiding backward jumps from delayed responses.
    const merged=[...observations];
    for(const marker of found)if(!merged.some(m=>m.id===marker.id))merged.push(marker);
    observations=merged;observationsAt=performance.now();idleNoMarkers=false;drawDetections();
   }
  }).catch(e=>{if(session===cameraSession){status.textContent='Detection error: '+String(e);diag('note').textContent='Decoder error';}}).finally(()=>{processing=false;});
 }
}

const resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});resize.observe(mount);
let last=performance.now();
function animate(now:number){const dt=Math.min((now-last)/1000,.05);last=now;
 if(!simulation.checked){
  for(const [name,mesh] of [['needleDriver',driver],['forceps',forceps],['scissors',scissors]] as const){
   const target=liveTargets.get(name);
   if(target&&now-target.lastSeen<trackingHoldMs){
    mesh.position.copy(target.position);
    // Rotation was already stabilized in updateLiveTargets; avoid another
    // rendering-stage interpolation that adds latency.
    mesh.quaternion.copy(target.quaternion);
   }
  }
 }
 if(simulation.checked){const speed=(keys.has('shift')?2:1)*dt;
  driver.position.x+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*speed;driver.position.z+=(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*speed;
  scissors.position.x+=(Number(keys.has('l'))-Number(keys.has('j')))*speed;scissors.position.z+=(Number(keys.has('k'))-Number(keys.has('i')))*speed;
  forceps.position.x+=(Number(keys.has('d'))-Number(keys.has('a')))*speed;forceps.position.z+=(Number(keys.has('s'))-Number(keys.has('w')))*speed;
 }
 driver.position.x=THREE.MathUtils.clamp(driver.position.x,-2,2);driver.position.z=THREE.MathUtils.clamp(driver.position.z,-2,2);
 forceps.position.x=THREE.MathUtils.clamp(forceps.position.x,-2,2);forceps.position.z=THREE.MathUtils.clamp(forceps.position.z,-2,2);
 scissors.position.x=THREE.MathUtils.clamp(scissors.position.x,-2,2);scissors.position.z=THREE.MathUtils.clamp(scissors.position.z,-2,2);
 if(simulation.checked)driverReadout.textContent=`Simulated · (${driver.position.x.toFixed(2)}, ${driver.position.z.toFixed(2)})`;
 if(simulation.checked)scissorsReadout.textContent=`Simulated · (${scissors.position.x.toFixed(2)}, ${scissors.position.z.toFixed(2)})`;
 if(simulation.checked)forcepsReadout.textContent=`Simulated · (${forceps.position.x.toFixed(2)}, ${forceps.position.z.toFixed(2)})`;
 renderFrames++;if(now-lastFpsTime>=1000){renderFps=Math.round(renderFrames*1000/(now-lastFpsTime));renderFrames=0;lastFpsTime=now;diag('note').title='Virtual FPS '+renderFps+' · detector frames skipped '+skippedFrames+' · mode '+(idleNoMarkers?'idle':'tracking');}
 void detectFrame(now);
 void detectSecondFrame(now);
 orbit.update();renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{detector.dispose();detector2.dispose();void stopCamera();void stopSecondCamera();resize.disconnect();orbit.dispose();renderer.dispose();});
