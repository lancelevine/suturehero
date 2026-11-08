import {ReplayWorkQueue} from './trackingLab/ReplayWorkQueue';
import {ARUCO_LIBRARY_URLS} from './input/arucoLibraryUrls';
import {snapshotTrackingStorage} from './trackingLab/configuration';
import {markerJawDiagnostics} from './trackingLab/markerJawDiagnostics';
import {cameraImage,recordedInput} from './trackingLab/runtime';
import {BallMotionTracker,validJawBall} from './input/BallMotionTracker';
import {findSphereSilhouette} from './input/sphereSilhouette';
import {solveStereoRigPose,type StereoRigDiagnostics,type StereoRigPose} from './input/stereoRigPose';
import {StereoPoseFilter} from './input/StereoPoseFilter';
import {jawCameraParticipates} from './input/jawCameraMode';
import {findStripedBalls,type StripedBallDiagnostics} from './input/stripedBallSearch';
import {RingPoseTracker} from './input/RingPoseTracker';
import {StereoFrames} from './input/StereoFrames';
import {StereoFallback,type MonoView} from './input/StereoFallback';
import {JawViewFusion} from './input/JawViewFusion';
import {stereoBoard} from './input/stereoBoard';
import {stereoPracticePosition} from './input/stereoTrackingPose';
import {parseWorkspace,serializeWorkspace,workspacePracticePosition,type StereoWorkspace} from './input/stereoWorkspace';
import {mountStereoWorkspacePanel} from './ui/StereoWorkspacePanel';
import {findColorBalls,partnerSearchCenter} from './input/colorBallSearch';
import {mapMonocularDepth} from './input/monocularDepthMapping';
import {copyFlowSeed} from './input/flowSeed';
import {frameClock,observeCameraFrames} from './input/CameraFrameClock';
import {PredictiveDecodeSearch} from './input/PredictiveDecodeSearch';
import {videoSnapshot} from './input/videoSnapshot';
import {trackingPerformance as perf} from './diagnostics/TrackingPerformance';
import {mountPerformancePanel} from './ui/PerformancePanel';
import {loadJawTracking,saveJawTracking,type SavedJawTracking} from './input/jawTrackingStorage';
import {MarkerRestLatch} from './input/MarkerRestLatch';
import {tiltCorrectedSize,SizeDepthCalibration,type SizeDepthAnchor} from './input/tiltSizeDepth';
import {MonocularDepthFilter} from './input/MonocularDepthFilter';
import {JawCalibration,type JawDistance,type JawEndpoint} from './input/JawCalibration';
import {TrackedPoseFilter} from './input/TrackedPoseFilter';
import {instrumentCalibration} from './input/InstrumentCalibration';
import {mountTrackingLayout} from './ui/TrackingLayout';
import './ui/workspace.css';
import {trackedInstrumentRotation} from './input/trackingFrame';
import {selectBallPair,ballPairReference,predictBall,sampledBallColor,normalizedBallSeparation,type BallBlob,type BallMarker,type BallPairReference} from './input/ballPairTracking';
import * as THREE from 'three';
import {parseCalibration,calibrationMatches,undistort,type StereoCalibration} from './input/stereoGeometry';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MARKER_GROUPS,type MarkerObservation} from './input/arucoTracking';
import {availableCameras,openCamera,fillCameraSelect,savedCamera,rememberCamera,CAMERA_STORAGE_PRIMARY,CAMERA_STORAGE_SECONDARY} from './input/cameraDevices';
import {createCameraSettingsPanel} from './ui/CameraSettingsPanel';
import {mountMarkerJaws} from './jaw/markerJawController';
import {publishTrackingMessage,TRACKING_MESSAGE,type TrackingStatusMessage} from './input/trackingMessages';
import {TRACKING_STORAGE_KEYS,readStored,readStoredJson,writeStored,removeStored,parseTrackerType,parseNeedleJawPattern,jawStorageKey,patternJawStorageKey,parseDepthCalibration,DEFAULT_WORKING_DEPTH_MM,type NeedleJawPattern,type SavedDepthCalibration} from './input/trackingStorage';
import type {DetectorDiagnostics} from './input/arucoDetector';
import {estimateMarkerPose} from './input/markerPose';
import {RING_LAYOUT_REVISION,solvePrismPose,trackerGeometry,bodyPoseFromMarker,type PrismPose,type TrackerType} from './input/prismPose';
import {Instrument} from './instruments/Instrument';
import {BALL_INSTRUMENTS,ballTrackingSlot,type BallInstrumentName} from './input/ballTrackingSlots';
import './style.css';
import './tracking.css';

declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=`<header><a class="brand" href="./"><img class="brand-logo" src="/suturehero-emblem.svg" alt="" aria-hidden="true"><span class="brand-name">Suture<span class="muted">Hero</span></span></a><span class="lab">INSTRUMENT TRACKING LAB · BUILD ${__SUTUREHERO_BUILD__} (${__SUTUREHERO_REVISION__})</span><a href="./">← Return to practice</a></header>
<main class="tracking-layout"><section class="tracking-panel"><div class="eyebrow">01 / CAMERA</div><h1>Instrument tracking</h1><p class="intro">Start your webcam to detect ArUco markers. Outlines and IDs appear on the video.</p>
<div class="tracking-actions"><label for="tracker-type">Marker tracker</label><select id="tracker-type"><option value="prism">3-face prism (legacy)</option><option value="ring6">6-face hexagonal ring</option><option value="ring8">8-face ring (6 sides + 2 angled)</option></select><span id="tracker-type-status" class="tracking-message" role="status"></span></div>
<div class="tracking-actions"><button id="start-stereo-all" type="button">Start stereo + metric 3D (both cameras)</button><span id="stereo-quick-status" class="tracking-message" role="status"></span></div><div class="tracking-actions"><label for="tracking-mode">Tracking mode</label><select id="tracking-mode"><option value="mono">1 camera · 3D tracking</option><option value="stereo">2 cameras · experimental</option></select><label><input id="lock-depth" type="checkbox" checked> Lock depth</label><label><input id="flow-rotation" type="checkbox"> Experimental continuous flow rotation</label><label><input id="face-transition" type="checkbox"> Experimental immediate face transitions</label><label><input id="stable-depth" type="checkbox" checked> Stabilize unlocked depth (experimental)</label></div><p class="tracking-message" id="tracking-mode-info">1 camera: filtered approximate depth, with optional depth lock. Rotation is approximate. Two-camera stereo requires imported calibration.</p>
<div class="tracking-actions"><label for="camera-select">Camera</label><select id="camera-select"><option value="">Default camera</option></select><button id="start-camera">Start camera 1</button><button id="stop-camera" disabled>Stop camera</button></div>
<div class="tracking-actions"><button id="camera-expand" type="button">Enlarge camera preview</button></div><div class="tracking-actions"><label><input type="checkbox" id="aruco-correction" checked> Experimental ArUco corner correction</label></div><div class="tracking-actions"><label><input type="checkbox" id="corner-debug"> Compare marker corners (cyan = decoded, green = flow, yellow = solver input)</label><span id="corner-debug-status" class="tracking-message"></span></div><div class="tracking-video" id="primary-camera-preview"><video id="camera-video" autoplay playsinline muted></video><canvas id="camera-overlay"></canvas><span id="camera-placeholder">Camera is off</span></div><details class="tracking-tuning"><summary>Experimental three-instrument ball jaw tracking</summary><p>Select an instrument and a color sampling view. With that camera running, assign balls A and B by clicking them in its image. Repeat color sampling for the other camera if used. At Near, capture closed and open while holding still; repeat at Far at the same typical angle. Each capture averages about one second of frames. Colored mode requires distinct colors. For the needle-driver trial, choose white balls with three black bands (10 mm), assign both centers, and show the bands clearly for initial identification. Tracking then uses the circular silhouette.</p><div class="tracking-actions"><label><input type="checkbox" id="ball-enable"> Enable ball tracking</label><label>Ball assignment view <select id="ball-camera"><option value="0">Camera 1</option><option value="1">Camera 2</option></select></label><span class="tracking-message">1-camera mode uses Camera 1 only; 2-camera mode captures configured views together.</span><label>Needle driver balls <select id="needle-ball-pattern"><option value="color">Colored balls</option><option value="striped10">White + 3 black bands · 10 mm (trial)</option><option value="white10">Solid white ball · 10 mm (trial)</option></select></label><label>Instrument <select id="ball-instrument"><option value="forceps">Forceps</option><option value="needleDriver">Needle driver</option><option value="scissors">Scissors</option></select></label><button id="ball-pick-a">Assign ball A</button><button id="ball-pick-b">Assign ball B</button><label>Capture distance <select id="ball-calibration-distance"><option value="near">Near working distance</option><option value="far">Far working distance</option></select></label><button id="ball-closed">Capture closed · Near</button><button id="ball-open">Capture open · Near</button><button id="ball-calibration-reset" type="button">Reset jaw measurements</button></div><p id="ball-calibration-status" class="tracking-message" role="status"></p><div id="ball-readout" class="tracking-message">Not calibrated</div></details>
<div class="tracking-actions"><label for="camera-select-2">Second camera</label><select id="camera-select-2"><option value="">Choose second camera</option></select><button id="start-camera-2">Start second camera</button><button id="stop-camera-2" disabled>Stop second camera</button></div>
<div class="tracking-video"><video id="camera-video-2" autoplay playsinline muted></video><canvas id="camera-overlay-2"></canvas><span id="camera-placeholder-2">Second camera is off</span></div>
<details class="tracking-details"><summary>Diagnostics &amp; Calibration</summary><div class="tracking-details-body"><p class="tracking-message" id="camera-status-2">Second camera ready. Independent marker detection only; stereo fusion is not enabled yet.</p><p class="tracking-message" id="stereo-match-status">Stereo matching: waiting for both cameras.</p>
<section class="tracking-panel" style="margin-top:12px;padding:14px">
 <div class="eyebrow">STEREO CALIBRATION · CAPTURE</div>
 <p class="tracking-message">Checkerboard: <strong>9 × 7 squares · 8 × 6 inner corners · 16 mm squares</strong>. Hold the entire board in view of both cameras, with the same checkerboard corner visible in both. Capture 20–30 varied poses, including corners of the workspace and tilted angles. Keep both cameras fixed.</p>
 <label>Checkerboard square size (mm) <input id="stereo-square-size-mm" type="number" min="1" max="100" step="0.1" value="${stereoBoard.squareSizeMm}"></label>
 <p class="tracking-message" id="checkerboard-quality">Capture guidance: keep the checkerboard sharp, flat, and fully visible in both cameras. Rotate and tilt it between captures.</p>
 <div class="tracking-actions"><button id="capture-stereo-pair">Capture checkerboard pair</button><button id="export-stereo-pairs" disabled>Export captures</button><button id="clear-stereo-pairs">Clear captures</button></div>
 <p class="tracking-message" id="stereo-calibration-status">0 pairs captured. This stage records paired images; calibration solving and triangulation are not enabled yet.</p>
</section>
<label class="tracking-message"><input id="show-threshold" type="checkbox"> Show thresholded camera image (diagnostic)</label><canvas id="threshold-preview" style="display:none;width:100%;aspect-ratio:16/9;background:#15242c;image-rendering:pixelated"></canvas><label class="tracking-message"><input id="roi-decode" type="checkbox" checked> Predictive region decode · full-frame fallback (uncheck for full-frame baseline)</label><label class="tracking-message"><input id="show-crop" type="checkbox"> Show center crop (place prism in center of camera)</label><div id="crop-views" style="display:none;grid-template-columns:1fr 1fr;gap:8px"><div><small>Original crop</small><canvas id="crop-original" style="width:100%;image-rendering:pixelated"></canvas></div><div><small>Adaptive threshold crop</small><canvas id="crop-adaptive" style="width:100%;image-rendering:pixelated"></canvas></div></div><p class="tracking-message"><span style="color:#179a68;font-weight:bold">Green</span> = decoded marker</p>
<p class="tracking-message" id="camera-status" role="status">Ready. Camera permission requires localhost or HTTPS.</p>
<details class="tracking-details"><summary>Camera Focus &amp; Exposure</summary><div class="tracking-details-body"><p class="tracking-message">Availability depends on camera and browser.</p><div id="camera-settings-controls"></div></div></details><section class="tracking-panel" style="padding:12px;margin:12px 0"><div class="eyebrow">WORKING DEPTH CALIBRATION</div><label>Working depth (mm) <input id="working-depth-mm" type="number" min="50" max="1500" step="10" value="400" style="width:90px"></label><div class="tracking-actions"><button id="set-depth-near" type="button">Set Near</button><button id="set-depth-far" type="button">Set Far</button><button id="reset-depth-range" type="button">Reset depth</button></div><p id="depth-range-status" class="tracking-message">Select the instrument in Calibrate, then hold a reasonably face-on marker steady to capture Near and Far.</p></section><div class="tracking-stats" aria-label="Live camera diagnostics">
<div><strong>Camera resolution</strong><span id="diag-resolution">Not started</span></div>
<div><strong>Frames analyzed</strong><span id="diag-frames">0</span></div><div><strong>Detection FPS</strong><span id="diag-detection-fps">0</span></div>
<div><strong>Candidate squares</strong><span id="diag-candidates">—</span></div><div><strong>Outlines drawn</strong><span id="diag-outlines">—</span></div>
<div><strong>Decoded markers</strong><span id="diag-decoded">—</span></div>
<div><strong>Detection time</strong><span id="diag-time">—</span></div><div><strong>Detection pass</strong><span id="diag-pass">—</span></div><div><strong>Image contrast</strong><span id="diag-contrast">—</span></div>
<div><strong>Detection status</strong><span id="diag-note">Waiting for camera</span></div>
</div>
</div></details><div class="tracking-actions"><label><input id="simulation" type="checkbox"> Simulated input</label><button id="reset-sim">Reset positions</button></div>
<p class="tracking-message">Live mode: move the printed markers to move the virtual instruments. Simulation mode: needle driver arrow keys, forceps W/A/S/D, scissors I/J/K/L (Shift = faster).</p>
</section><section class="tracking-panel"><div class="eyebrow">02 / VIRTUAL VIEW</div><h2>Instrument diagnostics</h2><div id="tracking-scene"></div><div id="stereo-view-indicator" role="status" aria-live="off" style="display:flex;align-items:center;gap:8px;margin:8px 0 12px;font-size:13px"><span id="stereo-view-dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#89939e"></span><span id="stereo-view-label">Stereo triangulation: off</span></div><details class="tracking-details"><summary>Virtual View Controls &amp; Diagnostics</summary><div class="tracking-details-body"><div class="tracking-actions"><button id="reset-view">Reset view</button><span class="tracking-message">Drag to rotate · Right-drag to pan · Scroll to zoom</span></div><div class="tracking-stats"><div><strong>Needle driver</strong><span id="driver-readout">Simulated · (0, 0)</span></div><div><strong>Forceps</strong><span id="forceps-readout">Simulated · (0, 0)</span></div><div><strong>Scissors</strong><span id="scissors-readout">Simulated · (0, 0)</span></div><div><strong>Rotation solver</strong><span id="rotation-solver-status">Waiting for markers</span></div><div><strong>Rotation stages (°)</strong><span id="rotation-stage-readout" style="white-space:pre-line;font-variant-numeric:tabular-nums">Waiting for markers</span></div><div><strong>Tracker faces</strong><span id="face-overlap-readout">Waiting for camera</span></div><div><strong>Detected markers</strong><span id="marker-readout">Waiting for camera</span></div></div><p class="tracking-message" id="tracker-geometry-description"></p><div class="tracking-tuning"><label>Rotation sensitivity <input id="rotation-sensitivity" type="range" min="0.5" max="8" step="0.5" value="3"><output id="rotation-sensitivity-value">3°</output></label><label>Rotation gain <input id="rotation-gain" type="range" min="0.1" max="1" step="0.05" value="0.1"><output id="rotation-gain-value">0.10×</output></label><label>Depth sensitivity <input id="depth-sensitivity" type="range" min="0.5" max="4" step="0.25" value="1.5"><output id="depth-sensitivity-value">1.5×</output></label><p class="tracking-message" id="tracking-filter-diagnostics">Raw and filtered depth/rotation diagnostics appear during tracking.</p></div></div></details></section></main>`;
const video=document.querySelector<HTMLVideoElement>('#camera-video')!;
const overlay=document.querySelector<HTMLCanvasElement>('#camera-overlay')!;
const cameraExpand=document.querySelector<HTMLButtonElement>('#camera-expand')!;
cameraExpand.addEventListener('click',()=>{
 const enlarged=document.body.classList.toggle('tracking-camera-enlarged');
 cameraExpand.textContent=enlarged?'Restore camera layout':'Enlarge camera preview';
});
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
const syncDepthLock=()=>{const locks=(['forceps','needleDriver','scissors'] as const).map(name=>instrumentCalibration.profile(name).depthLock);lockDepth.checked=locks.every(Boolean);lockDepth.indeterminate=locks.some(Boolean)&&!locks.every(Boolean);};
instrumentCalibration.subscribe(syncDepthLock);syncDepthLock();
lockDepth.addEventListener('change',()=>{const checked=lockDepth.checked;for(const name of ['forceps','needleDriver','scissors'] as const)instrumentCalibration.update(name,{depthLock:checked});liveTargets.clear();stationaryStates.clear();depthStates.clear();});
trackingMode.addEventListener('change',()=>{resetTrackerPose();
 liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationGeometryStates.clear();depthStates.clear();
 trackingModeInfo.textContent=trackingMode.value==='mono'
  ?'1 camera: filtered approximate depth, with optional depth lock. Camera 1 drives movement and rotation.'
  :'2 cameras: import solved calibration, enable metric 3D, and verify both cameras match the calibrated setup.';
});
simulation.addEventListener('change',()=>{resetTrackerPose();stereoPositions.clear();rotationFaceStates.clear();liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationGeometryStates.clear();rotationFilterStates.clear();depthStates.clear();driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.15);scissors.position.set(0,.25,1.05);driver.quaternion.identity();forceps.quaternion.identity();scissors.quaternion.identity();});
const markerReadout=document.querySelector<HTMLElement>('#marker-readout')!;
const driverReadout=document.querySelector<HTMLElement>('#driver-readout')!;
const forcepsReadout=document.querySelector<HTMLElement>('#forceps-readout')!;
const scissorsReadout=document.querySelector<HTMLElement>('#scissors-readout')!;
const faceOverlapReadout=document.querySelector<HTMLElement>('#face-overlap-readout')!;
const replayWorkQueue=new ReplayWorkQueue();
class WorkerDetector {
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
  const worker=flowOnly?new Worker(new URL('./input/arucoFlowWorker.ts',import.meta.url),{type:'module'}):new Worker(new URL('./input/arucoWorker.ts',import.meta.url));
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
 seed(markers:MarkerObservation[],frame?:ImageData){this.worker?.postMessage({type:'seed',at:recordedInput()?performance.now():undefined,markers,frame});}
 detect(frame:ImageData,origin={x:0,y:0}):Promise<MarkerObservation[]>{
  if(!this.worker)return Promise.reject(new Error('Detector worker not initialized'));
  const id=++this.sequence;this.lastFrameSize={width:frame.width,height:frame.height};
  const request=()=>new Promise<MarkerObservation[]>((resolve,reject)=>{this.pending.set(id,{resolve,reject,started:performance.now()});this.worker!.postMessage({type:'detect',at:recordedInput()?performance.now():undefined,id,frame,origin},[frame.data.buffer]);});
  return recordedInput()?replayWorkQueue.run(request):request();
 }
 dispose(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values())p.reject(new Error('Worker stopped'));this.pending.clear();}
}
const detector=new WorkerDetector('Camera 1 decode');
const fastTracker=new WorkerDetector('Camera 1 flow');
let fastProcessing=false,lastFastFrame=0,lastSlowFrame=0,latestFlowAt=0,latestDecodeAt=0;
let lastAppliedFrameAt=0;
let staleDecodeDrops=0;
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
const detector2=new WorkerDetector('Camera 2 decode');
const fastTracker2=new WorkerDetector('Camera 2 flow');
const stereoPanel=document.createElement('section');stereoPanel.className='tracking-panel';stereoPanel.style.cssText='padding:12px;margin:12px 0';
stereoPanel.innerHTML='<div class="eyebrow">CALIBRATED STEREO · METRIC 3D</div><p class="tracking-message">Import a solved stereo calibration JSON. Replace it after moving either camera, changing focus/zoom, or changing resolution/aspect ratio. Raw checkerboard captures are not solved parameters.</p><div class="tracking-actions"><label>Import calibration <input id="stereo-import" type="file" accept=".json,application/json"></label><button id="stereo-remove" type="button">Remove calibration</button><label><input id="stereo-enable" type="checkbox"> Enable metric 3D</label></div><p class="tracking-message" id="stereo-geometry-status">No calibration loaded.</p><p class="tracking-message" id="stereo-3d-points">No triangulated markers.</p>';
document.querySelector('#stereo-calibration-status')!.closest('section')!.after(stereoPanel);
const stereoGeometryStatus=stereoPanel.querySelector<HTMLElement>('#stereo-geometry-status')!;
const stereo3dStatus=stereoPanel.querySelector<HTMLElement>('#stereo-3d-points')!;
const stereoEnabled=stereoPanel.querySelector<HTMLInputElement>('#stereo-enable')!;
let stereoCalibration:StereoCalibration|null=null;
// Stereo workspace: user-defined right/up/forward axes and scale (stereoWorkspace.ts).
let stereoWorkspace:StereoWorkspace|null=null;
const stereoCalibrationKey=()=>stereoCalibration?`${stereoCalibration.cameraIds?.first??''}|${stereoCalibration.cameraIds?.second??''}|${Math.hypot(...stereoCalibration.stereo.translationMm).toFixed(1)}`:'';
const loadStereoWorkspace=()=>{stereoWorkspace=stereoCalibration?parseWorkspace(readStoredJson(TRACKING_STORAGE_KEYS.stereoWorkspace),stereoCalibrationKey()):null;};
const workspacePanel=mountStereoWorkspacePanel(stereoPanel,workspace=>{
 stereoWorkspace=workspace;
 if(workspace)writeStored(TRACKING_STORAGE_KEYS.stereoWorkspace,JSON.stringify(serializeWorkspace(workspace,stereoCalibrationKey())));
 else removeStored(TRACKING_STORAGE_KEYS.stereoWorkspace);
 resetTrackerPose();
},()=>stereoWorkspace);
type InstrumentName='needleDriver'|'forceps'|'scissors';
const trackerTypeSelect=document.querySelector<HTMLSelectElement>('#tracker-type')!;
const trackerTypeStatus=document.querySelector<HTMLElement>('#tracker-type-status')!;
let trackerType:TrackerType='prism';
const ringMarkerGroups:Record<InstrumentName,readonly number[]>={
 needleDriver:[0,1,2,3,4,5,6,7],
 forceps:[10,11,12,13,14,15,16,17],
 scissors:[20,21,22,23,24,25,26,27]
};
const sixMarkerGroups:Record<InstrumentName,readonly number[]>={needleDriver:[0,1,2,3,4,5],forceps:[10,11,12,13,14,15],scissors:[20,21,22,23,24,25]};
const markerGroups=():Record<InstrumentName,readonly number[]>=>trackerType==='ring8'?ringMarkerGroups:trackerType==='ring6'?sixMarkerGroups:MARKER_GROUPS;
function updateTrackerDescription(){
 const geometry=trackerGeometry(trackerType),groups=markerGroups(),spacing=THREE.MathUtils.radToDeg(geometry.sideStepRadians).toFixed(0);
 trackerTypeStatus.textContent=`${geometry.faceCount}-face ${trackerType==='prism'?'prism':'ring'} · ${spacing}° side spacing for all instruments · `+(['needleDriver','forceps','scissors'] as const).map(n=>`${n==='needleDriver'?'Needle driver':n==='forceps'?'Forceps':'Scissors'} IDs ${groups[n][0]}–${groups[n].at(-1)}`).join(' · ');
 document.querySelector('#tracker-geometry-description')!.textContent=`DICT_4X4_50 · ${geometry.markerSizeMm} mm marker squares. All instruments use the selected ${geometry.faceCount}-face geometry with ${spacing}° side spacing${trackerType==='ring8'?' plus two inclined end faces; briefly show each angled marker together with a side marker to align its single-camera rotation':''}. Face ID order and printed corner orientation must match the physical tracker. Camera depth and angles remain approximate until camera calibration.`;
}

