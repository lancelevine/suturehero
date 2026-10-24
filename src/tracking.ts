import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {availableCameras,MARKER_GROUPS,openCamera,type MarkerObservation} from './input/arucoTracking';
import {BrowserArucoDetector} from './input/arucoDetector';
import {estimateMarkerPose} from './input/markerPose';
import {Instrument} from './instruments/Instrument';
import './style.css';
import './tracking.css';

declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">INSTRUMENT TRACKING LAB · BUILD ${__SUTUREHERO_BUILD__} (${__SUTUREHERO_REVISION__})</span><a href="./">← Return to practice</a></header>
<main class="tracking-layout"><section class="tracking-panel"><div class="eyebrow">01 / CAMERA</div><h1>Instrument tracking</h1><p class="intro">Start your webcam to detect ArUco markers IDs 0–8. Outlines and IDs appear on the video.</p>
<div class="tracking-actions"><label for="tracking-mode">Tracking mode</label><select id="tracking-mode"><option value="mono">1 camera · 3D tracking</option><option value="stereo">2 cameras · experimental</option></select><label><input id="lock-depth" type="checkbox"> Lock depth</label></div><p class="tracking-message" id="tracking-mode-info">1 camera: filtered approximate depth, with optional depth lock. Rotation is approximate. Two-camera stereo tracking is not calibrated yet.</p>
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
<div class="tracking-stats" aria-label="Live camera diagnostics">
<div><strong>Camera resolution</strong><span id="diag-resolution">Not started</span></div>
<div><strong>Frames analyzed</strong><span id="diag-frames">0</span></div>
<div><strong>Candidate squares</strong><span id="diag-candidates">—</span></div><div><strong>Outlines drawn</strong><span id="diag-outlines">—</span></div>
<div><strong>Decoded markers</strong><span id="diag-decoded">—</span></div>
<div><strong>Detection time</strong><span id="diag-time">—</span></div><div><strong>Detection pass</strong><span id="diag-pass">—</span></div><div><strong>Image contrast</strong><span id="diag-contrast">—</span></div>
<div><strong>Detection status</strong><span id="diag-note">Waiting for camera</span></div>
</div>
</div></details><details class="tracking-details"><summary>Camera Settings · Exposure &amp; Gain</summary><div class="tracking-details-body"><p class="tracking-message">Exposure and gain depend on browser and camera support.</p><div id="camera-settings-controls"></div></div></details><div class="tracking-actions"><label><input id="simulation" type="checkbox"> Simulated input</label><button id="reset-sim">Reset positions</button></div>
<p class="tracking-message">Live mode: move the printed markers to move the virtual instruments. Simulation mode: needle driver arrow keys, forceps W/A/S/D (Shift = faster).</p>
</section><section class="tracking-panel"><div class="eyebrow">02 / VIRTUAL VIEW</div><h2>Instrument diagnostics</h2><div id="tracking-scene"></div><div class="tracking-actions"><button id="reset-view">Reset view</button><span class="tracking-message">Drag to rotate · Right-drag to pan · Scroll to zoom</span></div><div class="tracking-stats"><div><strong>Needle driver</strong><span id="driver-readout">Simulated · (0, 0)</span></div><div><strong>Forceps</strong><span id="forceps-readout">Simulated · (0, 0)</span></div><div><strong>Detected markers</strong><span id="marker-readout">Waiting for camera</span></div></div><p class="tracking-message">ArUco dictionary: DICT_4X4_50 · Driver IDs 6–8 (temporary) · Forceps IDs 3–5. Experimental relative 3D rotation tracking enabled. Coordinates are camera-relative; depth and angles are approximate until webcam calibration. Instrument rotation is relative to its first detected pose; switching faces rebases orientation without a sudden jump. Absolute prism rotation still requires geometric calibration.</p></section></main>`;
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
lockDepth.addEventListener('change',()=>{liveTargets.clear();stationaryStates.clear();depthStates.clear();});
trackingMode.addEventListener('change',()=>{
 liveTargets.clear();stationaryStates.clear();rotationStates.clear();depthStates.clear();
 trackingModeInfo.textContent=trackingMode.value==='mono'
  ?'1 camera: filtered approximate depth, with optional depth lock. Camera 1 drives movement and rotation.'
  :'2 cameras: both feeds detect markers, but stereo fusion and metric depth require calibration. Camera 1 still drives the instruments.';
});
simulation.addEventListener('change',()=>{liveTargets.clear();stationaryStates.clear();rotationStates.clear();depthStates.clear();driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.65);driver.quaternion.identity();forceps.quaternion.identity();});
const markerReadout=document.querySelector<HTMLElement>('#marker-readout')!;
const driverReadout=document.querySelector<HTMLElement>('#driver-readout')!;
const forcepsReadout=document.querySelector<HTMLElement>('#forceps-readout')!;
const detector=new BrowserArucoDetector();
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
const detector2=new BrowserArucoDetector();
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
  for(const key of ['exposureTime','gain']){
   const cap=capabilities?.[key] as {min:number;max:number;step?:number}|undefined;
   if(!cap||typeof cap.min!=='number'||typeof cap.max!=='number')continue;
   const row=document.createElement('label');row.className='camera-settings-row';
   const title=document.createElement('span');title.textContent=key==='exposureTime'?'Exposure':'Gain';
   const slider=document.createElement('input');slider.type='range';slider.min=String(cap.min);slider.max=String(cap.max);slider.step=String(cap.step||'any');slider.value=String(typeof settings[key]==='number'?settings[key]:cap.min);
   const output=document.createElement('output');output.textContent=slider.value;
   slider.addEventListener('input',()=>{output.textContent=slider.value;});
   slider.addEventListener('change',async()=>{try{await track.applyConstraints({advanced:[{[key]:Number(slider.value)}] as MediaTrackConstraintSet[]});}catch{output.textContent='Unsupported';}});
   row.append(title,slider,output);section.append(row);
  }
  if(section.children.length===1){const note=document.createElement('p');note.textContent='Exposure/gain unavailable in this browser.';section.append(note);}
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
async function stopSecondCamera(){
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
 if(!stream2||!ready2||processing2||!video2.videoWidth||now-lastDetection2<110)return;
 lastDetection2=now;processing2=true;const currentSession=session2;
 try{
  const w=video2.videoWidth,h=video2.videoHeight;
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
let framesAnalyzed=0;
const frameCanvas=document.createElement('canvas');
const frameContext=frameCanvas.getContext('2d',{willReadFrequently:true})!;
const overlayContext=overlay.getContext('2d')!;
let observations:MarkerObservation[]=[];
let observationsAt=0;
const trackingHoldMs=650;
const rotationStates=new Map<'needleDriver'|'forceps',{face:number;rawAnchor:THREE.Quaternion;outputAnchor:THREE.Quaternion}>();
const depthStates=new Map<'needleDriver'|'forceps',number>();
const stationaryStates=new Map<'needleDriver'|'forceps',{anchor:THREE.Vector3;moving:boolean;pending:number}>();
const liveTargets=new Map<'needleDriver'|'forceps',{position:THREE.Vector3;quaternion:THREE.Quaternion;lastSeen:number;id:number;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}>();
let detectorReady=false,processing=false,lastDetection=0,cameraSession=0;
let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value||savedCamera(CAMERA_STORAGE_PRIMARY);const devices=await availableCameras();select.innerHTML='<option value="">Default camera</option>';devices.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Camera ${i+1}`;select.append(o)});select.value=devices.some(d=>d.deviceId===current)?current:'';}catch{ /* permission or unsupported */ }
}
async function stopCamera(){cameraSession++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;observations=[];observationsAt=0;liveTargets.clear();stationaryStates.clear();rotationStates.clear();depthStates.clear();overlayContext.clearRect(0,0,overlay.width,overlay.height);start.disabled=false;stop.disabled=true;document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='';status.textContent='Camera stopped.';renderCameraSettings();markerReadout.textContent='Camera stopped';diag('note').textContent='Camera stopped';}
start.addEventListener('click',async()=>{
 try {await stopCamera();detectorReady=false;stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='none';framesAnalyzed=0;diag('frames').textContent='0';const settings=stream.getVideoTracks()[0]?.getSettings();diag('resolution').textContent=`${video.videoWidth} × ${video.videoHeight} (requested 1920 × 1080)${settings?.frameRate?' · '+Math.round(settings.frameRate)+' fps':''}`;start.disabled=true;stop.disabled=false;status.textContent='Camera running. Loading marker detector…';const session=cameraSession;await detector.initialize();if(session!==cameraSession)return;detectorReady=true;status.textContent='Live ArUco detection running. Hold a marker in view.';await refreshCameras();await refreshSecondCameraList();renderCameraSettings();status2.textContent='Camera 2 is optional for now.';}
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
driver.position.z=-.65;forceps.position.z=.65;
const keys=new Set<string>();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelector('#reset-sim')!.addEventListener('click',()=>{driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.65);});
/** Map webcam coordinates to the virtual scene. This is a visual mapping, not calibrated world-space tracking. */
function updateLiveTargets(){
 if(!overlay.width||!overlay.height)return;
 const now=observationsAt||performance.now();
 for(const name of ['needleDriver','forceps'] as const){
  const ids:readonly number[]=MARKER_GROUPS[name];
  const candidates=observations.filter(m=>ids.includes(m.id)).map(marker=>{
   const pose=estimateMarkerPose(marker,overlay.width,overlay.height);
   return pose?{marker,pose}:null;
  }).filter((item):item is {marker:MarkerObservation;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}=>item!==null);
  candidates.sort((a,b)=>a.pose.reprojectionError-b.pose.reprojectionError);
  const previous=liveTargets.get(name);
  // Prefer the same face when multiple faces are visible, preventing rapid ID toggling.
  const chosen=(previous&&candidates.find(c=>c.pose.id===previous.id&&c.pose.reprojectionError<4))||candidates[0];if(!chosen)continue;
  const {marker,pose}=chosen;
  const cx=marker.corners.reduce((v,p)=>v+p.x,0)/4,cy=marker.corners.reduce((v,p)=>v+p.y,0)/4;
  // Screen coordinates control horizontal/vertical movement; marker size estimates depth.
  const x=THREE.MathUtils.clamp((cx/overlay.width-.5)*7,-2.6,2.6);
  const y=THREE.MathUtils.clamp((.5-cy/overlay.height)*4+0.55,.15,2.8);
  // Single-marker depth is very noisy without calibrated intrinsics. Use a strong
  // low-pass filter and reject isolated jumps rather than mapping raw Z directly.
  const rawZ=THREE.MathUtils.clamp((pose.position.z-180)/180,-1.8,1.8);
  const previousZ=depthStates.get(name);
  const z=trackingMode.value==='mono'&&lockDepth.checked?(name==='needleDriver'?-.65:.65):(previousZ===undefined?rawZ:previousZ+THREE.MathUtils.clamp(rawZ-previousZ,-.08,.08)*.12);
  depthStates.set(name,z);
  const position=new THREE.Vector3(x,y,z);
  // Rotation is provisional: one marker face is not yet registered to the prism/instrument.
  const switched=!!previous&&previous.id!==pose.id;
  // Until the face-to-prism transforms are calibrated, changing faces must not rotate the instrument by 120 degrees.
  // Relative orientation avoids imposing an arbitrary marker-face orientation on the instrument.
  // On face changes, rebase the new face to the last displayed orientation.
  let rotation=rotationStates.get(name);
  if(!rotation||rotation.face!==pose.id){
   rotation={face:pose.id,rawAnchor:pose.quaternion.clone(),outputAnchor:previous?.quaternion.clone()??new THREE.Quaternion()};
   rotationStates.set(name,rotation);
  }
  const delta=pose.quaternion.clone().multiply(rotation.rawAnchor.clone().invert());
  const desired=delta.multiply(rotation.outputAnchor).normalize();
  const quaternion=previous?.quaternion.clone()??desired.clone();
  if(previous&&now-previous.lastSeen<600){
   const elapsed=Math.max(.016,(now-previous.lastSeen)/1000);
   const distance=previous.position.distanceTo(position);
   // Reject isolated gross pose spikes, but allow the next observation to recover naturally.
   if(distance>1.1&&elapsed<.22)continue;
   // A hysteretic stationary lock prevents sensor noise from becoming visible motion.
   // Compare against a fixed anchor, not the previous noisy frame, to avoid drift.
   let state=stationaryStates.get(name);
   if(!state){state={anchor:previous.position.clone(),moving:false,pending:0};stationaryStates.set(name,state);}
   const fromAnchor=state.anchor.distanceTo(position);
   const enterMovement=.14,stopMovement=.045;
   if(!state.moving){
    if(fromAnchor>enterMovement){state.pending++;}
    else state.pending=0;
    // Large intentional motions unlock immediately; smaller motions need two frames.
    if(fromAnchor>.30||state.pending>=3){state.moving=true;state.pending=0;}
   }else{
    // Relock only after the instrument has settled near its filtered position.
    if(distance<stopMovement){state.pending++;}
    else state.pending=0;
    if(state.pending>=3){state.moving=false;state.pending=0;state.anchor=previous.position.clone();}
   }
   if(!state.moving){
    position.copy(state.anchor);
   }else{
    // Follow real movement promptly without adding another slow filter stage.
    const blend=1-Math.exp(-elapsed*26);
    position.lerpVectors(previous.position,position,blend);
    state.anchor.copy(position);
   }
   // Rotation uses its own deadband and filtering, independent of translation lock.
   const angle=previous.quaternion.angleTo(desired);
   if(!switched&&angle>THREE.MathUtils.degToRad(3)&&angle<THREE.MathUtils.degToRad(25)){
    quaternion.slerp(desired,1-Math.exp(-elapsed*7));
   }
  }
  liveTargets.set(name,{position,quaternion,lastSeen:now,id:pose.id,pose});
 }
}
function drawDetections(){
 const w=overlay.width,h=overlay.height;overlayContext.clearRect(0,0,w,h);
 for(const marker of observations){const pts=marker.corners;overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();overlayContext.strokeStyle='#18e89d';overlayContext.lineWidth=3;overlayContext.stroke();overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.font='bold 20px sans-serif';overlayContext.fillText('ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));}
 updateLiveTargets();
 markerReadout.textContent=observations.length?observations.map(m=>m.id).sort((a,b)=>a-b).join(', '):'None visible';
 if(!simulation.checked){
  const readout=(name:'needleDriver'|'forceps')=>{
   const target=liveTargets.get(name);if(!target)return 'Not visible';
   const age=performance.now()-target.lastSeen;if(age>trackingHoldMs)return 'Not visible';
   const p=target.pose,v=p.position,e=new THREE.Euler().setFromQuaternion(p.quaternion,'XYZ');
   const deg=(r:number)=>(r*180/Math.PI).toFixed(0);
   return `${age>130?'Last seen · ':''}ID ${p.id} · X ${v.x.toFixed(1)}, Y ${v.y.toFixed(1)}, Z ${v.z.toFixed(1)} mm · RPY ${deg(e.x)}°/${deg(e.y)}°/${deg(e.z)}° · error ${p.reprojectionError.toFixed(1)} px (uncalibrated)`;
  };
  driverReadout.textContent=readout('needleDriver');forcepsReadout.textContent=readout('forceps');
 }
}
async function detectFrame(now:number){
 if(!stream||!detectorReady||processing||!video.videoWidth||now-lastDetection<90)return;
 lastDetection=now;processing=true;const session=cameraSession;
 try{
  const w=video.videoWidth,h=video.videoHeight;if(frameCanvas.width!==w||frameCanvas.height!==h){frameCanvas.width=w;frameCanvas.height=h;overlay.width=w;overlay.height=h;}
  frameContext.drawImage(video,0,0,w,h);const frame=frameContext.getImageData(0,0,w,h);if(thresholdToggle.checked)renderThreshold(frame);if(cropToggle.checked)renderCrop(frame);const found=await detector.detect(frame);
  if(session===cameraSession){observations=found;observationsAt=performance.now();updateStereoMatches();framesAnalyzed++;diag('frames').textContent=String(framesAnalyzed);diag('candidates').textContent=detector.diagnostics.candidateCount===null?'Unavailable':String(detector.diagnostics.candidateCount);diag('outlines').textContent=String(detector.candidateCorners.length);diag('decoded').textContent=`${detector.diagnostics.recognizedCount} matched · ${detector.diagnostics.rawMarkerCount} total`;diag('time').textContent=detector.diagnostics.durationMs.toFixed(0)+' ms';diag('pass').textContent=detector.diagnostics.pass;diag('contrast').textContent=detector.diagnostics.contrast;diag('note').textContent=detector.diagnostics.note;drawDetections();}
 }catch(e){status.textContent='Detection error: '+(e instanceof Error?e.message:String(e));detectorReady=false;diag('note').textContent='Detector threw an error';}
 finally{processing=false;}
}
const resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});resize.observe(mount);
let last=performance.now();
function animate(now:number){const dt=Math.min((now-last)/1000,.05);last=now;
 if(!simulation.checked){
  for(const [name,mesh] of [['needleDriver',driver],['forceps',forceps]] as const){
   const target=liveTargets.get(name);
   if(target&&now-target.lastSeen<trackingHoldMs){
    const blend=1-Math.exp(-dt*24);
    mesh.position.lerp(target.position,blend);
    mesh.quaternion.slerp(target.quaternion,blend);
   }
  }
 }
 if(simulation.checked){const speed=(keys.has('shift')?2:1)*dt;
  driver.position.x+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*speed;driver.position.z+=(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*speed;
  forceps.position.x+=(Number(keys.has('d'))-Number(keys.has('a')))*speed;forceps.position.z+=(Number(keys.has('s'))-Number(keys.has('w')))*speed;
 }
 driver.position.x=THREE.MathUtils.clamp(driver.position.x,-2,2);driver.position.z=THREE.MathUtils.clamp(driver.position.z,-2,2);
 forceps.position.x=THREE.MathUtils.clamp(forceps.position.x,-2,2);forceps.position.z=THREE.MathUtils.clamp(forceps.position.z,-2,2);
 if(simulation.checked)driverReadout.textContent=`Simulated · (${driver.position.x.toFixed(2)}, ${driver.position.z.toFixed(2)})`;
 if(simulation.checked)forcepsReadout.textContent=`Simulated · (${forceps.position.x.toFixed(2)}, ${forceps.position.z.toFixed(2)})`;
 void detectFrame(now);
 void detectSecondFrame(now);
 orbit.update();renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{void stopCamera();void stopSecondCamera();resize.disconnect();orbit.dispose();renderer.dispose();});