function resetTrackerPose(){
 instrumentCalibration.clearSessions();rawRenderedPoses.clear();ringPoseTrackers.clear();stereoFallbacks.clear();stereoFallbackStatus.clear();stereoFrames.clear();monoDepthFilters.clear();sizeDepthFrames.clear();sizeDepthFaces.clear();primarySearch.reset();secondarySearch.reset();
 rigidBodyStates.clear();rotationSources.clear();
 rotationFaceStates.clear();liveTargets.clear();stereoPositions.clear();stereoPoseFilters.clear();
 rotationStates.clear();rotationGeometryStates.clear();rotationFilterStates.clear();
 poseHistory.clear();depthHistory.clear();depthHistoryStamps.clear();
}
trackerTypeSelect.addEventListener('change',()=>{
 trackerType=parseTrackerType(trackerTypeSelect.value);
 resetTrackerPose();
 updateTrackerDescription();
 markerJaws.reloadModels();
 writeStored(TRACKING_STORAGE_KEYS.trackerType,trackerType);
});
trackerTypeSelect.value=parseTrackerType(readStored(TRACKING_STORAGE_KEYS.trackerType));
trackerType=parseTrackerType(trackerTypeSelect.value);
updateTrackerDescription();

const rotationFaceStates=new Map<InstrumentName,{id:number;pending:THREE.Quaternion|null;count:number}>();
const stereoPositions=new Map<InstrumentName,{position:THREE.Vector3;quaternion:THREE.Quaternion;lastSeen:number;lastSample:number}>();
const stereoPoseFilters=new Map<InstrumentName,StereoPoseFilter>();

type StereoRotation=StereoRigPose;
const ringPoseTrackers=new Map<InstrumentName,RingPoseTracker>();
const stereoFrames=new StereoFrames();
const stereoFallbacks=new Map<InstrumentName,StereoFallback>();
const stereoFallbackStatus=new Map<InstrumentName,string>();
const stereoMonoCache=new Map<InstrumentName,{key:string;calibration:StereoCalibration;views:MonoView[]}>();
const stereoPoseCache=new Map<InstrumentName,{key:string;calibration:StereoCalibration;pose:StereoRotation|null;lastGood?:StereoRotation;lastGoodAt?:number}>();
/** A remembered stereo pose guides the next fit only while this recent (ms). */
const STEREO_CONTINUITY_MS=500;
// Fit all known face corners jointly in the calibrated camera frames.
/** Why stereo was not used for each instrument on the latest frame (diagnostics only). */
const stereoRejections=new Map<InstrumentName,string>();
function noteStereoRejection(name:InstrumentName,reason:string){
 if(stereoRejections.get(name)!==reason)perf.count('Stereo not used: '+reason.replace(/·.*$/,'').replace(/-?\d+(\.\d+)?/g,'#').trim());
 stereoRejections.set(name,reason);
}
function stereoPrismRotation(name:InstrumentName,now:number):StereoRotation|null{
 if(!stereoActive()||!stereoCalibration||!overlay.width||!overlay2.width)return null;
 if(calibrationMatches(stereoCalibration,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight))return null;
 const synchronized=stereoFrames.pair(now);if(!synchronized){noteStereoRejection(name,'no time-matched camera pair: '+(stereoFrames.lastFailure??'unknown'));return null;}
 const key=`${synchronized.at}:${trackerType}:${overlay.width}:${overlay.height}:${overlay2.width}:${overlay2.height}`,cached=stereoPoseCache.get(name);
 if(cached?.key===key&&cached.calibration===stereoCalibration)return cached.pose;
 const diagnostics:StereoRigDiagnostics={};
 const pose=solveStereoRigPose(stereoCalibration,synchronized.first,synchronized.second,{width:overlay.width,height:overlay.height},{width:overlay2.width,height:overlay2.height},markerGroups()[name][0],trackerType,cached?.pose??(cached?.lastGood&&synchronized.at-(cached.lastGoodAt??-Infinity)<STEREO_CONTINUITY_MS?cached.lastGood:undefined),diagnostics);
 if(pose)stereoRejections.delete(name);else noteStereoRejection(name,diagnostics.reason??'rejected');
 // Keep the last accepted pose through rejected frames so the next fit stays continuous.
 const keep=cached?.calibration===stereoCalibration;
 stereoPoseCache.set(name,{key,calibration:stereoCalibration,pose,lastGood:pose??(keep?cached?.lastGood:undefined),lastGoodAt:pose?synchronized.at:(keep?cached?.lastGoodAt:undefined)});return pose;
}

function stereoMonoViews(name:InstrumentName,now:number):MonoView[]{
 if(!stereoCalibration)return [];
 const ids:readonly number[]=markerGroups()[name],cal=stereoCalibration;
 const key=`${observationsAt}:${secondaryObservationsAt}:${trackerType}:${overlay.width}:${overlay.height}:${overlay2.width}:${overlay2.height}`;
 const cached=stereoMonoCache.get(name);if(cached?.key===key&&cached.calibration===cal)return cached.views.filter(v=>now-v.at<180);
 const R=cal.stereo.rotation;
 const matrix=new THREE.Matrix4().set(R[0][0],R[0][1],R[0][2],0,R[1][0],R[1][1],R[1][2],0,R[2][0],R[2][1],R[2][2],0,0,0,0,1);
 const inverse=new THREE.Quaternion().setFromRotationMatrix(matrix).invert(),translation=new THREE.Vector3(...cal.stereo.translationMm as [number,number,number]);
 const views=([0,1] as const).flatMap(camera=>{
  const at=camera?secondaryObservationsAt:observationsAt;if(now-at>180)return [];
  const size=camera?{width:overlay2.width,height:overlay2.height}:{width:overlay.width,height:overlay.height},intrinsics=camera?cal.camera2:cal.camera1;
  const candidates=(camera?liveSecondMarkers():liveMarkers()).filter(m=>ids.includes(m.id)).map(marker=>{
   const normalized={id:marker.id,corners:marker.corners.map(p=>{const [x,y]=undistort(p,intrinsics.cameraMatrix,intrinsics.distortionCoefficients,intrinsics.imageSize??cal.imageSize,size);return {x:1000+x*1000,y:1000+y*1000};})};
   const pose=estimateMarkerPose(normalized,2000,2000,trackerGeometry(trackerType).markerSizeMm,1000);
   if(!pose||pose.reprojectionError>4)return null;
   const body=bodyPoseFromMarker(pose,ids.indexOf(marker.id),trackerType);
   if(body.translation.z<30||body.translation.z>3000)return null;
   const axis=new THREE.Vector3(0,0,1);
   if(camera){body.translation.sub(translation).applyQuaternion(inverse);body.quaternion.premultiply(inverse);axis.applyQuaternion(inverse);}
   return {position:body.translation,quaternion:body.quaternion,axis,at,camera,error:pose.reprojectionError};
  }).filter((p):p is NonNullable<typeof p>=>p!==null).sort((a,b)=>a.error-b.error);
  return candidates.length?[candidates[0]]:[];
 });
 stereoMonoCache.set(name,{key,calibration:cal,views});return views;
}

const stereoActive=()=>stereoEnabled.checked&&!!stereoCalibration&&trackingMode.value==='stereo'&&!simulation.checked;
const stereoViewDot=document.querySelector<HTMLElement>('#stereo-view-dot')!;
const stereoViewLabel=document.querySelector<HTMLElement>('#stereo-view-label')!;
let lastTrackingStatus='',lastTrackingStatusAt=0;
function updateStereoViewIndicator(now:number){
 const configured=stereoActive();
 const fallback=[...stereoFallbackStatus].filter(([,source])=>source==='camera1'||source==='camera2');
 const fresh=[...stereoFallbackStatus].filter(([,source])=>source==='stereo').map(([name])=>name);
 const active=configured&&fresh.length>0;
 const mismatch=configured?calibrationMatches(stereoCalibration!,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight):null;
 stereoViewDot.style.background=active&&!mismatch&&!fallback.length?'#16a34a':configured?'#d69e28':'#89939e';
 stereoViewLabel.textContent=mismatch?'Stereo triangulation: calibration mismatch · '+mismatch:
  configured&&fallback.length?'Stereo fallback: '+fallback.map(([name,source])=>name+' · '+(source==='camera1'?'Camera 1':'Camera 2')+' · approximate depth').join(', '):
  active?'Stereo triangulation: ACTIVE · '+fresh.join(', '):configured?'Stereo triangulation: waiting for valid markers':'Stereo triangulation: off';
 const state=mismatch?'mismatch':configured?(fallback.length?'fallback':active?'active':'waiting'):stream&&!simulation.checked?'mono':'off';
 const detail:TrackingStatusMessage={type:TRACKING_MESSAGE.status,state,label:stereoViewLabel.textContent,sources:Object.fromEntries(stereoFallbackStatus)};
 const key=JSON.stringify(detail);
 if(embeddedTracking&&!recordedInput()&&(key!==lastTrackingStatus||now-lastTrackingStatusAt>500)){
  lastTrackingStatus=key;lastTrackingStatusAt=now;
  publishTrackingMessage(detail,root.dataset.embedded==='true');
 }

}

stereoEnabled.addEventListener('change',resetTrackerPose);
const stereoStorage=TRACKING_STORAGE_KEYS.stereoCalibration;
function loadStereoCalibration(raw:unknown,restore=false){
 const parsed=parseCalibration(raw);
 if(!restore){
  if(!select.value||!select2.value||select.value===select2.value)throw Error('Select two distinct, explicitly identified cameras before importing.');
  if(parsed.cameraIds&&((parsed.cameraIds.first&&parsed.cameraIds.first!==select.value)||(parsed.cameraIds.second&&parsed.cameraIds.second!==select2.value)))throw Error('Select the same camera order used for the calibration captures.');
  parsed.cameraIds={first:select.value,second:select2.value};
 }
 stereoCalibration=parsed;stereoEnabled.checked=false;if(!restore)resetTrackerPose();else stereoPositions.clear();
 loadStereoWorkspace();workspacePanel.refresh();
 writeStored(stereoStorage,JSON.stringify(parsed));
 stereoGeometryStatus.textContent='Calibration loaded · '+Math.hypot(...parsed.stereo.translationMm).toFixed(1)+' mm baseline · stereo RMS '+(parsed.stereo.rmsPx?.toFixed(2)??'unknown')+' px. Enable metric 3D after checking camera setup.';
}
// A saved calibration that no longer parses is discarded. Storage access is
// guarded: a browser that blocks storage must not stop the page loading.
{const saved=readStoredJson(stereoStorage);if(saved!==undefined){try{loadStereoCalibration(saved,true);}catch{removeStored(stereoStorage);}}else if(readStored(stereoStorage))removeStored(stereoStorage);}
stereoPanel.querySelector<HTMLInputElement>('#stereo-import')!.addEventListener('change',async event=>{
 const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];if(!file)return;
 try{loadStereoCalibration(JSON.parse(await file.text()));}catch(e){stereoGeometryStatus.textContent='Import rejected: '+String(e);}
 input.value='';
});
stereoPanel.querySelector<HTMLButtonElement>('#stereo-remove')!.addEventListener('click',()=>{
 stereoCalibration=null;stereoWorkspace=null;workspacePanel.refresh();stereoEnabled.checked=false;stereoPositions.clear();removeStored(stereoStorage);
 stereoGeometryStatus.textContent='Calibration removed.';stereo3dStatus.textContent='No triangulated markers.';
});
const frame2=document.createElement('canvas');
const context2=frame2.getContext('2d',{willReadFrequently:true})!;
const overlayContext2=overlay2.getContext('2d')!;
let stream2:MediaStream|null=null,ready2=false,processing2=false,lastDetection2=0,session2=0;
let fastProcessing2=false,lastFastFrame2=0,lastSlowFrame2=0,latestFlowAt2=0;
let decodedFrames2=0,flowFrames2=0,statsAt2=performance.now();
const confirmed2=new Map<number,number>();
const decoded2=new Map<number,number>();
const MARKER_LIVE_MS_SECONDARY=140;
const liveSecondMarkers=()=>secondaryObservations.filter(m=>performance.now()-(confirmed2.get(m.id)??-Infinity)<=MARKER_LIVE_MS_SECONDARY);
let secondaryObservations:MarkerObservation[]=[];
let secondaryObservationsAt=0;
const stereoStatus=document.querySelector<HTMLElement>('#stereo-match-status')!;
function updateStereoMatches(){
 if(!stream||!stream2||!observationsAt||!secondaryObservationsAt){stereoStatus.textContent='Stereo matching: waiting for both camera detections.';return;}
 const delta=Math.abs(observationsAt-secondaryObservationsAt);
 const matches=liveMarkers().filter(primary=>liveSecondMarkers().some(secondary=>secondary.id===primary.id)).map(marker=>marker.id);
 stereoStatus.textContent='Stereo: '+(delta<=250?'':'frames not synchronized · ')+(matches.length?'shared marker IDs '+matches.join(', '):'no shared marker IDs')+' · frame offset '+Math.round(delta)+' ms · calibration required for 3D';
}


const renderCameraSettings=createCameraSettingsPanel(document.querySelector<HTMLElement>('#camera-settings-controls')!,()=>[{label:'Camera 1',stream},{label:'Camera 2',stream:stream2}]);
async function refreshSecondCameraList(){
 const current=select2.value||savedCamera(CAMERA_STORAGE_SECONDARY);
 fillCameraSelect(select2,await availableCameras(),current,'Choose second camera');
}
async function stopSecondCamera(){stripedMotion[1].clear();if(jawCameraParticipates(trackingMode.value,1))cancelJointJaws('Capture cancelled: camera 2 stopped.');stereoPositions.clear();stereoFrames.clear();detector2.dispose();fastTracker2.dispose();
 fastProcessing2=false;processing2=false;lastFastFrame2=0;lastSlowFrame2=0;latestFlowAt2=0;confirmed2.clear();decoded2.clear();decodedFrames2=0;flowFrames2=0;statsAt2=performance.now();
 session2++;ready2=false;stream2?.getTracks().forEach(track=>track.stop());stream2=null;
 video2.srcObject=null;secondaryObservations=[];secondaryObservationsAt=0;updateStereoMatches();overlayContext2.clearRect(0,0,overlay2.width,overlay2.height);
 start2.disabled=false;stop2.disabled=true;
 document.querySelector<HTMLElement>('#camera-placeholder-2')!.style.display='';
 status2.textContent='Second camera stopped';renderCameraSettings();
}
async function startSecondaryCamera(){
 try{
  if(!select2.value){status2.textContent='Select the second USB camera first.';return;}
  if(select2.value===select.value){status2.textContent='Select a different camera from the primary camera.';return;}
  await stopSecondCamera();
  stream2=await openCamera(select2.value);video2.srcObject=stream2;await video2.play();renderCameraSettings();
  document.querySelector<HTMLElement>('#camera-placeholder-2')!.style.display='none';
  start2.disabled=true;stop2.disabled=false;status2.textContent='Loading second marker detector…';
  const currentSession=session2;await Promise.all([detector2.initialize(),fastTracker2.initialize(true)]);
  if(currentSession!==session2)return;
  ready2=true;status2.textContent='Second camera detecting markers independently.';renderCameraSettings();
 }catch(error){status2.textContent='Second camera error: '+String(error);await stopSecondCamera();throw error;}
}
start2.addEventListener('click',()=>{void startSecondaryCamera().catch(()=>{});});
stop2.addEventListener('click',()=>{void stopSecondCamera();});
const stereoQuick=document.querySelector<HTMLButtonElement>('#start-stereo-all')!;
const stereoQuickStatus=document.querySelector<HTMLElement>('#stereo-quick-status')!;
stereoQuick.addEventListener('click',async()=>{
 stereoQuick.disabled=true;
 try{
  trackingMode.value='stereo';trackingMode.dispatchEvent(new Event('change'));
  simulation.checked=false;simulation.dispatchEvent(new Event('change'));
  stereoEnabled.checked=true;stereoEnabled.dispatchEvent(new Event('change'));
  stereoQuickStatus.textContent='Starting both cameras…';
  await refreshCameras();await refreshSecondCameraList();
  if(!select2.value||(select.value&&select.value===select2.value)){
   stereoQuickStatus.textContent='Select a second camera distinct from camera 1, then press this button again.';
   return;
  }
  if(!stream)await startPrimaryCamera();
  if(!stream2)await startSecondaryCamera();
  stereoQuickStatus.textContent=stereoCalibration
   ?'Both cameras started; metric 3D enabled. Waiting for valid stereo marker matches.'
   :'Both cameras started. Import a solved stereo calibration to enable metric triangulation.';
 }catch(error){stereoQuickStatus.textContent='Stereo start failed: '+String(error);}
 finally{stereoQuick.disabled=false;}
});
select2.addEventListener('change',()=>{rememberCamera(CAMERA_STORAGE_SECONDARY,select2.value);if(stream2)void stopSecondCamera();});
const captureCanvas2=document.createElement('canvas');
const captureContext2=captureCanvas2.getContext('2d',{willReadFrequently:true})!;
async function detectSecondFrame(now:number){
 if(!stream2||!ready2||!video2.videoWidth)return;
 scanForcepsBalls(now,1);
 const recovering=!liveSecondMarkers().length||now-latestFlowAt2>120;
 const clock=frameClock(video2),fastDue=!fastProcessing2&&now-lastFastFrame2>=(clock?20:33);
 const doFast=fastDue&&(!clock||clock.fresh);if(fastDue&&!doFast)perf.count('Camera 2 duplicate flow requests skipped');
 const doSlow=!processing2&&now-lastSlowFrame2>=(recovering||roiDecodeToggle.checked?65:110);
 if(processing2)perf.count('Camera 2 decode busy checks');
 if(!doFast&&!doSlow)return;
 perf.tick('Camera 2 capture attempts');if(video2.currentTime===lastCamera2CaptureTime)perf.count('Camera 2 duplicate captures');lastCamera2CaptureTime=video2.currentTime;
 if(doSlow){if(video2.currentTime===lastCamera2DecodeTime)perf.count('Camera 2 duplicate decodes');lastCamera2DecodeTime=video2.currentTime;}
 const currentSession=session2;
 const nativeW=video2.videoWidth,nativeH=video2.videoHeight;
 const scale=Math.min(1,960/nativeW),w=Math.round(nativeW*scale),h=Math.round(nativeH*scale);
 const sx=nativeW/w,sy=nativeH/h;
 const toNative=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x*sx,y:p.y*sy}))}));
 const toFlow=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x/sx,y:p.y/sy}))}));
 if(frame2.width!==w||frame2.height!==h){frame2.width=w;frame2.height=h;overlay2.width=w;overlay2.height=h;}
 const snapshot=doSlow?perf.measure('Camera 2 video snapshot',()=>videoSnapshot(video2,captureCanvas2,captureContext2)):null;
 if(snapshot){snapshotBackend2=snapshot.direct?'VideoFrame':'canvas fallback';if(!snapshot.direct)perf.count('Camera 2 snapshot fallback');}
 try{
 perf.measure('Camera 2 flow resize',()=>context2.drawImage(snapshot?.source??cameraImage(video2),0,0,w,h));
 let preparedSeed:ImageData|undefined;const secondaryCaptureAt=performance.now();if(primaryCaptureAt)perf.sample('Camera capture skew',Math.abs(secondaryCaptureAt-primaryCaptureAt));
 const render=()=>{
  const fresh=liveSecondMarkers();
  overlayContext2.clearRect(0,0,w,h);
  for(const marker of fresh){
   // Same green-outline rule as Camera 1: require a recent decoded ID,
   // not merely an optical-flow prediction of an old marker.
   if(performance.now()-(decoded2.get(marker.id)??-Infinity)>650)continue;
   const pts=marker.corners;
   overlayContext2.beginPath();overlayContext2.moveTo(pts[0].x,pts[0].y);
   for(let i=1;i<pts.length;i++)overlayContext2.lineTo(pts[i].x,pts[i].y);
   overlayContext2.closePath();overlayContext2.strokeStyle='#18e89d';overlayContext2.lineWidth=3;overlayContext2.stroke();
   overlayContext2.font='bold 20px sans-serif';overlayContext2.fillStyle='#18e89d';
   overlayContext2.fillText('ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));
  }
  drawBallOutlines(1);
  const stamp=performance.now();
  if(stamp-statsAt2>=1000){
   const seconds=(stamp-statsAt2)/1000;
   status2.textContent='Camera 2: '+w+' × '+h+' · '+fresh.length+' tracked · IDs '+(fresh.map(m=>m.id).join(', ')||'none')+
    ' · '+(decodedFrames2/seconds).toFixed(1)+' decode FPS · '+(flowFrames2/seconds).toFixed(1)+' flow FPS';
   statsAt2=stamp;decodedFrames2=0;flowFrames2=0;
  }
  updateStereoMatches();
 };
 if(doFast){
  fastProcessing2=true;lastFastFrame2=now;clock?.consume();
  const frame=readFrame(context2,'Camera 2 flow readback',0,0,w,h);
  if(doSlow)preparedSeed=perf.measure('Camera 2 flow seed copy',()=>copyFlowSeed(frame));
  void fastTracker2.detect(frame).then(found=>{
   if(currentSession!==session2)return;
   perf.sample('Camera 2 flow frame age',performance.now()-secondaryCaptureAt);const stamp=performance.now();flowFrames2++;
   if(found.length){
    for(const marker of found)confirmed2.set(marker.id,stamp);
    secondaryObservations=found;secondaryObservationsAt=stamp;latestFlowAt2=stamp;stereoFrames.push(1,secondaryCaptureAt,found);
    detector2.seed(toNative(found));
   }else{
    secondaryObservations=[];confirmed2.clear();secondaryObservationsAt=stamp;stereoFrames.push(1,secondaryCaptureAt,[]);
    lastSlowFrame2=Math.min(lastSlowFrame2,stamp-65);
   }
   render();
  }).catch(error=>{if(currentSession===session2)status2.textContent='Camera 2 flow error: '+String(error);})
   .finally(()=>{if(currentSession===session2)fastProcessing2=false;});
 }
 if(doSlow){
  processing2=true;lastSlowFrame2=now;
  const flowSeedFrame=preparedSeed??readFrame(context2,'Camera 2 flow readback',0,0,w,h);
  const region=secondarySearch.plan(toNative(liveSecondMarkers()),now,nativeW,nativeH,roiDecodeToggle.checked,Object.values(markerGroups()));
  const {left,top,width:regionW,height:regionH}=region;perf.count('Camera 2 search '+region.kind);if(region.kind==='full')perf.count('Camera 2 full reason: '+region.reason);perf.count('Camera 2 searched pixels',regionW*regionH);
  if(decodeCanvas2.width!==regionW||decodeCanvas2.height!==regionH){decodeCanvas2.width=regionW;decodeCanvas2.height=regionH;}
  perf.measure('Camera 2 decode crop',()=>decodeContext2.drawImage(snapshot!.source,left,top,regionW,regionH,0,0,regionW,regionH));
  void detector2.detect(readFrame(decodeContext2,'Camera 2 decode readback',0,0,regionW,regionH),{x:left,y:top}).then(nativeFound=>{
   if(currentSession!==session2)return;
   perf.sample('Camera 2 decode frame age',performance.now()-secondaryCaptureAt);decodedFrames2++;
   const nativeMarkers=nativeFound.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x+left,y:p.y+top}))}));secondarySearch.result(nativeMarkers);perf.sample('Camera 2 '+region.kind+' decode worker',detector2.diagnostics.durationMs);
   const found=toFlow(nativeMarkers),stamp=performance.now();
   if(found.length&&stamp-secondaryCaptureAt<180)stereoFrames.push(1,secondaryCaptureAt,found);
   if(found.length){
    for(const marker of found)decoded2.set(marker.id,stamp);
    fastTracker2.seed(found,flowSeedFrame);
    const merged=liveSecondMarkers();
    for(const marker of found)if(!merged.some(m=>m.id===marker.id)){merged.push(marker);confirmed2.set(marker.id,stamp);}
    secondaryObservations=merged;secondaryObservationsAt=stamp;
   }
   render();
  }).catch(error=>{if(currentSession===session2)status2.textContent='Camera 2 decode error: '+String(error);})
   .finally(()=>{if(currentSession===session2)processing2=false;});
 }
 }finally{snapshot?.close();}
}
const decodeCanvas2=document.createElement('canvas');
const decodeContext2=decodeCanvas2.getContext('2d',{willReadFrequently:true})!;

void refreshSecondCameraList().catch(()=>{status2.textContent='Connect both USB cameras and allow camera access.';});


// Validated stereo capture is owned by stereoAutoCapture.

const diag=(name:string)=>document.querySelector<HTMLElement>('#diag-'+name)!;
let framesAnalyzed=0,detectorFpsWindow=performance.now(),detectorFpsCount=0;
const frameCanvas=document.createElement('canvas');
const frameContext=frameCanvas.getContext('2d',{willReadFrequently:true})!;
const overlayContext=overlay.getContext('2d')!;
let observations:MarkerObservation[]=[];
const arucoCorrection=document.querySelector<HTMLInputElement>('#aruco-correction')!;
const flowMotion=new Map<number,{corners:MarkerObservation['corners'];at:number;speed:number}>();
arucoCorrection.addEventListener('change',()=>{flowMotion.clear();});
const rawDecodedCorners=new Map<number,{marker:MarkerObservation;capturedAt:number;receivedAt:number}>();
const cornerDebug=document.querySelector<HTMLInputElement>('#corner-debug')!;
const cornerDebugStatus=document.querySelector<HTMLElement>('#corner-debug-status')!;

const markerLastConfirmed=new Map<number,number>();
const markerLastDecoded=new Map<number,number>();
const OVERLAP_DECODE_MS=220;
const verifiedMarkers=()=>{
 const now=performance.now();
 const eligible=liveMarkers().filter(m=>now-(markerLastDecoded.get(m.id)??-Infinity)<=OVERLAP_DECODE_MS);
 const selected:MarkerObservation[]=[];
 for(const name of Object.keys(markerGroups()) as Array<keyof typeof MARKER_GROUPS>){
  const ids=markerGroups()[name] as readonly number[];
  const ranked=eligible.filter(m=>ids.includes(m.id)).map(m=>{
   const area=Math.abs(m.corners.reduce((sum,p,i)=>sum+p.x*m.corners[(i+1)%4].y-m.corners[(i+1)%4].x*p.y,0))/2;
   const age=now-(markerLastDecoded.get(m.id)??0);
   return {marker:m,score:Math.log1p(area)-age*.009};
  }).sort((a,b)=>b.score-a.score);
  // A hexagonal ring can expose three side faces; ring8 adds inclined end faces.
  selected.push(...ranked.slice(0,trackerType==='prism'?2:trackerType==='ring6'?3:5).map(item=>item.marker));
 }
 return selected;
};
const MARKER_LIVE_MS=140;
const markerAge=(id:number,now=performance.now())=>now-(markerLastConfirmed.get(id)??-Infinity);
const liveMarkers=()=>observations.filter(m=>markerAge(m.id)<=MARKER_LIVE_MS);
function pruneMarkers(){observations=observations.filter(m=>markerAge(m.id)<=MARKER_LIVE_MS);}

let observationsAt=0;
const trackingHoldMs=650;
const rotationStates=new Map<'needleDriver'|'forceps'|'scissors',{face:number;rawAnchor:THREE.Quaternion;outputAnchor:THREE.Quaternion;accumulatedRoll:number;faceRoll:number}>();
// Rotation-only rigid-body state. Never used to accept/reject translation.
const rotationSources=new Map<InstrumentName,'mono'|'stereo'>();
const faceTransitionStates=new Map<InstrumentName,{faceId:number;candidateId:number|null;candidateCount:number}>();
const rigidBodyStates=new Map<'needleDriver'|'forceps'|'scissors',{
 anchorRaw:THREE.Quaternion;anchorOutput:THREE.Quaternion;lastRaw:THREE.Quaternion;lastAt:number;pose:PrismPose;stallSince:number|null;status:'tracking'|'stalled'|'reacquiring';angularVelocity:THREE.Vector3
}>();
const depthStates=new Map<'needleDriver'|'forceps'|'scissors',number>();
const monoDepthFilters=new Map<InstrumentName,MonocularDepthFilter>();
const sizeDepthCalibration=new SizeDepthCalibration();
const sizeDepthFrames=new Map<InstrumentName,(SizeDepthAnchor&{at:number;distanceMm:number})[]>();
const sizeDepthFaces=new Map<InstrumentName,number>();
const stableDepth=document.querySelector<HTMLInputElement>('#stable-depth')!;
stableDepth.addEventListener('change',()=>{monoDepthFilters.clear();depthStates.clear();});
const DEPTH_STORAGE_KEY=TRACKING_STORAGE_KEYS.depthCalibration;
const depthBinding=()=>`${stream?.getVideoTracks()[0]?.getSettings().deviceId??select.value}|${trackerType}${trackerType==='prism'?'':':marker'+trackerGeometry(trackerType).markerSizeMm+'mm:layout'+RING_LAYOUT_REVISION}|${video.videoWidth&&video.videoHeight?(video.videoWidth/video.videoHeight).toFixed(3):'off'}`;
let depthNearMm:number|null=null,depthFarMm:number|null=null;
function saveDepthCalibration(){
 const saved:SavedDepthCalibration={near:depthNearMm,far:depthFarMm,range:Number(workingDepthInput.value)||DEFAULT_WORKING_DEPTH_MM,size:sizeDepthCalibration};
 writeStored(DEPTH_STORAGE_KEY,JSON.stringify(saved));
}
function restoreDepthCalibration(){
 const saved=readStoredJson(DEPTH_STORAGE_KEY);if(saved===undefined)return;
 const value=parseDepthCalibration(saved);
 if(value.range!==undefined)workingDepthInput.value=String(value.range);
 // Near/Far are only meaningful with the size calibration they were captured with.
 if(!sizeDepthCalibration.restore(value.size))return;
 if(value.near!==undefined)depthNearMm=value.near;
 if(value.far!==undefined)depthFarMm=value.far;
}
restoreDepthCalibration();
const depthHistory=new Map<'needleDriver'|'forceps'|'scissors',number[]>();
const depthHistoryStamps=new Map<InstrumentName,number>();
const poseHistory=new Map<'needleDriver'|'forceps'|'scissors',THREE.Quaternion[]>();
type RotationGeometryState={face:number;reference:{x:number;y:number}[];last:{x:number;y:number}[];moving:boolean;pending:number;still:number};
const rotationGeometryStates=new Map<'needleDriver'|'forceps'|'scissors',RotationGeometryState>();
const depthSamples=new Map<'needleDriver'|'forceps'|'scissors',number>();
function depthRangeLabel(){
 const ready=sizeDepthCalibration.near?.binding===depthBinding();
 depthRangeStatus.textContent=!sizeDepthCalibration.near?'Hold the selected instrument still at Near, then Far. A reasonably face-on marker is required.':!ready?'Start the same camera and tracker geometry, or capture Near/Far again.':!sizeDepthCalibration.far?'Near size captured. Move the same instrument farther away and capture Far.':'Near/Far tilt-corrected marker sizes calibrated. Edge-on markers hold the last depth.';
}
function resetDepthFilters(){depthStates.clear();monoDepthFilters.clear();stationaryStates.clear();depthHistory.clear();depthHistoryStamps.clear();}
function captureSizeDepth(){
 const name=(document.querySelector<HTMLElement>('[data-calibration-tool][aria-pressed="true"]')?.dataset.calibrationTool??'needleDriver') as InstrumentName;
 const frames=(sizeDepthFrames.get(name)??[]).filter(s=>performance.now()-s.at<500&&s.binding===depthBinding());
 if(trackingMode.value!=='mono'||!filterMeasurements.get(name)?.valid||frames.length<4){depthRangeStatus.textContent=`Show a face-on ${name} marker in camera 1 and hold still before capturing.`;return null;}
 const sorted=[...frames].sort((a,b)=>a.proxy-b.proxy),middle=sorted[Math.floor(sorted.length/2)];
 if((sorted.at(-1)!.proxy-sorted[0].proxy)/middle.proxy>.12){depthRangeStatus.textContent='Hold the instrument steady at this distance, then retry.';return null;}
 return middle;
}
workingDepthInput.addEventListener('change',()=>{sizeDepthCalibration.far=null;depthFarMm=null;resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#set-depth-near')!.addEventListener('click',()=>{const sample=captureSizeDepth();if(!sample)return;sizeDepthCalibration.setNear(sample);depthNearMm=sample.distanceMm;depthFarMm=null;resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#set-depth-far')!.addEventListener('click',()=>{const sample=captureSizeDepth();if(!sample)return;if(!sizeDepthCalibration.setFar(sample)){depthRangeStatus.textContent='Capture Near first, then move the same instrument clearly farther away using the same camera and tracker.';return;}depthFarMm=sample.distanceMm;workingDepthInput.value=String(Math.round(depthFarMm-depthNearMm!));resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
document.querySelector('#reset-depth-range')!.addEventListener('click',()=>{sizeDepthCalibration.near=sizeDepthCalibration.far=null;depthNearMm=depthFarMm=null;workingDepthInput.value='400';resetDepthFilters();saveDepthCalibration();depthRangeLabel();});
trackerTypeSelect.addEventListener('change',depthRangeLabel);
const rotationFilterStates=new Map<'needleDriver'|'forceps'|'scissors',{anchor:THREE.Quaternion;pending:number;moving:boolean}>();
const filterMeasurements=new Map<'needleDriver'|'forceps'|'scissors',{rawZ:number;filteredZ:number;angle:number;locked:boolean;source:string;valid:boolean}>();
const stationaryStates=new Map<InstrumentName,MarkerRestLatch>();
const liveTargets=new Map<'needleDriver'|'forceps'|'scissors',{position:THREE.Vector3;quaternion:THREE.Quaternion;lastSeen:number;id:number;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}>();
let detectorReady=false,processing=false,lastDetection=0,cameraSession=0;
let idleNoMarkers=true,skippedFrames=0,renderFrames=0,renderFps=0,lastFpsTime=performance.now();
const motionCanvas=document.createElement('canvas');motionCanvas.width=64;motionCanvas.height=36;
const motionCtx=motionCanvas.getContext('2d',{willReadFrequently:true})!;
let motionPrevious:Uint8Array|null=null;
function changedFrame(source:HTMLVideoElement){motionCtx.drawImage(cameraImage(source),0,0,64,36);const data=motionCtx.getImageData(0,0,64,36).data;const next=new Uint8Array(64*36);let changed=0;for(let i=0;i<next.length;i++){const p=i*4;next[i]=(data[p]*3+data[p+1]*6+data[p+2])/10;if(motionPrevious&&Math.abs(next[i]-motionPrevious[i])>24)changed++;}motionPrevious=next;return changed>32;}

let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value||savedCamera(CAMERA_STORAGE_PRIMARY);fillCameraSelect(select,await availableCameras(),current,'Default camera');}catch{ /* permission or unsupported */ }
}
async function stopCamera(){stripedMotion[0].clear();cancelJointJaws('Capture cancelled: camera 1 stopped.');resetTrackerPose();stereoPositions.clear();cameraSession++;detector.dispose();fastTracker.dispose();fastProcessing=false;lastFastFrame=0;lastSlowFrame=0;latestFlowAt=0;latestDecodeAt=0;lastAppliedFrameAt=0;staleDecodeDrops=0;detectorReady=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;observations=[];observationsAt=0;liveTargets.clear();stationaryStates.clear();rotationStates.clear();rotationFilterStates.clear();depthStates.clear();overlayContext.clearRect(0,0,overlay.width,overlay.height);start.disabled=false;stop.disabled=true;document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='';status.textContent='Camera stopped.';renderCameraSettings();markerReadout.textContent='Camera stopped';diag('note').textContent='Camera stopped';}
async function startPrimaryCamera(){
 try {await stopCamera();detectorReady=false;stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();renderCameraSettings();depthRangeLabel();document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='none';framesAnalyzed=0;detectorFpsWindow=performance.now();detectorFpsCount=0;diag('frames').textContent='0';diag('detection-fps').textContent='0';const settings=stream.getVideoTracks()[0]?.getSettings();diag('resolution').textContent=`${video.videoWidth} × ${video.videoHeight} camera · tracking ≤960px wide${settings?.frameRate?' · '+Math.round(settings.frameRate)+' fps':''}`;start.disabled=true;stop.disabled=false;status.textContent='Camera running. Loading marker detector…';const session=cameraSession;await Promise.all([detector.initialize(),fastTracker.initialize(true)]);if(session!==cameraSession)return;detectorReady=true;status.textContent='Live ArUco detection running. Hold a marker in view.';await refreshCameras();await refreshSecondCameraList();renderCameraSettings();status2.textContent='Camera 2 is optional for now.';}
 catch(e){status.textContent=`Camera error: ${e instanceof Error?e.message:String(e)}`;throw e;}
}
start.addEventListener('click',()=>{void startPrimaryCamera();});
stop.addEventListener('click',stopCamera);
select.addEventListener('change',()=>{rememberCamera(CAMERA_STORAGE_PRIMARY,select.value);if(stream)void stopCamera();});
void refreshCameras();
const embeddedTracking=window.parent!==window||root.dataset.embedded==='true';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x15242c);
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,4.5,7.6);camera.lookAt(0,0,0);
// Embedded tracking publishes poses into the main scene; it needs no second GPU context.
const renderer=embeddedTracking?null:new THREE.WebGLRenderer({antialias:true});
renderer?.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
const mount=document.querySelector<HTMLElement>('#tracking-scene')!;
if(embeddedTracking)mount.style.display='none';else if(renderer)mount.append(renderer.domElement);
const orbit=renderer?new OrbitControls(camera,renderer.domElement):null;
if(orbit){orbit.enableDamping=true;orbit.minDistance=1.4;orbit.maxDistance=18;orbit.target.set(0,.5,0);orbit.update();}
document.querySelector<HTMLButtonElement>('#reset-view')!.addEventListener('click',()=>{camera.position.set(0,3.7,6);orbit?.target.set(0,.5,0);orbit?.update();});
scene.add(new THREE.HemisphereLight(0xffffff,0x63788a,2));
const grid=new THREE.GridHelper(5,10,0x527d85,0x304852);scene.add(grid);
const previewInstrumentModels=new Map<'left'|'right',Instrument>();
function instrument(id:'left'|'right',color:number){
 const model=new Instrument(id,color);
 previewInstrumentModels.set(id,model);
 if(id==='right')model.setDriverStyle('castro');
 const group=new THREE.Group();
 // Instrument.reset() positions/rotates the model for the main game.
 // In tracking, the parent group's origin is the measured prism center/tip.
 model.root.position.set(0,0,0);
 // Shared mounting transform keeps the neutral handle up and tip down.
 model.root.quaternion.copy(trackedInstrumentRotation());
 model.root.scale.setScalar(.72);
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
 const pivot=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),steel);pivot.position.z=.72;group.add(pivot);group.scale.setScalar(.8);// Scissors are also modeled along +Z; use the same shaft alignment.
 group.quaternion.copy(trackedInstrumentRotation());
 const tracked=new THREE.Group();tracked.add(group);tracked.position.y=.25;scene.add(tracked);return tracked;
}
const scissors=scissorsModel();
function previewScissorOpening(value:number){
 const model=scissors.children[0] as THREE.Group;
 // The preview's blade and ring meshes are siblings; rotate each blade pair around its pivot.
 for(const side of [-1,1]){
  const blade=model.children[side===-1?1:4] as THREE.Mesh;
  if(blade instanceof THREE.Mesh)blade.rotation.y=side*(.03+value*.3);
 }
}
driver.position.z=-.85;forceps.position.z=.15;scissors.position.z=1.05;
const keys=new Set<string>();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelector('#reset-sim')!.addEventListener('click',()=>{resetTrackerPose();driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.15);scissors.position.set(0,.25,1.05);});
/** Map webcam coordinates to the virtual scene. This is a visual mapping, not calibrated world-space tracking. */
function updateLiveTargets(){
 if(!overlay.width||!overlay.height)return;
 const now=observationsAt||performance.now();
 for(const name of ['needleDriver','forceps','scissors'] as const){
  const ids:readonly number[]=markerGroups()[name];
  const candidates=liveMarkers().filter(m=>ids.includes(m.id)).map(marker=>{
   const pose=estimateMarkerPose(marker,overlay.width,overlay.height,trackerGeometry(trackerType).markerSizeMm);
   return pose?{marker,pose}:null;
  }).filter((item):item is {marker:MarkerObservation;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}=>item!==null);
  candidates.sort((a,b)=>a.pose.reprojectionError-b.pose.reprojectionError);
  const previous=liveTargets.get(name);
  // PR #67 face selection: prefer a stable, well-fitting face instead of
  // switching IDs based on marker area on every frame.
  const chosen=(previous&&candidates.find(c=>c.pose.id===previous.id&&c.pose.reprojectionError<4))||candidates[0];
  if(!chosen)continue;
  let rest=stationaryStates.get(name);if(!rest){rest=new MarkerRestLatch();stationaryStates.set(name,rest);}
  const stationary=rest.observe(candidates.map(c=>c.marker),now);

  // Pose reprojection error gates rotation confidence, not marker-center translation.
  // Optical flow can track a valid 2D square even when the planar 3D fit is poor.
  const {pose}=chosen;
  // Translation comes directly from the displayed marker quadrilateral, not PnP pose.
  // The size-derived distance is approximate until camera intrinsics are calibrated.
  const markerCenter={x:chosen.marker.corners.reduce((sum,p)=>sum+p.x,0)/4,y:chosen.marker.corners.reduce((sum,p)=>sum+p.y,0)/4};
  const sideLengths=chosen.marker.corners.map((p,i)=>Math.hypot(p.x-chosen.marker.corners[(i+1)%4].x,p.y-chosen.marker.corners[(i+1)%4].y));
  const markerSidePx=sideLengths.reduce((sum,n)=>sum+n,0)/4;
  if(markerSidePx<2)continue;
  const focalPx=overlay.width/(2*Math.tan(70*Math.PI/360/2));
  const sizeDistance=trackerGeometry(trackerType).markerSizeMm*focalPx/markerSidePx;
  // First step toward rigid-body pose: estimate orientation and distance
  // together from the same four corners. A tilted face looks smaller even
  // when its actual depth is unchanged, so side length alone is misleading.
  // Only trust perspective-corrected depth when the planar fit is good.
  // Translation on screen still follows the observed marker center.
  const bodyPose=bodyPoseFromMarker(pose,ids.indexOf(pose.id),trackerType);
  const poseDepthValid=Number.isFinite(bodyPose.translation.z)&&bodyPose.translation.z>20&&pose.reprojectionError<2.5;
  // Use the tracker center, not whichever radial face happens to be visible.
  // The planar fit accounts for foreshortening; the downstream filter handles noise.
  const estimatedDistance=poseDepthValid?bodyPose.translation.z:sizeDistance;
  // A poor planar fit does not invalidate the recognized square's size.
  // Keep approximate depth usable; the temporal filter still rejects spikes.
  let depthInputValid=Number.isFinite(estimatedDistance)&&estimatedDistance>20;
  let depthSource=poseDepthValid?'3D pose':'marker size';
  const rawDistance=stationary?(depthHistory.get(name)?.at(-1)??estimatedDistance):estimatedDistance;
  // Camera-relative X/Y continue to follow the green-square center.
  // Depth is corrected for face orientation when the fit supports it.
  const samples=depthHistory.get(name)??[];
  if(depthHistoryStamps.get(name)!==now){samples.push(rawDistance);if(samples.length>5)samples.shift();depthHistory.set(name,samples);depthHistoryStamps.set(name,now);}
  const sorted=[...samples].sort((a,b)=>a-b);
  const measuredDistance=sorted[Math.floor(sorted.length/2)];
  let depthDistance=measuredDistance;
  const binding=depthBinding();
  if(trackingMode.value==='mono'){
   const options=candidates.flatMap(c=>{
    const measured=tiltCorrectedSize(c.marker,overlay.width,overlay.height,focalPx);if(!measured)return [];
    const body=bodyPoseFromMarker(c.pose,ids.indexOf(c.pose.id),trackerType);
    const offset=c.pose.position.z-body.translation.z;
    const proxy=trackerGeometry(trackerType).markerSizeMm/measured.normalizedSide-offset/(focalPx/overlay.width);
    return Number.isFinite(proxy)&&proxy>0?[{...measured,proxy,id:c.marker.id}]:[];
   }).sort((a,b)=>b.cosine-a.cosine);
   const best=options[0],old=options.find(c=>c.id===sizeDepthFaces.get(name));
   const selected=old&&best&&old.cosine>=best.cosine-.12?old:best;
   depthInputValid=!!selected;
   if(selected){
    sizeDepthFaces.set(name,selected.id);
    const frames=sizeDepthFrames.get(name)??[];
    const proxy=stationary&&frames.at(-1)?.binding===binding?frames.at(-1)!.proxy:selected.proxy;
    if(frames.at(-1)?.at!==now){frames.push({proxy,normalizedSide:selected.normalizedSide,binding,instrument:name,at:now,distanceMm:proxy*focalPx/overlay.width});}
    while(frames.length>8||frames.length&&now-frames[0].at>500)frames.shift();sizeDepthFrames.set(name,frames);
    const median=[...frames].sort((a,b)=>a.proxy-b.proxy)[Math.floor(frames.length/2)];
    depthDistance=median.distanceMm;
    depthSource='tilt-corrected marker size';
   }else{depthDistance=depthSamples.get(name)??measuredDistance;depthSource='depth held · marker too tilted or small';}
  }
  depthSamples.set(name,depthDistance);
  const matches=sizeDepthCalibration.near?.binding===binding;
  const near=matches?(depthNearMm??100):100;
  const range=matches&&depthFarMm!==null&&depthNearMm!==null?depthFarMm-depthNearMm:Math.max(50,Number(workingDepthInput.value)||400);

  const previousZ=depthStates.get(name);
  const lockedDepth=trackingMode.value==='mono'&&instrumentCalibration.profile(name).depthLock;
  const baseline=name==='needleDriver'?-.65:name==='forceps'?.15:1.05;
  const fraction=sizeDepthCalibration.fraction(depthDistance/(focalPx/overlay.width),binding);
  const desiredZ=fraction===null?mapMonocularDepth(depthDistance,near,range,Number(depthSensitivity.value)):(-2.3+fraction*4.6)*Number(depthSensitivity.value);
  let filter=monoDepthFilters.get(name);if(!filter){filter=new MonocularDepthFilter();monoDepthFilters.set(name,filter);}
  let z:number;
  if(trackingMode.value==='mono'&&(stableDepth.checked||lockedDepth))z=filter.update(desiredZ,now,lockedDepth,baseline,depthInputValid);
  else {const delta=previousZ===undefined?0:desiredZ-previousZ;z=previousZ===undefined?desiredZ:previousZ+delta*(Math.abs(delta)>.12?.65:.25);}
  depthStates.set(name,z);filterMeasurements.set(name,{rawZ:depthDistance,filteredZ:z,angle:filterMeasurements.get(name)?.angle??0,locked:lockedDepth,source:depthSource,valid:depthInputValid});
  // Perspective-correct camera-space X/Y, scaled against the same depth reference.
  const x=THREE.MathUtils.clamp(-((markerCenter.x-overlay.width/2)*measuredDistance/focalPx)/Math.max(near+range*.5,1)*7,-2.6,2.6);
  const y=THREE.MathUtils.clamp(-((markerCenter.y-overlay.height/2)*measuredDistance/focalPx)/Math.max(near+range*.5,1)*4+.55,.15,2.8);
  // Match simulator world axes: camera horizontal -> scene X, camera vertical
  // -> scene Y, and camera depth -> scene Z. Do not swap horizontal and depth:
  // doing so makes a left/right physical movement appear forward/back.
  const position=new THREE.Vector3(x,y,z);
  if(stationary&&previous&&now-previous.lastSeen<700&&rigidBodyStates.has(name)){
   // Holding still is exactly when overlap alignment should accumulate.
   // The rest latch must not skip those calibration observations.
   let alignedStatus='';
   if(trackerType==='ring8'&&trackingMode.value==='mono'){
    let tracker=ringPoseTrackers.get(name);if(!tracker){tracker=new RingPoseTracker();ringPoseTrackers.set(name,tracker);}
    tracker.solve(liveMarkers().filter(m=>ids.includes(m.id)&&performance.now()-(markerLastDecoded.get(m.id)??-Infinity)<350),ids[0],overlay.width,overlay.height,now,rigidBodyStates.get(name)?.pose);
    alignedStatus=' · '+tracker.status;
   }
   // Recognition and overlap indicators keep updating; an unchanged shared
   // face is evidence that a different face count is not physical movement.
   const state=rigidBodyStates.get(name);if(state){state.lastAt=now;state.angularVelocity.set(0,0,0);state.stallSince=null;}
   // Let a real depth move finish filtering after the instrument stops. The
   // held raw distance above prevents face-count changes from creating new depth.
   position.x=previous.position.x;position.y=previous.position.y;
   liveTargets.set(name,{...previous,position,lastSeen:now,id:chosen.pose.id,pose:chosen.pose});
   rotationStageStatus.set(name,'stationary image geometry · pose held');
   document.querySelector('#rotation-solver-status')!.textContent=name+' · stationary image geometry · pose held'+alignedStatus;
   continue;
  }

  // Independent rigid-body rotation: never gate or alter the working translation.
  const continuousFlowRotation=document.querySelector<HTMLInputElement>('#flow-rotation')!.checked&&trackingMode.value==='mono';
  // Baseline requires a recent decode. Experimental mode additionally uses
  // flow-confirmed corners while their identity remains recently decoded.
  const rotationMarkers=liveMarkers().filter(m=>ids.includes(m.id)&&
   performance.now()-(markerLastDecoded.get(m.id)??-Infinity)<(continuousFlowRotation?650:350));
  let state=rigidBodyStates.get(name);
  const faceTransitionEnabled=document.querySelector<HTMLInputElement>('#face-transition')!.checked&&trackingMode.value==='mono';
  const sideRotationMarkers=rotationMarkers.filter(m=>m.id<ids[0]+6);
  const selectedRotationMarkers=trackerType==='ring8'&&sideRotationMarkers.length?sideRotationMarkers:rotationMarkers;
  const currentFace=selectedRotationMarkers.length?selectedRotationMarkers.reduce((a,b)=>{
   const area=(m:MarkerObservation)=>Math.abs(m.corners.reduce((sum,p,i)=>{const next=m.corners[(i+1)%4];return sum+p.x*next.y-next.x*p.y;},0));
   return area(a)>=area(b)?a:b;
  }).id:null;
  // Solve all simultaneously visible prism faces as one rigid object.
  // Retain the last accepted pose as a solver seed, but never discard real
  // rotation by resetting the output anchor when the visible face changes.
  let predicted:PrismPose|undefined;
  if(state){
   const dt=Math.min(.09,Math.max(0,(now-state.lastAt)/1000));
   const step=state.angularVelocity.clone().multiplyScalar(dt);
   const angle=step.length();
   const q=state.lastRaw.clone();
   if(angle>1e-5)q.multiply(new THREE.Quaternion().setFromAxisAngle(step.normalize(),Math.min(angle,.45)));
   predicted={...state.pose,quaternion:q};
  }
  let ringTracker=ringPoseTrackers.get(name);
  if(trackerType==='ring8'&&!ringTracker){ringTracker=new RingPoseTracker();ringPoseTrackers.set(name,ringTracker);}
  const useAlignedRing=trackerType==='ring8'&&trackingMode.value==='mono';
  const monoRigid=perf.measure('Rigid pose solve',()=>useAlignedRing
   ?ringTracker!.solve(rotationMarkers,ids[0],overlay.width,overlay.height,now,state?.pose,predicted)
   :solvePrismPose(rotationMarkers,ids[0],overlay.width,overlay.height,state?.pose,predicted,trackerType));
  const stereoRigid=perf.measure('Stereo pose/synchronization',()=>stereoPrismRotation(name,performance.now()));
  // Stereo pose has a distinct camera-calibrated frame. Preserve the mono
  // solver's orientation state separately so switching modes cannot cause
  // an arbitrary camera-frame jump.
  const stereoUsable=!!stereoRigid;
  const rigid=stereoUsable?{
   quaternion:stereoRigid.quaternion,translation:monoRigid?.translation??new THREE.Vector3(),
   error:stereoRigid.errorPx,faces:Math.max(2,stereoRigid.faces)
  } as PrismPose:monoRigid;
  const rotationSource=stereoUsable?'stereo':'mono';
  const lastSource=rotationSources.get(name);
  if(rigid&&lastSource&&lastSource!==rotationSource){
   rigidBodyStates.delete(name);
   state=undefined;
  }
  if(rigid)rotationSources.set(name,rotationSource);
  if(rigid){rotationStageRaw.set(name,rigid.quaternion.clone());rotationStageStatus.set(name,'solver valid');}
  else{
   const message=useAlignedRing?ringTracker!.status:'no raw pose';rotationStageStatus.set(name,message);
   if(useAlignedRing)document.querySelector('#rotation-solver-status')!.textContent=name+' · '+message;
  }
  let quaternion=previous?.quaternion.clone()??new THREE.Quaternion();
  if(rigid){
   if(!state){
    rigidBodyStates.set(name,{anchorRaw:rigid.quaternion.clone(),anchorOutput:quaternion.clone(),lastRaw:rigid.quaternion.clone(),lastAt:now,pose:rigid,stallSince:null,status:'tracking',angularVelocity:new THREE.Vector3()});
    if(currentFace!==null)faceTransitionStates.set(name,{faceId:currentFace,candidateId:null,candidateCount:0});
   }else{
    const elapsed=Math.max(.016,Math.min(.15,(now-state.lastAt)/1000));
    const angularDifference=rigid.quaternion.angleTo(state.lastRaw);
    const depthMeasurement=filterMeasurements.get(name);if(depthMeasurement)depthMeasurement.angle=THREE.MathUtils.radToDeg(angularDifference);
    // A lone planar face can briefly return a mirrored solution. Prefer
    // continuity, but do not impose a hard angular ceiling on real motion.
    const staleMs=now-state.lastAt;
    const singleFaceLimit=Math.max(.35,elapsed*10);
    // Reacquire after a sufficiently large real rotation between observations. Do not freeze indefinitely because
    // the single-face angular gate was exceeded.
    const reacquire=staleMs>220&&rigid.error<(stereoUsable?4:5);
    // Fast face-to-face rolls can exceed the single-face velocity gate while
    // translation continues updating. Accept a well-fitted, freshly decoded
    // face immediately instead of holding rotation until the 220 ms timeout.
    // Keep the normal continuity gate for noisier optical-flow estimates.
    const freshDecodedFace=rotationMarkers.some(m=>performance.now()-(markerLastDecoded.get(m.id)??-Infinity)<110);
    const fastFaceTransition=!stereoUsable&&rigid.faces===1&&freshDecodedFace&&
     rigid.error<2.0&&angularDifference<Math.PI*.85;
    // Flow corner geometry can update between decodes. Accept only small,
    // well-fitted incremental rotations without waiting for the next ID decode.
    // Large single-face jumps still use the baseline face-transition gate.
    const flowIncrement=continuousFlowRotation&&!stereoUsable&&rigid.faces===1&&
     rigid.error<3&&angularDifference<Math.max(.55,elapsed*14)&&
     rotationMarkers.some(m=>markerAge(m.id)<100);
    // An ID-confirmed face switch can represent a genuine large prism roll.
    // Confirm the new face across two consecutive fresh observations and
    // require its fitted orientation to agree with predicted angular motion.
    // This path never bypasses the single-face error / mirror safeguards.
    let transition=faceTransitionStates.get(name);
    if(!transition&&currentFace!==null){
     transition={faceId:currentFace,candidateId:null,candidateCount:0};
     faceTransitionStates.set(name,transition);
    }
    const changedFace=!!transition&&currentFace!==null&&currentFace!==transition.faceId;
    const newFaceFresh=changedFace&&rotationMarkers.some(m=>m.id===currentFace&&
     performance.now()-(markerLastDecoded.get(m.id)??-Infinity)<180);
    if(transition){
     if(newFaceFresh){
      transition.candidateCount=transition.candidateId===currentFace?transition.candidateCount+1:1;
      transition.candidateId=currentFace;
     }else if(!changedFace){
      transition.candidateId=null;transition.candidateCount=0;
     }
    }
    const predictedDifference=predicted?rigid.quaternion.angleTo(predicted.quaternion):Infinity;
    const faceTransitionAccepted=faceTransitionEnabled&&!stereoUsable&&
     !!newFaceFresh&&!!transition&&transition.candidateCount>=2&&
     rigid.error<2.5&&predictedDifference<.85&&angularDifference<2.5;
    const credible=rigid.error<(stereoUsable?5:10)&&(stereoUsable||rigid.faces>=2||angularDifference<singleFaceLimit||fastFaceTransition||flowIncrement||faceTransitionAccepted||reacquire);
    document.querySelector<HTMLElement>('#rotation-solver-status')!.textContent=
     name+' · '+rotationSource+' · raw '+THREE.MathUtils.radToDeg(angularDifference).toFixed(1)+'° · '+rigid.faces+
     ' face(s) · error '+rigid.error.toFixed(1)+'px · '+(credible?(faceTransitionAccepted?'face transition accepted':fastFaceTransition?'fast face accepted':flowIncrement?'flow accepted':reacquire?'reacquired':'accepted'):(changedFace?'face transition pending':'angular gate rejected'))+(useAlignedRing?' · '+ringTracker!.status:'');
    rotationStageStatus.set(name,credible?'accepted':'rejected ('+rigid.faces+' faces, '+rigid.error.toFixed(1)+' error)');
    if(credible){
     if(transition&&currentFace!==null){transition.faceId=currentFace;transition.candidateId=null;transition.candidateCount=0;}
     // Track rotation in the prism's *local* coordinate frame. The virtual
     // models have their shafts aligned with local Y, just like the prism.
     // Postmultiplying the body-local delta makes prism roll rotate the
     // instrument about its shaft, regardless of how the prism is tilted.
     // Keep the instrument's existing tip pivot and stereo translation.
     const motion=state.lastRaw.clone().invert().multiply(rigid.quaternion).normalize();
     // Derive orientation from the absolute ring pose to avoid accumulated face-switch errors.
     quaternion.copy(state.anchorOutput).multiply(state.anchorRaw.clone().invert().multiply(rigid.quaternion)).normalize();
     const axis=new THREE.Vector3(motion.x,motion.y,motion.z);
     if(axis.lengthSq()>1e-9&&angularDifference<1.2){
      axis.normalize().multiplyScalar(angularDifference/elapsed*(motion.w<0?-1:1));
      state.angularVelocity.lerp(axis,.25);
      if(state.angularVelocity.length()>12)state.angularVelocity.setLength(12);
     }
     state.lastRaw.copy(rigid.quaternion);
     state.lastAt=now;
     state.pose=rigid;
     state.stallSince=null;
     state.status='tracking';
    }else{
     state.stallSince??=now;
     state.status='stalled';
     state.angularVelocity.multiplyScalar(.85);
    }
   }
  }else if(state){
   state.stallSince??=now;
   state.status='stalled';
   state.angularVelocity.multiplyScalar(.85);
  }
  liveTargets.set(name,{position,quaternion,lastSeen:now,id:pose.id,pose});
 }
}
// Diagnostic only: raw solver, accepted target and rendered mesh orientation.
// Each stage is relative to its own first sample; no tracking behavior changes.
const rotationStageRaw=new Map<InstrumentName,THREE.Quaternion>();
const rotationStageBaselines=new Map<string,THREE.Quaternion>();
const rotationStageStatus=new Map<InstrumentName,string>();
function stageAngles(name:InstrumentName,stage:string,q:THREE.Quaternion):string{
 const key=name+':'+stage;
 let base=rotationStageBaselines.get(key);
 if(!base){base=q.clone();rotationStageBaselines.set(key,base);}
 const relative=base.clone().invert().multiply(q);
 const e=new THREE.Euler().setFromQuaternion(relative,'XYZ');
 return [e.x,e.y,e.z].map(v=>THREE.MathUtils.radToDeg(v).toFixed(0).padStart(4)).join(' / ');
}
function updateRotationStageReadout(){
 const lines:string[]=['Relative XYZ Euler (pitch/yaw axes depend on model frame)'];
 for(const [name,mesh] of [['needleDriver',driver],['forceps',forceps],['scissors',scissors]] as const){
  const raw=rotationStageRaw.get(name),accepted=liveTargets.get(name);
  if(!raw&&!accepted)continue;
  lines.push(name+' · '+(rotationStageStatus.get(name)??'waiting'));
  lines.push(' raw      '+(raw?stageAngles(name,'raw',raw):'—'));
  lines.push(' accepted '+(accepted?stageAngles(name,'accepted',accepted.quaternion):'—'));
  lines.push(' rendered '+stageAngles(name,'rendered',mesh.quaternion));
 }
 const el=document.querySelector<HTMLElement>('#rotation-stage-readout');
 if(el)el.textContent=lines.join('\n');
}
// Experimental forceps jaw sensor: chromaticity-based two-color ball centroids.
// Operates on a downscaled camera frame to avoid interfering with ArUco workers.
const ballCanvas=document.createElement('canvas');ballCanvas.width=640;ballCanvas.height=360;
const ballContext=ballCanvas.getContext('2d',{willReadFrequently:true})!;
const ballColors:Array<[number,number,number]|null>=Array(6).fill(null);
const ballCenters:Array<{x:number;y:number;count:number}|null>=Array(6).fill(null);
const ballAnchors:Array<{x:number;y:number}|null>=Array(6).fill(null);
const ballSeenAt=Array(6).fill(0);
const ballDisplayColors:Array<string|null>=Array(6).fill(null);
const ballSampleBrightness=Array(6).fill(0);
const ballAnchorMarkers:Array<BallMarker|null>=Array(6).fill(null);
const ballPairStates:Array<{a:BallBlob;b:BallBlob;marker:BallMarker;seenAt:number}|null>=Array(3).fill(null);
const ballPairReferences:Array<BallPairReference|null>=Array(3).fill(null);
const ballPairValidAt=Array(3).fill(-Infinity);
const ballProvisional:Array<{ball:BallBlob;seenAt:number;marker:BallMarker|null}|null>=Array(6).fill(null);
const ballLastMarkers:Array<{marker:BallMarker;seenAt:number}|null>=Array(3).fill(null);
function recentBallMarker(pair:number,now:number,camera=0){
 const {ballLastMarkers,ballPairStates}=jawCameras[camera];
 const marker=ballMarker(ballNames[pair],now,camera);
 if(marker){ballLastMarkers[pair]={marker,seenAt:now};return marker;}
 const previous=ballLastMarkers[pair];
 return previous&&ballPairStates[pair]&&now-previous.seenAt<1000?previous.marker:null;
}
const ballInstrument=document.querySelector<HTMLSelectElement>('#ball-instrument')!;
const ballNames=BALL_INSTRUMENTS;
let needleBallMode:NeedleJawPattern=parseNeedleJawPattern(readStored(TRACKING_STORAGE_KEYS.needleJawPattern));
let stripedNeedle=needleBallMode!=='color';
const needlePair=ballNames.indexOf('needleDriver');
const isStripedSlot=(i:number)=>stripedNeedle&&Math.floor(i/2)===needlePair;
const stripedMotion=[new Map<number,BallMotionTracker>(),new Map<number,BallMotionTracker>()];
const stripedSearchWorkers=new Map<HTMLVideoElement,{worker:Worker;busy:boolean;timeout?:number;sequence:number}>();
const stripedJawDiagnostics=new Map<string,StripedBallDiagnostics>();
const stripedCropCanvas=document.createElement('canvas'),stripedCropContext=stripedCropCanvas.getContext('2d',{willReadFrequently:true})!;
const stripedStorageKey=(camera:number)=>patternJawStorageKey(camera,needleBallMode);
// Physical measurements from the center of each hexagonal marker tracker to the tip.
// Used only as a loose image-space association bound, not metric pose-to-tip calibration.
const trackerToTipMm={forceps:110,needleDriver:55,scissors:null} as const;
const ballIndex=()=>ballTrackingSlot(ballInstrument.value as BallInstrumentName,0);
const ballCalibrations=ballNames.map(()=>new JawCalibration());
const primaryJaws={video,overlay,overlayContext,ballCanvas,ballContext,ballColors,ballCenters,ballAnchors,ballSeenAt,ballDisplayColors,ballSampleBrightness,ballAnchorMarkers,ballPairStates,ballPairReferences,ballPairValidAt,ballProvisional,ballLastMarkers,ballCalibrations,lastScan:0,lastVideoTime:-1,lastJawFrame:-1};
const secondBallCanvas=document.createElement('canvas');secondBallCanvas.width=640;secondBallCanvas.height=360;
const secondaryJaws:typeof primaryJaws={...primaryJaws,video:video2,overlay:overlay2,overlayContext:overlayContext2,ballCanvas:secondBallCanvas,ballContext:secondBallCanvas.getContext('2d',{willReadFrequently:true})!,
 ballColors:ballColors.map(()=>null),
 ballCenters:ballCenters.map(()=>null),
 ballAnchors:ballAnchors.map(()=>null),
 ballSeenAt:ballSeenAt.map(()=>0),
 ballDisplayColors:ballDisplayColors.map(()=>null),
 ballSampleBrightness:ballSampleBrightness.map(()=>0),
 ballAnchorMarkers:ballAnchorMarkers.map(()=>null),
 ballPairStates:ballPairStates.map(()=>null),
 ballPairReferences:ballPairReferences.map(()=>null),
 ballPairValidAt:ballPairValidAt.map(()=>-Infinity),
 ballProvisional:ballProvisional.map(()=>null),
 ballLastMarkers:ballLastMarkers.map(()=>null),
 ballCalibrations:ballCalibrations.map(()=>new JawCalibration()),
};
const jawCameras=[primaryJaws,secondaryJaws];
const jawOverlays=jawCameras.map((state,i)=>{const canvas=document.createElement('canvas');canvas.id=i?'jaw-overlay-2':'jaw-overlay';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:2';canvas.setAttribute('aria-hidden','true');state.video.parentElement!.append(canvas);return canvas;});
const jawFusion=ballNames.map(()=>new JawViewFusion());
const jawViewStatus=ballNames.map(()=>'');
const selectedJawCamera=()=>jawCameras[Number(ballCamera.value)||0];
let jointJawCapture:{pair:number;targets:number[];snapshots:unknown[];revisions:number[]}|null=null;
function cancelJointJaws(message:string){
 if(!jointJawCapture)return;const group=jointJawCapture;jointJawCapture=null;
 group.targets.forEach((c,i)=>{const cal=jawCameras[c].ballCalibrations[group.pair];cal.restore(group.snapshots[i]);cal.cancel(message);});persistJaws();
}

function ballMarker(name:BallInstrumentName,now:number,camera=0):BallMarker|null{
 const ids:readonly number[]=markerGroups()[name];
 const view=camera===0?overlay:overlay2;
 const markers=(camera===0?observations:secondaryObservations).filter(m=>ids.includes(m.id)&&now-((camera===0?markerLastConfirmed:confirmed2).get(m.id)??-Infinity)<250&&now-((camera===0?markerLastDecoded:decoded2).get(m.id)??-Infinity)<650);
 if(!markers.length||!view.width)return null;
 const ranked=markers.map(m=>{const side=m.corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-m.corners[(i+1)%4].x,p.y-m.corners[(i+1)%4].y),0)/4;return {m,side};}).sort((a,b)=>b.side-a.side);
 const {m,side}=ranked[0],scale=640/view.width;
 if(!Number.isFinite(side)||side*scale<2)return null;
 return {x:m.corners.reduce((sum,p)=>sum+p.x,0)/4*scale,y:m.corners.reduce((sum,p)=>sum+p.y,0)/4*scale,side:side*scale};
}
function renderBallSwatches(){
 const {ballDisplayColors}=selectedJawCamera();
 for(let side=0;side<2;side++){
  const color=ballDisplayColors[ballTrackingSlot(ballInstrument.value as BallInstrumentName,side as 0|1)];
  const button=document.querySelector<HTMLButtonElement>(side===0?'#ball-pick-a':'#ball-pick-b')!;
  button.style.borderColor=color??'';button.style.boxShadow=color?`inset 0 -4px ${color}`:'';
 }
}
let ballPick=-1,ballPickCamera=0;
const ballCamera=document.querySelector<HTMLSelectElement>('#ball-camera')!;
const ballEnabled=document.querySelector<HTMLInputElement>('#ball-enable')!;
ballCamera.options[1].disabled=trackingMode.value!=='stereo';
const ballReadout=document.querySelector<HTMLElement>('#ball-readout')!;
for(let i=0;i<2;i++)document.querySelector<HTMLButtonElement>(i===0?'#ball-pick-a':'#ball-pick-b')!.addEventListener('click',()=>{
 ballPickCamera=Number(ballCamera.value)||0;if(!jawCameras[ballPickCamera].video.srcObject){ballReadout.textContent=`Start Camera ${ballPickCamera+1} before sampling colors.`;return;}ballEnabled.checked=true;
 ballPick=ballTrackingSlot(ballInstrument.value as BallInstrumentName,i as 0|1);
 ballReadout.textContent='Click the center of '+ballInstrument.selectedOptions[0].textContent+' ball '+(i===0?'A':'B')+' in the camera image';
 jawCameras.forEach((s,c)=>s.overlay.style.pointerEvents=c===ballPickCamera?'auto':'none');
});
ballCamera.addEventListener('change',()=>{ballPick=-1;jawCameras.forEach(s=>s.overlay.style.pointerEvents='none');renderBallSwatches();updateJawCalibrationStatus();});
ballInstrument.addEventListener('change',()=>{
 // Do not accidentally assign a pending click to an instrument selected earlier.
 ballPick=-1;jawCameras.forEach(s=>s.overlay.style.pointerEvents='none');renderBallSwatches();cancelJointJaws('Capture cancelled when changing instrument.');for(const cal of jawCameras.flatMap(s=>s.ballCalibrations))if(cal.capturing)cal.cancel('Capture cancelled when changing instrument. Measurements kept.');
});
for(const [camera,state] of jawCameras.entries()){
 const {video,overlay,ballCanvas,ballContext,ballColors,ballCenters,ballAnchors,ballSeenAt,ballDisplayColors,ballSampleBrightness,ballAnchorMarkers,ballPairStates,ballPairReferences,ballPairValidAt,ballProvisional,ballLastMarkers,ballCalibrations}=state;
 overlay.addEventListener('click',event=>{
 if(ballPick<0||camera!==ballPickCamera||!video.videoWidth)return;
 cancelJointJaws('Capture cancelled when reassigning balls.');
 ballCanvas.height=Math.max(1,Math.round(video.videoHeight/video.videoWidth*ballCanvas.width));
 const rect=overlay.getBoundingClientRect();
 const fit=Math.min(rect.width/ballCanvas.width,rect.height/ballCanvas.height);
 const x=Math.floor((event.clientX-rect.left-(rect.width-ballCanvas.width*fit)/2)/fit);
 const y=Math.floor((event.clientY-rect.top-(rect.height-ballCanvas.height*fit)/2)/fit);
 if(x<0||y<0||x>=ballCanvas.width||y>=ballCanvas.height)return;
 ballContext.drawImage(cameraImage(video),0,0,ballCanvas.width,ballCanvas.height);
 const data=ballContext.getImageData(0,0,ballCanvas.width,ballCanvas.height).data;
 let rgb=[0,0,0],n=0;
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=ballCanvas.width||yy>=ballCanvas.height)continue;
  const p=(yy*ballCanvas.width+xx)*4;for(let c=0;c<3;c++)rgb[c]+=data[p+c];n++;
 }
 rgb=rgb.map(v=>v/n);const total=rgb[0]+rgb[1]+rgb[2];
 if(total<70&&!isStripedSlot(ballPick)){ballReadout.textContent='Too dark; click the brightly colored center';return;}
 ballColors[ballPick]=isStripedSlot(ballPick)?[1/3,1/3,1/3]:[rgb[0]/total,rgb[1]/total,rgb[2]/total];
 ballDisplayColors[ballPick]=isStripedSlot(ballPick)?'rgb(245, 245, 245)':sampledBallColor(rgb);ballSampleBrightness[ballPick]=total;
 const pair=Math.floor(ballPick/2),marker=ballMarker(ballNames[pair],performance.now(),camera);
 stripedMotion[camera].delete(ballPick);
 ballAnchorMarkers[ballPick]=marker;ballProvisional[ballPick]=null;ballPairValidAt[pair]=-Infinity;ballPairStates[pair]=null;
 ballPairReferences[pair]=null;ballCalibrations[pair].reset();
 ballAnchors[ballPick]={x,y};ballCenters[ballPick]={x,y,count:1};ballSeenAt[ballPick]=performance.now();
 ballPick=-1;overlay.style.pointerEvents='none';renderBallSwatches();ballReadout.textContent=stripedNeedle&&ballInstrument.value==='needleDriver'?(needleBallMode==='white10'?'Center assigned; keep both white balls visible against a darker background, then calibrate closed/open.':'Center assigned; keep both striped balls visible, then calibrate closed/open. Bands need at least 14 image pixels across each ball.'):'Color assigned; keep both colored balls visible, then calibrate closed and open';persistJaws();
});
}

const ballSeparation=(pair:number,camera=0)=>{
 const {ballCenters,ballPairValidAt}=jawCameras[camera];
 const a=ballCenters[pair*2],b=ballCenters[pair*2+1];
 return performance.now()-ballPairValidAt[pair]<350&&a&&b?normalizedBallSeparation({...a,score:0},{...b,score:0}):null;
};
const jawDistance=document.querySelector<HTMLSelectElement>('#ball-calibration-distance')!;
const jawStatus=document.querySelector<HTMLElement>('#ball-calibration-status')!;
let savedJawRevision='',jawStorageFailed=false;
function jawRevision(){return jawCameras.flatMap(s=>s.ballCalibrations.map(c=>c.revision)).join(',');}
function persistJaws(){
 jawStorageFailed=false;
 jawCameras.forEach((state,camera)=>{
  const {ballColors,ballCenters,ballAnchors,ballSeenAt,ballDisplayColors,ballSampleBrightness,ballAnchorMarkers,ballPairStates,ballPairReferences,ballPairValidAt,ballProvisional,ballLastMarkers,ballCalibrations}=state,tools:SavedJawTracking['tools']={};
  for(let pair=0;pair<ballNames.length;pair++){
   const a=pair*2,b=a+1;
   tools[ballNames[pair]]={colors:[ballColors[a],ballColors[b]],displayColors:[ballDisplayColors[a],ballDisplayColors[b]],brightness:[ballSampleBrightness[a],ballSampleBrightness[b]],anchors:[ballAnchors[a],ballAnchors[b]],anchorMarkers:[ballAnchorMarkers[a],ballAnchorMarkers[b]],reference:ballPairReferences[pair],calibration:ballCalibrations[pair].snapshot()};
  }
  try{
   if(stripedNeedle){
    if(!saveJawTracking(localStorage,{version:1,enabled:ballEnabled.checked,tools:{needleDriver:tools.needleDriver}},stripedStorageKey(camera)))jawStorageFailed=true;
    tools.needleDriver=loadJawTracking(localStorage,jawStorageKey(camera))?.tools.needleDriver;
   }
   if(!saveJawTracking(localStorage,{version:1,enabled:ballEnabled.checked,tools},jawStorageKey(camera)))jawStorageFailed=true;
  }catch{jawStorageFailed=true;}
 });savedJawRevision=jawRevision();
}
function restoreJaws(){
 jawCameras.forEach((state,camera)=>{
  let saved:SavedJawTracking|null=null;try{saved=loadJawTracking(localStorage,jawStorageKey(camera));}catch{}
  if(!saved)return;if(saved.enabled)ballEnabled.checked=true;
  const {ballColors,ballCenters,ballAnchors,ballSeenAt,ballDisplayColors,ballSampleBrightness,ballAnchorMarkers,ballPairStates,ballPairReferences,ballPairValidAt,ballProvisional,ballLastMarkers,ballCalibrations}=state;
  for(let pair=0;pair<ballNames.length;pair++){
   const tool=stripedNeedle&&pair===needlePair?loadJawTracking(localStorage,stripedStorageKey(camera))?.tools.needleDriver:saved.tools[ballNames[pair]];if(!tool)continue;
   for(const side of [0,1] as const){const i=pair*2+side;ballColors[i]=tool.colors[side];ballDisplayColors[i]=tool.displayColors[side];ballSampleBrightness[i]=tool.brightness[side];ballAnchors[i]=tool.anchors[side];ballAnchorMarkers[i]=tool.anchorMarkers[side];}
   ballPairReferences[pair]=tool.reference;ballCalibrations[pair].restore(tool.calibration);
  }
 });savedJawRevision=jawRevision();renderBallSwatches();
}
restoreJaws();
/** Send a measured jaw opening (0 closed … 1 open) to the previews and the practice scene. */
function deliverJawOpening(name:BallInstrumentName,measured:number,cameras:number[]){
 const opening=instrumentCalibration.opening(name,measured);
 if(name==='forceps')previewInstrumentModels.get('left')?.setTrackedOpening(opening);
 if(name==='needleDriver')previewInstrumentModels.get('right')?.setTrackedOpening(opening);
 if(name==='scissors')previewScissorOpening(opening);
 publishTrackingMessage({type:TRACKING_MESSAGE.jawOpening,instrument:name,opening,cameras:cameras.map(c=>c+1),seenAt:Date.now()},embeddedTracking);
}
// New jaw tracker (src/jaw/). It reads camera-1 markers and solves its own
// tracker pose; instrument tracking state is never touched.
const markerJaws=mountMarkerJaws(document.querySelector<HTMLElement>('#ball-enable')!.closest('details')!,{
 video,overlay,trackerType:()=>trackerType,
 markers:(name,now)=>{const ids:readonly number[]=markerGroups()[name];return observations.filter(m=>ids.includes(m.id)&&now-(markerLastConfirmed.get(m.id)??-Infinity)<250&&now-(markerLastDecoded.get(m.id)??-Infinity)<650);},
 firstMarkerId:name=>markerGroups()[name][0],
 publish:(name,opening)=>deliverJawOpening(name,opening,[0]),
 // Camera 2 and the stereo calibration let jaws use the 3D ball-to-ball distance.
 second:{video:video2,overlay:overlay2,markers:(name,now)=>{const ids:readonly number[]=markerGroups()[name];return secondaryObservations.filter(m=>ids.includes(m.id)&&now-(confirmed2.get(m.id)??-Infinity)<250);}},
 stereoCalibration:()=>stereoActive()?stereoCalibration:null,
});
const needlePattern=document.querySelector<HTMLSelectElement>('#needle-ball-pattern')!;needlePattern.value=needleBallMode;
needlePattern.addEventListener('change',()=>{
 cancelJointJaws('Capture cancelled when changing ball pattern.');persistJaws();needleBallMode=parseNeedleJawPattern(needlePattern.value);stripedNeedle=needleBallMode!=='color';
 writeStored(TRACKING_STORAGE_KEYS.needleJawPattern,needlePattern.value);
 for(const motion of stripedMotion)motion.clear();
 for(const state of jawCameras){
  for(const i of [needlePair*2,needlePair*2+1]){state.ballColors[i]=null;state.ballCenters[i]=null;state.ballAnchors[i]=null;state.ballSeenAt[i]=0;state.ballDisplayColors[i]=null;state.ballSampleBrightness[i]=0;state.ballAnchorMarkers[i]=null;state.ballProvisional[i]=null;}
  state.ballPairStates[needlePair]=null;state.ballPairReferences[needlePair]=null;state.ballPairValidAt[needlePair]=-Infinity;state.ballLastMarkers[needlePair]=null;state.ballCalibrations[needlePair].reset();
 }
 jawFusion[needlePair]=new JawViewFusion();restoreJaws();ballInstrument.value='needleDriver';ballInstrument.dispatchEvent(new Event('change'));
 ballReadout.textContent=needleBallMode==='white10'?'Trial: assign the centers of both solid white 10 mm balls in each camera, use a dark background, then capture closed/open. Tracking uses the bright circular silhouette.':stripedNeedle?'Trial: assign the centers of both striped balls in each camera, then capture closed/open.':'Colored-ball profile restored.';
 updateJawCalibrationStatus();
});

function updateJawCalibrationStatus(){
 for(const state of jawCameras)for(const cal of state.ballCalibrations)cal.poll(performance.now());
 if(jointJawCapture){
  const group=jointJawCapture,cals=group.targets.map(c=>jawCameras[c].ballCalibrations[group.pair]);
  if(cals.some((c,i)=>!c.capturing&&c.revision===group.revisions[i]))cancelJointJaws('Capture could not complete in all configured camera views. Previous measurements kept.');
  else if(cals.every(c=>!c.capturing)){jointJawCapture=null;persistJaws();}
 }
 const cal=selectedJawCamera().ballCalibrations[ballIndex()/2];if(!jointJawCapture&&savedJawRevision!==jawRevision())persistJaws();
 jawStatus.textContent=`Camera ${Number(ballCamera.value)+1} · Near: closed ${cal.has('near','closed')?'✓':'—'} / open ${cal.has('near','open')?'✓':'—'} · Far: closed ${cal.has('far','closed')?'✓':'—'} / open ${cal.has('far','open')?'✓':'—'}. ${cal.message}${jointJawCapture?' Capturing configured camera views together.':''}${jawStorageFailed?' Browser storage unavailable; current session still works.':' Ball assignments and measurements save automatically in this browser.'}`;
 for(const endpoint of ['closed','open'] as const){const button=document.querySelector<HTMLButtonElement>('#ball-'+endpoint)!;button.disabled=!!jointJawCapture;button.textContent=`Capture ${endpoint} · ${jawDistance.value==='near'?'Near':'Far'} · ${trackingMode.value==='mono'?'Camera 1 only':'configured views'}`;}
}
for(const endpoint of ['closed','open'] as JawEndpoint[])document.querySelector('#ball-'+endpoint)!.addEventListener('click',()=>{
 const pair=ballIndex()/2,targets=jawCameras.flatMap((s,c)=>jawCameraParticipates(trackingMode.value,c)&&s.video.srcObject&&s.ballColors[pair*2]&&s.ballColors[pair*2+1]?[c]:[]);
 if(!targets.length||targets.some(c=>ballSeparation(pair,c)===null)){selectedJawCamera().ballCalibrations[pair].cancel(trackingMode.value==='mono'?'Both balls must be paired in Camera 1 to capture. Camera 2 is not needed.':'Both balls must be paired in each configured camera view to capture.');updateJawCalibrationStatus();return;}
 jointJawCapture={pair,targets,snapshots:targets.map(c=>jawCameras[c].ballCalibrations[pair].snapshot()),revisions:targets.map(c=>jawCameras[c].ballCalibrations[pair].revision)};
 for(const c of targets)jawCameras[c].ballCalibrations[pair].start(jawDistance.value as JawDistance,endpoint,performance.now());updateJawCalibrationStatus();
});
jawDistance.addEventListener('change',()=>{cancelJointJaws('Capture cancelled when changing distance. Measurements kept.');updateJawCalibrationStatus();});
document.querySelector('#ball-calibration-reset')!.addEventListener('click',()=>{cancelJointJaws('Capture cancelled.');for(const s of jawCameras)s.ballCalibrations[ballIndex()/2].reset();updateJawCalibrationStatus();});
ballEnabled.addEventListener('change',()=>{if(!ballEnabled.checked)cancelJointJaws('Capture cancelled: ball tracking is off.');persistJaws();});
trackingMode.addEventListener('change',()=>{
 cancelJointJaws('Capture cancelled when changing camera mode.');
 for(const motion of stripedMotion)motion.clear();
 for(let pair=0;pair<jawFusion.length;pair++){jawFusion[pair]=new JawViewFusion();jawViewStatus[pair]='';}
 ballCamera.options[1].disabled=trackingMode.value!=='stereo';
 if(trackingMode.value!=='stereo'&&ballCamera.value==='1'){ballCamera.value='0';ballCamera.dispatchEvent(new Event('change'));}
 updateJawCalibrationStatus();
});
setInterval(updateJawCalibrationStatus,150);updateJawCalibrationStatus();
function requestStripedReacquisition(video:HTMLVideoElement,slot:number,track:BallMotionTracker,plan:ReturnType<BallMotionTracker['plan']>,marker:BallMarker|null,at:number){
 let search=stripedSearchWorkers.get(video);
 if(!search){search={worker:new Worker(new URL('./input/stripedReacquireWorker.ts',import.meta.url),{type:'module'}),busy:false,sequence:0};stripedSearchWorkers.set(video,search);}
 if(search.busy)return;search.busy=true;track.startGlobal(at);
 const camera=video===video2?1:0,source=video.srcObject,scale=video.videoWidth/640,id=++search.sequence;
 const finish=()=>{search!.busy=false;if(search!.timeout)clearTimeout(search!.timeout);};
 search.worker.onmessage=({data})=>{
  if(data.id!==id)return;perf.sample('Striped full-frame reacquisition',performance.now()-at);finish();
  if(stripedMotion[camera].get(slot)!==track||video.srcObject!==source||!jawCameraParticipates(trackingMode.value,camera)||track.current(performance.now()))return;
  const other=stripedMotion[camera].get(slot%2?slot-1:slot+1)?.detection;
  const candidates=(data.found??[]).map((p:BallBlob)=>({...p,x:p.x/scale,y:p.y/scale,count:p.count/(scale*scale)})).filter((p:BallBlob)=>validJawBall(p,marker,trackerGeometry(trackerType).markerSizeMm,plan.ballRadius)&&(!other||Math.hypot(p.x-other.x,p.y-other.y)>plan.ballRadius));
  candidates.sort((a:BallBlob,b:BallBlob)=>Math.hypot(a.x-plan.center.x,a.y-plan.center.y)-Math.hypot(b.x-plan.center.x,b.y-plan.center.y));
  // A full-frame result is a hint. A new local camera frame must verify it
  // before showing a current detection or publishing another jaw sample.
  if(candidates[0])track.hint(candidates[0],marker,performance.now());
 };
 search.worker.onerror=finish;search.timeout=window.setTimeout(()=>{search!.worker.terminate();stripedSearchWorkers.delete(video);finish();},5000);
 void createImageBitmap(cameraImage(video)).then(bitmap=>{
  if(video.srcObject!==source){bitmap.close();finish();return;}
  search!.worker.postMessage({id,bitmap,radius:Math.max(plan.ballRadius,marker?marker.side*10/trackerGeometry(trackerType).markerSizeMm/2:0)*scale,center:{x:plan.center.x*scale,y:plan.center.y*scale},marker:marker?{x:marker.x*scale,y:marker.y*scale}:null,maxReach:marker?marker.side*(55/trackerGeometry(trackerType).markerSizeMm+4)*scale:Infinity},[bitmap]);
 }).catch(finish);
}
window.addEventListener('pagehide',()=>{for(const s of stripedSearchWorkers.values()){s.worker.terminate();if(s.timeout)clearTimeout(s.timeout);}stripedSearchWorkers.clear();},{once:true});
function searchStripedJawBall(video:HTMLVideoElement,center:{x:number;y:number},searchRadius:number,radius:number,slot:number,now:number,marker:BallMarker|null,guided=false){
 const camera=video===video2?1:0,state=jawCameras[camera];
 let track=stripedMotion[camera].get(slot);if(!track){track=new BallMotionTracker();stripedMotion[camera].set(slot,track);}
 const plan=track.plan(now,state.ballAnchors[slot]??center,marker,state.ballAnchorMarkers[slot],marker?marker.side*10/trackerGeometry(trackerType).markerSizeMm/2:radius);
 if(!guided){track.beginFrame(now);if(plan.fullFrame&&needleBallMode==='striped10')requestStripedReacquisition(video,slot,track,plan,marker,now);if(!track.shouldSearch(now)){stripedJawDiagnostics.set(`${camera}:${slot}`,{reason:plan.lostMs>1200?'Searching full frame':'Predicted position · searching locally',diameterPx:plan.ballRadius*video.videoWidth/320,contrast:0});return [];}}
 center=guided?center:plan.center;
 const scale=video.videoWidth/640,nativeRadius=plan.ballRadius*scale;
 const extent=Math.min((guided?searchRadius:plan.searchRadius)*scale,Math.max(60,nativeRadius*7))+nativeRadius*1.6;
 const left=Math.max(0,Math.floor(center.x*scale-extent)),top=Math.max(0,Math.floor(center.y*scale-extent));
 const width=Math.min(video.videoWidth-left,Math.ceil(extent*2)),height=Math.min(video.videoHeight-top,Math.ceil(extent*2));
 if(width<16||height<16)return [];
 stripedCropCanvas.width=width;stripedCropCanvas.height=height;
 stripedCropContext.drawImage(cameraImage(video),left,top,width,height,0,0,width,height);
 const diagnostic:StripedBallDiagnostics={reason:'Searching',diameterPx:nativeRadius*2,contrast:0};
 const pixels=stripedCropContext.getImageData(0,0,width,height).data,local={x:center.x*scale-left,y:center.y*scale-top};
 let balls:BallBlob[]=[];
 perf.measure('Striped jaw search',()=>{
  if(plan.silhouette||needleBallMode==='white10')balls=findSphereSilhouette(pixels,width,height,local,nativeRadius).map(p=>({...p,identified:true}));
  if(balls.length){diagnostic.reason='Current silhouette detection';diagnostic.diameterPx=2*Math.sqrt(balls[0].count/Math.PI);diagnostic.contrast=NaN;}
  else if(needleBallMode==='striped10')balls=findStripedBalls(pixels,width,height,local,nativeRadius,diagnostic).map(p=>({...p,identified:true}));
 });
 if(plan.lostMs>1200)diagnostic.reason='Searching full frame · '+diagnostic.reason;
 stripedJawDiagnostics.set(`${camera}:${slot}`,diagnostic);
 return balls.map(ball=>({...ball,x:(ball.x+left)/scale,y:(ball.y+top)/scale,count:ball.count/(scale*scale)})).filter(ball=>validJawBall(ball,marker,trackerGeometry(trackerType).markerSizeMm,plan.ballRadius));
}

function scanForcepsBalls(now:number,camera=0){
 if(!markerJaws.classicActive())return;
 if(!jawCameraParticipates(trackingMode.value,camera))return;
 const state=jawCameras[camera];
 const {video,ballCanvas,ballContext,ballColors,ballCenters,ballAnchors,ballSeenAt,ballDisplayColors,ballSampleBrightness,ballAnchorMarkers,ballPairStates,ballPairReferences,ballPairValidAt,ballProvisional,ballLastMarkers,ballCalibrations}=state;
 if(!ballEnabled.checked||!video.videoWidth||!video.srcObject||now-state.lastScan<90)return;
 const frame=frameClock(video),decoded=recordedInput()?.frameId(video)??video.getVideoPlaybackQuality?.().totalVideoFrames??0;
 const imageId=decoded>0?decoded:frame?.frameId;
 if(typeof video.requestVideoFrameCallback==='function'||decoded>0){
  if(video.paused||imageId===undefined){if(stripedNeedle){for(const i of [needlePair*2,needlePair*2+1])stripedMotion[camera].get(i)?.miss(now);ballCenters[needlePair*2]=ballCenters[needlePair*2+1]=null;ballPairValidAt[needlePair]=-Infinity;}return;}
  if(state.lastJawFrame===imageId)return;state.lastJawFrame=imageId;
 }else if(state.lastVideoTime===video.currentTime)return;
 state.lastVideoTime=video.currentTime;
 state.lastScan=now;const jawStarted=performance.now();
 const w=640,h=Math.max(1,Math.round(video.videoHeight/video.videoWidth*w));
 if(ballCanvas.height!==h)ballCanvas.height=h;
 const needsColor=ballColors.some((color,i)=>color&&!isStripedSlot(i));
 if(needsColor)ballContext.drawImage(cameraImage(video),0,0,w,h);
 const pixels=needsColor?ballContext.getImageData(0,0,w,h).data:new Uint8ClampedArray();
 const candidates:BallBlob[][]=Array.from({length:6},()=>[]);
 const markers=ballNames.map((_,pair)=>recentBallMarker(pair,now,camera));
 for(let c=0;c<6;c++){
  const color=ballColors[c],anchor=ballAnchors[c];
  const pair=Math.floor(c/2),marker=markers[pair];
  if(!color||!anchor)continue;
  const state=ballPairStates[pair],previous=state&&now-state.seenAt<600?(c%2===0?state.a:state.b):null;
  // Search around the last reliable position, not the entire frame.
  // Reacquire only near the original user-selected position after losing it.
  const provisional=ballProvisional[c],single=provisional&&now-provisional.seenAt<300?provisional:null;
  const from=previous?state!.marker:single?.marker??ballAnchorMarkers[c];
  const source=previous??single?.ball??anchor;
  const center=from&&marker?predictBall(source,from,marker):source;
  const radius=previous?100:single?110:marker?125:105;
  candidates[c]=isStripedSlot(c)?searchStripedJawBall(video,center,radius,previous?Math.sqrt(previous.count/Math.PI):marker?marker.side*10/trackerGeometry(trackerType).markerSizeMm/2:8,c,now,marker):findColorBalls(pixels,w,h,color,ballSampleBrightness[c],center,radius,previous?Math.max(10,Math.sqrt(previous.count/Math.PI)*3):0);
  const provisionalCandidate=candidates[c][0];
  if(provisionalCandidate)ballProvisional[c]={ball:provisionalCandidate,seenAt:now,marker};
 }
 for(let pair=0;pair<3;pair++){
  const marker=markers[pair],a=pair*2,b=a+1,cal=ballCalibrations[pair];
  if(marker&&!ballPairReferences[pair]&&ballAnchors[a]&&ballAnchors[b]){
   const pa=ballAnchorMarkers[a]?predictBall(ballAnchors[a]!,ballAnchorMarkers[a]!,marker):ballAnchors[a]!;
   const pb=ballAnchorMarkers[b]?predictBall(ballAnchors[b]!,ballAnchorMarkers[b]!,marker):ballAnchors[b]!;
   ballPairReferences[pair]=ballPairReference(pa,pb,marker);persistJaws();
  }
  const reference=ballPairReferences[pair];
  const prior=ballPairStates[pair];
  const expectedA=prior&&now-prior.seenAt<1500?prior.a:ballProvisional[a]?.ball??ballAnchors[a];
  const expectedB=prior&&now-prior.seenAt<1500?prior.b:ballProvisional[b]?.ball??ballAnchors[b];
  let found:{a:BallBlob;b:BallBlob}|null=null;
  if(marker&&reference)found=selectBallPair(candidates[a],candidates[b],marker,{...cal.limits,reference,trackerToTipMm:trackerToTipMm[ballNames[pair]]});
  if(!found&&marker&&reference&&expectedA&&expectedB){
   const predicted=(side:number)=>{
    if(prior&&now-prior.seenAt<1500)return predictBall(side===0?prior.a:prior.b,prior.marker,marker);
    const anchor=ballAnchors[a+side],from=ballAnchorMarkers[a+side];
    return anchor&&from?predictBall(anchor,from,marker):side===0?expectedA:expectedB;
   };
   const predictedA=predicted(0),predictedB=predicted(1);
   for(const side of [0,1]){
    const knownIndex=a+side,missingIndex=a+1-side,known=candidates[knownIndex][0];
    const color=ballColors[missingIndex];if(!known||!color)continue;
    const expectedKnown=side===0?predictedA:predictedB,expectedMissing=side===0?predictedB:predictedA;
    if(Math.hypot(known.x-expectedKnown.x,known.y-expectedKnown.y)>100)continue;
    const center=partnerSearchCenter(known,expectedKnown,expectedMissing);
    const radius=Math.min(64,Math.max(18,marker.side,Math.hypot(predictedA.x-predictedB.x,predictedA.y-predictedB.y)*.6));
    const recovered=isStripedSlot(missingIndex)?searchStripedJawBall(video,center,radius,marker.side*10/trackerGeometry(trackerType).markerSizeMm/2,missingIndex,now,marker,true):findColorBalls(pixels,w,h,color,ballSampleBrightness[missingIndex],center,radius,radius,.12);
    for(const candidate of recovered)if(!candidates[missingIndex].some(c=>Math.hypot(c.x-candidate.x,c.y-candidate.y)<2))candidates[missingIndex].push(candidate);
   }
   found=selectBallPair(candidates[a],candidates[b],marker,{...cal.limits,reference,trackerToTipMm:trackerToTipMm[ballNames[pair]]});
  }
  if(!found&&expectedA&&expectedB){
   let best=-Infinity;
   for(const aa of candidates[a])for(const bb of candidates[b]){
    const ra=Math.sqrt(aa.count/Math.PI),rb=Math.sqrt(bb.count/Math.PI);
    const separation=Math.hypot(aa.x-bb.x,aa.y-bb.y);
    if(separation<Math.max(3,(ra+rb)*.4)||Math.max(ra,rb)/Math.max(1,Math.min(ra,rb))>2.8)continue;
    const limits=cal.limits;if(limits.closed!==null&&limits.open!==null&&separation/(ra+rb)>Math.max(limits.closed,limits.open)*1.4+.5)continue;
    const travel=Math.hypot(aa.x-expectedA.x,aa.y-expectedA.y)+Math.hypot(bb.x-expectedB.x,bb.y-expectedB.y);
    if(travel>220)continue;
    const score=aa.score+bb.score-travel*.22;
    if(score>best){best=score;found={a:aa,b:bb};}
   }
  }
  if(!found&&stripedNeedle&&pair===needlePair){
   let individual=[candidates[a][0],candidates[b][0]];
   if(individual[0]&&individual[1]&&Math.hypot(individual[0].x-individual[1].x,individual[0].y-individual[1].y)<Math.sqrt(individual[0].count/Math.PI)){
    const predicted=[a,b].map(slot=>stripedMotion[camera].get(slot)?.plan(now,ballAnchors[slot]!,marker,ballAnchorMarkers[slot],marker?marker.side*10/trackerGeometry(trackerType).markerSizeMm/2:6).center??ballAnchors[slot]!);
    const da=Math.hypot(individual[0].x-predicted[0].x,individual[0].y-predicted[0].y),db=Math.hypot(individual[1].x-predicted[1].x,individual[1].y-predicted[1].y);
    individual=da<=db?[individual[0],undefined!]:[undefined!,individual[1]];
   }
   for(const side of [0,1]){const track=stripedMotion[camera].get(a+side),ball=individual[side];if(ball)track?.observe(ball,marker,now,!!(ball as BallBlob&{identified?:boolean}).identified);else track?.miss(now);}
   ballCenters[a]=ballCenters[b]=null;ballPairValidAt[pair]=-Infinity;continue;
  }
  if(!found){
   // Bridge only a brief gap in an already validated pair. Do not refresh its
   // timestamp: an occlusion must still expire, and held data is not a sample.
   if(prior&&now-prior.seenAt<250){ballCenters[a]=prior.a;ballCenters[b]=prior.b;}
   else {ballCenters[a]=ballCenters[b]=null;ballPairValidAt[pair]=-Infinity;}
   continue;
  }
  if(stripedNeedle&&pair===needlePair){
   for(const [slot,ball] of [[a,found.a],[b,found.b]] as const)stripedMotion[camera].get(slot)?.observe(ball,marker,now,!!(ball as BallBlob&{identified?:boolean}).identified);
  }
  const previous=ballPairStates[pair],blend=previous&&now-previous.seenAt<350?.38:1;
  const smooth=(next:BallBlob,old:BallBlob|undefined):BallBlob=>old?{...next,x:old.x*(1-blend)+next.x*blend,y:old.y*(1-blend)+next.y*blend}:next;
  const acceptedA=smooth(found.a,previous?.a),acceptedB=smooth(found.b,previous?.b);
  // Preserve the calibrated normalized distance by smoothing both centroids together.
  ballCenters[a]=acceptedA;ballCenters[b]=acceptedB;ballSeenAt[a]=ballSeenAt[b]=now;
  ballPairStates[pair]={a:acceptedA,b:acceptedB,marker:marker??prior?.marker??{x:(acceptedA.x+acceptedB.x)/2,y:(acceptedA.y+acceptedB.y)/2,side:40},seenAt:now};ballPairValidAt[pair]=now;
 }

 for(let pair=0;pair<3;pair++){
  const d=ballSeparation(pair,camera),cal=ballCalibrations[pair],a=ballCenters[pair*2],b=ballCenters[pair*2+1];
  if(d!==null&&a&&b){
   const scale=Math.sqrt(a.count/Math.PI)+Math.sqrt(b.count/Math.PI);
   const fresh=ballPairValidAt[pair]===now;
   if(fresh)cal.observe(d,scale,now,state.lastJawFrame>=0?state.lastJawFrame:video.currentTime);
   if(jointJawCapture?.pair===pair)continue;
   const value=fresh?cal.update(d,scale):cal.endpoints(scale)?cal.value:null;if(value===null)continue;
   const name=ballNames[pair];
   const fused=jawFusion[pair].update(camera,cal.value,ballPairValidAt[pair],Math.min(a.count,b.count),now);if(!fused)continue;
   jawViewStatus[pair]='Jaw view: '+fused.cameras.map(c=>'Camera '+(c+1)).join(' + ');
   deliverJawOpening(name,fused.opening,fused.cameras);
  }
 }
 if(camera!==(Number(ballCamera.value)||0)){perf.sample(`Camera ${camera+1} jaw color scan + calibration`,performance.now()-jawStarted);return;}
 const pair=ballIndex()/2,d=ballSeparation(pair,camera),cal=ballCalibrations[pair],a=ballCenters[pair*2],b=ballCenters[pair*2+1],ends=a&&b?cal.endpoints(Math.sqrt(a.count/Math.PI)+Math.sqrt(b.count/Math.PI)):null;
 ballReadout.textContent=ballNames[pair]+(stripedNeedle&&pair===needlePair?' · striped 10 mm trial':'')+' · tracker-to-tip '+(trackerToTipMm[ballNames[pair]]??'not measured')+' mm · A '+(ballCenters[pair*2]?'found':!ballColors[pair*2+1]&&ballProvisional[pair*2]&&now-ballProvisional[pair*2]!.seenAt<220?'acquiring':'missing')+
  ' · B '+(ballCenters[pair*2+1]?'found':!ballColors[pair*2]&&ballProvisional[pair*2+1]&&now-ballProvisional[pair*2+1]!.seenAt<220?'acquiring':'missing')+
  ' · '+(!ballColors[pair*2]||!ballColors[pair*2+1]?(stripedNeedle&&pair===needlePair?'assign both centers; dashed circles show individual tracking':'select both colors; dashed circles are individual tracking'):d===null?'pair rejected or missing':ballPairValidAt[pair]===now?'paired with instrument':'holding last jaw position · brief detection gap')+
  ' · normalized separation '+(d===null?'—':d.toFixed(2))+
  ' · closed '+(ends?.closed.toFixed(2)??'—')+' · open '+(ends?.open.toFixed(2)??'—')+
  ' · '+jawViewStatus[pair]+' · jaw '+(!ends?'not calibrated':Math.round(instrumentCalibration.opening(ballNames[pair],cal.value)*100)+'%');
 if(stripedNeedle&&pair===needlePair){
  const diagnostics=[0,1].map(side=>{const d=stripedJawDiagnostics.get(`${camera}:${pair*2+side}`);return d?`${side?'B':'A'}: ${d.reason} (${d.diameterPx.toFixed(0)} px across, ${Number.isFinite(d.contrast)?'contrast '+d.contrast.toFixed(0):'silhouette mode'})`:'';}).filter(Boolean);
  ballReadout.textContent+=' · '+diagnostics.join(' · ')+' · Initial ID: show bands from the side; need ≥14 camera pixels across each ball';
 }
 perf.sample('Jaw color scan + calibration',performance.now()-jawStarted);

}
function drawBallOutlines(camera=0){
 const {overlay:source,ballCanvas,ballPairValidAt,ballProvisional,ballCenters,ballDisplayColors,ballAnchors,ballAnchorMarkers,video}=jawCameras[camera];
 const overlay=jawOverlays[camera];if(overlay.width!==source.width||overlay.height!==source.height){overlay.width=source.width;overlay.height=source.height;}
 const overlayContext=overlay.getContext('2d')!;overlayContext.clearRect(0,0,overlay.width,overlay.height);
 if(!markerJaws.classicActive())return;
 if(!ballEnabled.checked||!video.srcObject||!jawCameraParticipates(trackingMode.value,camera))return;
 overlayContext.font='12px sans-serif';
 for(let i=0;i<6;i++){
  if(isStripedSlot(i)){
   const anchor=ballAnchors[i];if(!anchor)continue;
   const now=performance.now(),pair=Math.floor(i/2),marker=recentBallMarker(pair,now,camera),track=stripedMotion[camera].get(i),detection=track?.current(now);
   const plan=track?.plan(now,anchor,marker,ballAnchorMarkers[i],marker?marker.side*10/trackerGeometry(trackerType).markerSizeMm/2:6);
   const point=detection??plan?.center??(marker&&ballAnchorMarkers[i]?predictBall(anchor,ballAnchorMarkers[i]!,marker):anchor);
   const radius=detection?Math.sqrt(detection.count/Math.PI):plan?.ballRadius??6;
   const sx=overlay.width/ballCanvas.width,sy=overlay.height/ballCanvas.height,x=point.x*sx,y=point.y*sy;
   overlayContext.setLineDash(detection?[]:[4,5]);overlayContext.strokeStyle=detection?'#35dc87':'#a8adb5';overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.lineWidth=2;
   overlayContext.beginPath();overlayContext.arc(x,y,Math.max(5,radius*sx),0,Math.PI*2);overlayContext.stroke();
   if(!detection){overlayContext.beginPath();overlayContext.moveTo(x-4,y);overlayContext.lineTo(x+4,y);overlayContext.moveTo(x,y-4);overlayContext.lineTo(x,y+4);overlayContext.stroke();}
   overlayContext.fillText('needleDriver '+(i%2?'B':'A')+' · '+(detection?'Detected':plan?.stage??'Searching'),x+12,y);overlayContext.setLineDash([]);continue;
  }
  const pair=Math.floor(i/2),confirmed=performance.now()-ballPairValidAt[pair]<220;
  const provisional=ballProvisional[i];
  const detected=confirmed?ballCenters[i]:provisional&&performance.now()-provisional.seenAt<500?provisional.ball:null;
  const anchor=ballAnchors[i],marker=anchor?recentBallMarker(pair,performance.now(),camera):null;
  const assigned=anchor?(marker&&ballAnchorMarkers[i]?predictBall(anchor,ballAnchorMarkers[i]!,marker):anchor):null;
  const p=detected??(assigned?{...assigned,count:Math.PI*(marker?marker.side*(isStripedSlot(i)?10:7)/trackerGeometry(trackerType).markerSizeMm/2:6)**2}:null);
  if(!p)continue;
  // Individual acquisition remains visible but never supplies a jaw measurement.
  overlayContext.setLineDash(confirmed?[]:[5,4]);
  const x=p.x*overlay.width/ballCanvas.width,y=p.y*overlay.height/ballCanvas.height;
  overlayContext.beginPath();overlayContext.arc(x,y,Math.max(5,Math.sqrt(p.count/Math.PI)*overlay.width/ballCanvas.width),0,Math.PI*2);
  overlayContext.lineWidth=6;overlayContext.strokeStyle='rgba(0,0,0,.75)';overlayContext.stroke();
  overlayContext.lineWidth=3;overlayContext.strokeStyle=detected?(ballDisplayColors[i]??'#ffffff'):'#ffc35a';overlayContext.stroke();
  overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.fillText(ballNames[Math.floor(i/2)]+' '+(i%2===0?'A':'B')+(confirmed?'':detected?' · unpaired':' · assigned, not detected'),x+13,y);
  overlayContext.setLineDash([]);
 }
}
function drawCornerDebug(){
 if(!cornerDebug.checked)return;
 const now=performance.now();
 const drawCorners=(pts:MarkerObservation['corners'],color:string,pointsOnly=false)=>{
  overlayContext.strokeStyle=color;overlayContext.fillStyle=color;overlayContext.lineWidth=2;
  if(!pointsOnly){overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();overlayContext.stroke();}
  for(const p of pts){overlayContext.beginPath();overlayContext.arc(p.x,p.y,pointsOnly?4:3,0,Math.PI*2);overlayContext.fill();}
 };
 let recent=0;
 for(const [id,entry] of rawDecodedCorners){
  if(now-entry.receivedAt>650){rawDecodedCorners.delete(id);continue;}
  recent++;
  drawCorners(entry.marker.corners,'#00e5ff');
 }
 // These are the current live observations passed into the mono pose solver.
 for(const marker of liveMarkers())if(markerGroups().needleDriver.includes(marker.id)||markerGroups().forceps.includes(marker.id)||markerGroups().scissors.includes(marker.id))
  drawCorners(marker.corners,'#ffe34d',true);
 cornerDebugStatus.textContent=recent+' decoded marker(s) · cyan is from an earlier captured frame; compare while held still';
}
function drawDetections(){
 const overlayStarted=performance.now();
 const w=overlay.width,h=overlay.height;overlayContext.clearRect(0,0,w,h);
 pruneMarkers();
 for(const marker of observations){
  // A flow-only outline is not proof that the printed face is still visible.
  if(performance.now()-(markerLastDecoded.get(marker.id)??-Infinity)>650)continue;
  const pts=marker.corners;overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();const group=(Object.keys(markerGroups()) as Array<keyof typeof MARKER_GROUPS>).find(name=>(markerGroups()[name] as readonly number[]).includes(marker.id));const overlap=group&&verifiedMarkers().filter(m=>(markerGroups()[group] as readonly number[]).includes(m.id)).length>1;const stale=false;overlayContext.strokeStyle=stale?'#8b929c':overlap?'#ffc14d':'#18e89d';overlayContext.lineWidth=3;overlayContext.stroke();overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.font='bold 20px sans-serif';overlayContext.fillText((overlap?'OVERLAP ':'')+'ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));}
 drawBallOutlines();
 drawCornerDebug();
 perf.sample('Marker overlay drawing',performance.now()-overlayStarted);
 perf.measure('Pose estimation + filtering',updateLiveTargets);const uiStarted=performance.now();
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
  filterDiagnostics.textContent=(['needleDriver','forceps','scissors'] as const).map(name=>{const m=filterMeasurements.get(name);return m?`${name}: distance ${m.rawZ.toFixed(0)} mm · virtual Z ${m.filteredZ.toFixed(2)} · Δ rotation ${m.angle.toFixed(1)}° · ${m.locked?'stationary lock':m.valid?'tracking':'depth unavailable'} · depth from ${m.source}`:`${name}: waiting`;}).join(' | ');
  faceOverlapReadout.textContent=(Object.keys(markerGroups()) as Array<keyof typeof MARKER_GROUPS>).map(name=>{const visible=verifiedMarkers().filter(m=>(markerGroups()[name] as readonly number[]).includes(m.id)).map(m=>m.id);const geometry=trackerGeometry(trackerType);return `${name}: ${visible.length>1?'OVERLAP '+visible.join('+'):visible.length?'face '+visible[0]:'none'} · ${visible.length}/${geometry.faceCount} visible · ${THREE.MathUtils.radToDeg(geometry.sideStepRadians).toFixed(0)}° side spacing`;}).join(' | ');
 }
 perf.sample('Tracking status UI',performance.now()-uiStarted);
}
const roiDecodeToggle=document.querySelector<HTMLInputElement>('#roi-decode')!;
const primarySearch=new PredictiveDecodeSearch(),secondarySearch=new PredictiveDecodeSearch();
let snapshotBackend1='unknown',snapshotBackend2='unknown';
const captureCanvas=document.createElement('canvas');
const captureContext=captureCanvas.getContext('2d',{willReadFrequently:true})!;
let lastCamera1CaptureTime=-1,lastCamera1DecodeTime=-1,lastCamera2CaptureTime=-1,lastCamera2DecodeTime=-1;
let primaryCaptureAt=0;
function readFrame(context:CanvasRenderingContext2D,name:string,x:number,y:number,w:number,h:number){return perf.measure(name,()=>context.getImageData(x,y,w,h));}
const decodeCanvas=document.createElement('canvas');
const decodeContext=decodeCanvas.getContext('2d',{willReadFrequently:true})!;
async function detectFrame(now:number){
 if(!stream||!detectorReady||!video.videoWidth)return;
 scanForcepsBalls(now);
 perf.measure('Jaw tracking',()=>markerJaws.update(now));
 const clock=frameClock(video),fastDue=!fastProcessing&&now-lastFastFrame>=(clock?20:33);
 const doFast=fastDue&&(!clock||clock.fresh);if(fastDue&&!doFast)perf.count('Camera 1 duplicate flow requests skipped');
 // Run decode faster when flow has no usable marker; only one decode can be in flight.
 const recovering=idleNoMarkers||now-latestFlowAt>120;
 const decodeInterval=recovering||roiDecodeToggle.checked?65:110;
 const doSlow=!processing&&now-lastSlowFrame>=decodeInterval;
 if(processing)perf.count('Camera 1 decode busy checks');
 if(!doFast&&!doSlow)return;
 perf.tick('Camera 1 capture attempts');if(video.currentTime===lastCamera1CaptureTime)perf.count('Camera 1 duplicate captures');lastCamera1CaptureTime=video.currentTime;
 if(doSlow){if(video.currentTime===lastCamera1DecodeTime)perf.count('Camera 1 duplicate decodes');lastCamera1DecodeTime=video.currentTime;}
 const session=cameraSession;
 const scale=Math.min(1,960/video.videoWidth),w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);
 const nativeW=video.videoWidth,nativeH=video.videoHeight;
 const decodeScaleX=nativeW/w,decodeScaleY=nativeH/h;
 const toNative=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x*decodeScaleX,y:p.y*decodeScaleY}))}));
 const toFlow=(markers:MarkerObservation[]):MarkerObservation[]=>markers.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x/decodeScaleX,y:p.y/decodeScaleY}))}));
 if(frameCanvas.width!==w||frameCanvas.height!==h){frameCanvas.width=w;frameCanvas.height=h;overlay.width=w;overlay.height=h;}
 const snapshot=doSlow?perf.measure('Camera 1 video snapshot',()=>videoSnapshot(video,captureCanvas,captureContext)):null;
 if(snapshot){snapshotBackend1=snapshot.direct?'VideoFrame':'canvas fallback';if(!snapshot.direct)perf.count('Camera 1 snapshot fallback');}
 try{
 perf.measure('Camera 1 flow resize',()=>frameContext.drawImage(snapshot?.source??cameraImage(video),0,0,w,h));
 const frameCapturedAt=performance.now();primaryCaptureAt=frameCapturedAt;let preparedSeed:ImageData|undefined;
 if(doFast){
  fastProcessing=true;lastFastFrame=now;clock?.consume();
  const frame=readFrame(frameContext,'Camera 1 flow readback',0,0,w,h);
  if(doSlow)preparedSeed=perf.measure('Camera 1 flow seed copy',()=>copyFlowSeed(frame));
  const capturedAt=frameCapturedAt;
  void fastTracker.detect(frame).then(found=>{
   if(session!==cameraSession)return;
   perf.sample('Camera 1 flow frame age',performance.now()-capturedAt);fastFrames++;
   const stamp=performance.now();
   if(capturedAt<lastAppliedFrameAt)return;
   lastAppliedFrameAt=capturedAt;
   // A fresh optical-flow result supersedes the last decoder snapshot.
   // When flow fails, keep a recently decoded marker briefly, but never indefinitely.
   if(found.length){
    for(const m of found){
     const prev=flowMotion.get(m.id);
     const displacement=prev?m.corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-prev.corners[i].x,p.y-prev.corners[i].y),0)/4:0;
     const speed=prev?displacement/Math.max(1,stamp-prev.at):Infinity;
     flowMotion.set(m.id,{corners:m.corners.map(p=>({...p})),at:stamp,speed});
     markerLastConfirmed.set(m.id,stamp);
    }
    observations=found;observationsAt=stamp;latestFlowAt=stamp;stereoFrames.push(0,capturedAt,found);idleNoMarkers=false;detector.seed(toNative(found));drawDetections();}
   else {
     // A missing optical-flow frame must not erase a freshly decoded stationary marker.
     const decodedHold=observations.filter(m=>stamp-(markerLastDecoded.get(m.id)??-Infinity)<300);
     observations=decodedHold;stereoFrames.push(0,capturedAt,[]);
     for(const id of [...markerLastConfirmed.keys()])if(!decodedHold.some(m=>m.id===id))markerLastConfirmed.delete(id);
     for(const marker of decodedHold)markerLastConfirmed.set(marker.id,stamp);
     observationsAt=stamp;idleNoMarkers=decodedHold.length===0;
     lastSlowFrame=Math.min(lastSlowFrame,stamp-65);drawDetections();
    }
   if(stamp-fastWindow>=1000){
    diag('detection-fps').textContent=(fastFrames*1000/(stamp-fastWindow)).toFixed(1)+' flow / '+(slowFrames*1000/(stamp-fastWindow)).toFixed(1)+' decode';
    fastFrames=0;slowFrames=0;fastWindow=stamp;
   }
  }).catch(e=>{if(session===cameraSession)diag('note').textContent='Flow error: '+String(e);}).finally(()=>{fastProcessing=false;});
 }
 if(doSlow){
  processing=true;lastSlowFrame=now;
  const flowSeedFrame=preparedSeed??readFrame(frameContext,'Camera 1 flow readback',0,0,w,h);
  const region=primarySearch.plan(toNative(liveMarkers()),now,nativeW,nativeH,roiDecodeToggle.checked,Object.values(markerGroups()));
  const {left,top,width:regionW,height:regionH}=region,cropped=region.kind!=='full';
  perf.count('Camera 1 search '+region.kind);if(region.kind==='full')perf.count('Camera 1 full reason: '+region.reason);perf.count('Camera 1 searched pixels',regionW*regionH);
  if(decodeCanvas.width!==regionW||decodeCanvas.height!==regionH){decodeCanvas.width=regionW;decodeCanvas.height=regionH;}
  perf.measure('Camera 1 decode crop',()=>decodeContext.drawImage(snapshot!.source,left,top,regionW,regionH,0,0,regionW,regionH));
  const frame=readFrame(decodeContext,'Camera 1 decode readback',0,0,regionW,regionH);
  const capturedAt=frameCapturedAt;
  if(thresholdToggle.checked)renderThreshold(frame);
  if(cropToggle.checked)renderCrop(frame);
  void detector.detect(frame,{x:left,y:top}).then(nativeFound=>{
   const nativeMarkers=nativeFound.map(m=>({id:m.id,corners:m.corners.map(p=>({x:p.x+left,y:p.y+top}))}));
   const found=toFlow(nativeMarkers);
   if(session!==cameraSession)return;primarySearch.result(nativeMarkers);perf.sample('Camera 1 '+region.kind+' decode worker',detector.diagnostics.durationMs);
   if(cornerDebug.checked)for(const marker of found)rawDecodedCorners.set(marker.id,{marker,capturedAt,receivedAt:performance.now()});
   perf.sample('Camera 1 decode frame age',performance.now()-capturedAt);slowFrames++;framesAnalyzed++;
   diag('frames').textContent=String(framesAnalyzed);
   diag('candidates').textContent=detector.diagnostics.candidateCount===null?'Unavailable':String(detector.diagnostics.candidateCount);
   diag('outlines').textContent=String(detector.candidateCorners.length);
   diag('decoded').textContent=`${found.length} matched · ${detector.diagnostics.rawMarkerCount} total`;
   diag('time').textContent=detector.diagnostics.durationMs.toFixed(0)+' ms · '+(cropped?'ROI':'full')+' '+regionW+'×'+regionH;
   diag('pass').textContent=region.kind+' · '+detector.diagnostics.pass;
   diag('contrast').textContent=detector.diagnostics.contrast;
   diag('note').textContent=detector.diagnostics.note+' · '+fastTracker.diagnostics.note;
   if(found.length){
    const decodeStamp=performance.now();
    if(decodeStamp-capturedAt<180)stereoFrames.push(0,capturedAt,found);
    // Decoding runs asynchronously: never inject old image coordinates into
    // a pose already advanced by optical flow. Stale results may confirm IDs
    // but must not move either translation or rotation backward in time.
    const stale=capturedAt<lastAppliedFrameAt;
    for(const marker of found)markerLastDecoded.set(marker.id,decodeStamp);
    fastTracker.confirm(found);
    latestDecodeAt=decodeStamp;
    // Preserve newer flow coordinates for existing IDs, but let an older
    // decoder frame restore IDs that flow has completely lost. Limit how old
    // a recovery frame can be so its seed is still useful for optical flow.
    const active=liveMarkers();
    const missing=found.filter(marker=>!active.some(m=>m.id===marker.id));
    const recoveryFresh=decodeStamp-capturedAt<300;
    // The flow worker projects decoded geometry from this exact source image
    // into its next image before correcting a live, moving quadrilateral.
    if(recoveryFresh)fastTracker.seed(found,flowSeedFrame);
    // Correct drift only when the marker has been nearly stationary across
    // flow frames and the decoder image is recent. Never rewind a moving track.
    const correctionCandidates=arucoCorrection.checked&&decodeStamp-capturedAt<180
     ?found.filter(marker=>{
       const flow=active.find(m=>m.id===marker.id);
       const motion=flowMotion.get(marker.id);
       if(!flow||!motion||decodeStamp-motion.at>120||motion.speed>0.035)return false;
       const error=marker.corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-flow.corners[i].x,p.y-flow.corners[i].y),0)/4;
       return error>1.5&&error<45;
      }):[];
    const corrected=correctionCandidates.map(marker=>({id:marker.id,corners:marker.corners.map(p=>({...p}))}));
    const applyCorrections=()=>{
     if(!corrected.length)return;
     const ids=new Set(corrected.map(m=>m.id));
     observations=[...observations.filter(m=>!ids.has(m.id)),...corrected];
     detector.seed(toNative(corrected));
     for(const marker of corrected)markerLastConfirmed.set(marker.id,decodeStamp);
     observationsAt=decodeStamp;
     drawDetections();
    };
    if(stale){
     staleDecodeDrops++;perf.count('Camera 1 stale decode results');
     if(missing.length&&recoveryFresh){
      for(const marker of missing)markerLastConfirmed.set(marker.id,decodeStamp);
      observations=[...active,...missing];
      observationsAt=decodeStamp;
      idleNoMarkers=false;
      drawDetections();
     }
     applyCorrections();
     diag('note').textContent='Stale decode '+(missing.length&&recoveryFresh?'recovered '+missing.length+' ID(s)':'ignored')+' ('+staleDecodeDrops+') · '+detector.diagnostics.note;
    }else{
     lastAppliedFrameAt=capturedAt;
     // Do not reset good flow positions with delayed decoder coordinates.
     if(missing.length&&!recoveryFresh)fastTracker.seed(missing,flowSeedFrame);
     for(const marker of missing)markerLastConfirmed.set(marker.id,decodeStamp);
     observations=[...active,...missing];
     observationsAt=decodeStamp;
     idleNoMarkers=observations.length===0;
     applyCorrections();
     drawDetections();
    }
   }
  }).catch(e=>{if(session===cameraSession){status.textContent='Detection error: '+String(e);diag('note').textContent='Decoder error';}}).finally(()=>{processing=false;});
 }
 }finally{snapshot?.close();}
}

const resize=new ResizeObserver(()=>{if(!renderer)return;const w=mount.clientWidth,h=mount.clientHeight;if(w<1||h<1)return;renderer.setDrawingBufferSize(w,h,Math.min(window.devicePixelRatio,1.5,Math.sqrt(1500000/(w*h))));camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});if(!embeddedTracking)resize.observe(mount);
const rawRenderedPoses=new Map<InstrumentName,TrackedPoseFilter>();
let last=performance.now();
let lastPoseMessage=0;
let lastEmbeddedFpsReport=0;
let embeddedFrames=0,lastJawOverlayAt=0;
function animate(now:number){const loopStarted=performance.now();perf.tick('Tracking loop');perf.sample('Tracking frame interval',Math.max(0,now-last));if(stream&&lastAppliedFrameAt>0)perf.sample('Camera 1 applied image age',Math.max(0,performance.now()-lastAppliedFrameAt));if(stream2&&observationsAt&&secondaryObservationsAt)perf.sample('Camera accepted-update skew',Math.abs(observationsAt-secondaryObservationsAt));const dt=Math.min((now-last)/1000,.05);last=now;
 updateRotationStageReadout();
 if(!simulation.checked){
  for(const [name,mesh] of [['needleDriver',driver],['forceps',forceps],['scissors',scissors]] as const){
   const target=liveTargets.get(name);
   const metric=stereoActive(),stereo=metric?stereoPositions.get(name):undefined;
   let fallback:ReturnType<StereoFallback['update']>=null;
   if(metric){
    let controller=stereoFallbacks.get(name);if(!controller){controller=new StereoFallback();stereoFallbacks.set(name,controller);}
    const views=stereoMonoViews(name,now);
    const orientation=stereo?.quaternion;
    fallback=controller.update(stereo&&orientation?{position:stereo.position.clone().multiply(new THREE.Vector3(200,-200,-200)),quaternion:orientation,at:stereo.lastSeen}:undefined,views,now);
    stereoFallbackStatus.set(name,fallback?.source??'lost');
   }
   if(metric?!!fallback:target&&now-target.lastSeen<trackingHoldMs){
    let raw=rawRenderedPoses.get(name);if(!raw){raw=new TrackedPoseFilter();rawRenderedPoses.set(name,raw);}
    if(fallback?.source==='stereo'&&name==='needleDriver')workspacePanel.feed(fallback.position,now);
    raw.update(fallback?workspacePracticePosition(fallback.position,stereoWorkspace):target!.position,fallback?.quaternion??target!.quaternion,now);
    const calibrated=instrumentCalibration.transform(name,raw.position,raw.quaternion,fallback?.at??target!.lastSeen,metric);
    mesh.position.copy(calibrated.position);mesh.quaternion.copy(calibrated.quaternion);
    // The standalone lab remains the camera/diagnostic owner. When embedded,
    // publish the exact rendered pose to the simulator on the same origin.
    if(embeddedTracking&&(root.dataset.embedded==='true'||now-lastPoseMessage>=32)){
     publishTrackingMessage({type:TRACKING_MESSAGE.pose,instrument:name,
      position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),seenAt:Date.now()},root.dataset.embedded==='true');
    }
   }
  }
  if(embeddedTracking)lastPoseMessage=now;
 }
 if(simulation.checked){const speed=(keys.has('shift')?2:1)*dt;
  driver.position.x+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*speed;driver.position.z+=(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*speed;
  scissors.position.x+=(Number(keys.has('l'))-Number(keys.has('j')))*speed;scissors.position.z+=(Number(keys.has('k'))-Number(keys.has('i')))*speed;
  forceps.position.x+=(Number(keys.has('d'))-Number(keys.has('a')))*speed;forceps.position.z+=(Number(keys.has('s'))-Number(keys.has('w')))*speed;
 }
 if(simulation.checked){driver.position.x=THREE.MathUtils.clamp(driver.position.x,-2,2);driver.position.z=THREE.MathUtils.clamp(driver.position.z,-2,2);
 forceps.position.x=THREE.MathUtils.clamp(forceps.position.x,-2,2);forceps.position.z=THREE.MathUtils.clamp(forceps.position.z,-2,2);
 scissors.position.x=THREE.MathUtils.clamp(scissors.position.x,-2,2);scissors.position.z=THREE.MathUtils.clamp(scissors.position.z,-2,2);}
 if(simulation.checked)driverReadout.textContent=`Simulated · (${driver.position.x.toFixed(2)}, ${driver.position.z.toFixed(2)})`;
 if(simulation.checked)scissorsReadout.textContent=`Simulated · (${scissors.position.x.toFixed(2)}, ${scissors.position.z.toFixed(2)})`;
 if(simulation.checked)forcepsReadout.textContent=`Simulated · (${forceps.position.x.toFixed(2)}, ${forceps.position.z.toFixed(2)})`;
 renderFrames++;if(now-lastFpsTime>=1000){renderFps=Math.round(renderFrames*1000/(now-lastFpsTime));renderFrames=0;lastFpsTime=now;diag('note').title='Virtual FPS '+renderFps+' · detector frames skipped '+skippedFrames+' · mode '+(idleNoMarkers?'idle':'tracking');}
 if(!recordedInput()){void detectFrame(now);void detectSecondFrame(now);}
 if(stereoEnabled.checked){
  if(!stereoCalibration){stereo3dStatus.textContent='Import a solved calibration JSON first.';}
  else if(trackingMode.value!=='stereo'){stereo3dStatus.textContent='Select 2 cameras in Tracking mode.';}
  else if(simulation.checked){stereo3dStatus.textContent='Disable simulated input for live triangulation.';}
  else{
   const mismatch=calibrationMatches(stereoCalibration,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight);
   if(mismatch){stereo3dStatus.textContent='Stereo inactive: '+mismatch;}
   else{
    const synchronized=stereoFrames.pair(now),notes:string[]=[];
    if(!synchronized)notes.push('No time-matched camera pair: '+(stereoFrames.lastFailure??'unknown'));
    for(const name of ['needleDriver','forceps','scissors'] as const){
     const rigid=stereoPrismRotation(name,now);
     if(!rigid&&synchronized){
      // Explain instruments that at least one camera sees.
      const ids:readonly number[]=markerGroups()[name];
      const seen=[...synchronized.first,...synchronized.second].some(m=>ids.includes(m.id));
      const reason=stereoRejections.get(name);
      if(seen&&reason)notes.push(name+' · stereo not used: '+reason);
     }
     if(!rigid||!synchronized)continue;
     notes.push(name+' · Camera 1 IDs '+rigid.firstIds.join(',')+' / Camera 2 IDs '+rigid.secondIds.join(',')+' · joint error '+rigid.errorPx.toFixed(2)+' px');
     const previous=stereoPositions.get(name),sampleAt=synchronized.at;
     if(previous?.lastSample===sampleAt)continue;
     const measured=stereoPracticePosition(rigid.translation);
     let filter=stereoPoseFilters.get(name);if(!filter){filter=new StereoPoseFilter();stereoPoseFilters.set(name,filter);}
     filter.update(measured,rigid.quaternion,sampleAt);
     if(previous){previous.position.copy(filter.position);previous.quaternion.copy(filter.quaternion);previous.lastSeen=sampleAt;previous.lastSample=sampleAt;}
     else stereoPositions.set(name,{position:filter.position.clone(),quaternion:filter.quaternion.clone(),lastSeen:sampleAt,lastSample:sampleAt});
    }
    stereo3dStatus.textContent=notes.length?notes.join(' | '):'Waiting for a consistent rigid stereo pose. Each camera may see different tracker faces; both views must fit the calibrated geometry.';
   }
  }
 }
 if(now-lastJawOverlayAt>=70){drawBallOutlines(0);drawBallOutlines(1);lastJawOverlayAt=now;}
 updateStereoViewIndicator(now);
 if(renderer){orbit?.update();perf.measure('Tracking render submission',()=>renderer!.render(scene,camera));}
 else{
  embeddedFrames++;
  if(now-lastEmbeddedFpsReport>=1000){
   publishTrackingMessage({type:TRACKING_MESSAGE.fps,fps:Math.round(embeddedFrames*1000/(now-lastEmbeddedFpsReport||1000))},root.dataset.embedded==='true');
   embeddedFrames=0;lastEmbeddedFpsReport=now;
  }
 }
 perf.sample('Tracking CPU frame',performance.now()-loopStarted);
 if(!recordedInput())requestAnimationFrame(animate);
}
if(!recordedInput())requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{detector.dispose();detector2.dispose();void stopCamera();void stopSecondCamera();resize.disconnect();orbit?.dispose();renderer?.dispose();});

renderCameraSettings();
const {diagnosticsHost}=mountTrackingLayout(root);
observeCameraFrames(video,count=>perf.tick('Camera 1 presented frames',count));observeCameraFrames(video2,count=>perf.tick('Camera 2 presented frames',count));
mountPerformancePanel(diagnosticsHost,()=>({build:'0.99',revision:__SUTUREHERO_REVISION__,mode:embeddedTracking?'embedded':'standalone',userAgent:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,trackerType,graphics:document.querySelector<HTMLSelectElement>('#graphics-quality')?.value??'standalone',camera1:{width:video.videoWidth,height:video.videoHeight,requestedFps:video.srcObject?(video.srcObject as MediaStream).getVideoTracks()[0]?.getSettings().frameRate:null},camera2:{width:video2.videoWidth,height:video2.videoHeight},decode1:detector.lastFrameSize,flow1:fastTracker.lastFrameSize,decode2:detector2.lastFrameSize,flow2:fastTracker2.lastFrameSize,decodeIntervalMs:roiDecodeToggle.checked?65:110,recoveryIntervalMs:65,globalScanIntervalMs:1000,snapshotBackend1,snapshotBackend2,depth:{nearMm:depthNearMm,farMm:depthFarMm,spanMm:Number(workingDepthInput.value),sensitivity:Number(depthSensitivity.value),instruments:Object.fromEntries([...filterMeasurements].map(([name,m])=>[name,{distanceMm:m.rawZ,sourceZ:m.filteredZ,locked:m.locked,source:m.source,measurementValid:m.valid}]))},roiDecode:roiDecodeToggle.checked,jawTracking:ballEnabled.checked,needleJawPattern:needleBallMode,stereoActive:stereoActive(),stereoSources:Object.fromEntries(stereoFallbackStatus),stereoRejections:Object.fromEntries(stereoRejections),staleDecodeDrops}));

/** Narrow lab bridge: images and timestamps change; live tracking algorithms do not. */
export const trackingLabBridge = {
 videos: () => [video, video2],
 async start(cameras?: number[]) {
  if (!stream) await startPrimaryCamera();
  if ((cameras?.includes(1) ?? trackingMode.value === 'stereo') && !stream2) {
   const primary = stream?.getVideoTracks()[0]?.getSettings().deviceId ?? select.value;
   if (!select2.value || select2.value === primary) {
    const other = (await availableCameras()).find(device => device.deviceId !== primary);
    if (!other) throw new Error('Two-camera mode needs a second available camera');
    select2.value = other.deviceId;
   }
   await startSecondaryCamera();
   if (!stream2) throw new Error('Camera 2 did not start');
  }
 },
 configuration() {
  const profiles = Object.fromEntries((['needleDriver', 'forceps', 'scissors'] as const)
   .map(name => [name, instrumentCalibration.profile(name)]));
  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]'))
   .filter(element => element.type !== 'file' && element.closest('#tracking-app,.tracking-tools-panel,#instrument-calibration'))
   .map(element => ({id: element.id, value: element.value, checked: element instanceof HTMLInputElement ? element.checked : undefined}));
  return {
   storage: snapshotTrackingStorage({
    'suturehero.instrument-calibration.v1': JSON.stringify(profiles),
    [TRACKING_STORAGE_KEYS.jawEngine]: markerJaws.classicActive() ? 'classic' : 'marker',
   }),
   controls,
   activeInstrument: document.querySelector('[data-calibration-tool][aria-pressed="true"]')?.getAttribute('data-calibration-tool') ?? ballInstrument.value,
  };
 },
 snapshot(camera: number) {
  const state = jawCameras[camera], now = performance.now();
  const at = camera ? secondaryObservationsAt : observationsAt;
  const sourceId = recordedInput()?.frameId(state.video) ?? state.video.getVideoPlaybackQuality?.().totalVideoFrames ?? frameClock(state.video)?.frameId;
  const ballProcessed = sourceId === undefined ? state.lastVideoTime === state.video.currentTime : state.lastJawFrame === sourceId;
  const currentWorkers = [camera ? detector2 : detector, camera ? fastTracker2 : fastTracker]
   .filter(worker => worker.lastResultAt >= (frameClock(state.video)?.presentedAt ?? now) - 1);
  const markers = (camera ? liveSecondMarkers() : liveMarkers()).map(marker => ({
   ...marker,
   current: currentWorkers.some(worker => worker.lastDetectedIds.includes(marker.id)),
   corners: marker.corners.map(point => ({...point})),
  }));
  // Classic diagnostics read existing state only. The marker-relative engine supplies its own readings below.
  const balls = markerJaws.classicActive() ? state.ballAnchors.flatMap((anchor, index) => {
   if (!anchor) return [];
   const track = stripedMotion[camera].get(index), detection = track?.current(now);
   const plan = track?.plan(now, anchor, recentBallMarker(Math.floor(index / 2), now, camera), state.ballAnchorMarkers[index], 6);
   const fresh = now - state.lastScan < 220 && ballProcessed;
   const current = fresh && (isStripedSlot(index) ? !!detection
    : state.ballPairValidAt[Math.floor(index / 2)] === state.lastScan && !!state.ballCenters[index]);
   const point = isStripedSlot(index) ? detection ?? plan?.center : state.ballCenters[index] ?? anchor;
   return [{
    id: ballNames[Math.floor(index / 2)] + ' ' + (index % 2 ? 'B' : 'A'),
    x: point?.x ?? anchor.x, y: point?.y ?? anchor.y,
    radius: detection ? Math.sqrt(detection.count / Math.PI) : 6,
    state: current ? 'detected' : (plan?.lostMs ?? 0) > 1200 ? 'lost' : 'predicted',
    confidence: null,
   }];
  }) : [];
  return {
   at, ballProcessed, markerCurrent: markers.some(marker => marker.current),
   markers: now - at < 220 ? markers : [],
   width: (camera ? overlay2 : overlay).width, height: (camera ? overlay2 : overlay).height,
   ballWidth: 640, ballHeight: state.ballCanvas.height,
   // In stereo, add why each instrument did or did not get a stereo pose this frame.
   balls, status: (stereoViewLabel.textContent ?? '') + (stereoActive() && stereo3dStatus.textContent ? '\n' + stereo3dStatus.textContent : ''), confidence: null,
   jawEngine: 'classic', ballSupported: true,
   poses: [...liveTargets].filter(([, target]) => now - target.lastSeen < 220).map(([instrument, target]) => ({
    instrument, markerId: target.id,
    markerPose: {camera: 0, translationMm: target.pose.position.toArray(), quaternion: target.pose.quaternion.toArray(), reprojectionErrorPx: target.pose.reprojectionError},
    position: target.position.toArray(), quaternion: target.quaternion.toArray(), at: target.lastSeen,
   })),
   stereo: stereoActive(),
   ...(!markerJaws.classicActive() ? markerJawDiagnostics(markerJaws.snapshot(now), camera) : {}),
  };
 },
 async process(camera: number, at: number) {
  if (!recordedInput()) throw new Error('Recorded frame input is required');
  await (camera ? detectSecondFrame(at) : detectFrame(at));
  const started = Date.now();
  while (detector.busy || detector2.busy || fastTracker.busy || fastTracker2.busy || fastProcessing || fastProcessing2
   || processing || processing2 || [...stripedSearchWorkers.values()].some(search => search.busy)) {
   if (Date.now() - started > 20000) throw new Error('Tracking worker timed out');
   await new Promise(resolve => setTimeout(resolve, 1));
  }
  updateLiveTargets();
  animate(at);
  drawBallOutlines(camera);
  return this.snapshot(camera);
 },
};
