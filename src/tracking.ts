import {markerSidePx} from './input/trackerDistance';
import {setText} from './ui/setText';
import {startBothCameras} from './input/startBothCameras';
import {bindDepthLock,bindSliderReadouts,trackingModeDescription} from './ui/trackingControls';
import {createTrackingLabBridge} from './trackingLab/bridge';
import {getOrCreate} from './util/getOrCreate';
import {RotationTracker,type RotationContext} from './input/RotationTracker';
import {StereoPoseMemory} from './input/stereoPoseMemory';
import {MONO_VIEW_MAX_AGE_MS,stereoMonoViews as monoViewsFromCameras} from './input/stereoMonoViews';
import {mountTrackingStatusStrip} from './ui/trackingStatusStrip';
import {stereoTipPose} from './input/stereoTipPose';
import {driftCorrections,holdDecodedMarkers,recordFlowMotion} from './input/driftCorrection';
import {moveSimulatedInstruments,resetSimulatedInstruments,simulatedReadout} from './input/simulatedInstruments';
import {CameraCapture,type CaptureEnvironment} from './input/CameraCapture';
import {bitmapRequests} from './input/bitmapRequests';
import {RotationStageReadout} from './ui/rotationStageReadout';
import {selectVerifiedMarkers} from './input/verifiedMarkers';
import {markerGroupsFor,trackerDescriptionText} from './input/markerGroups';
import {stereoBlockedReason,stereoIndicator,stereoInstrumentReport} from './input/stereoIndicator';
import {decodeDiagnosticsText,faceOverlapText,filterDiagnosticsText,poseReadoutText,traceQuad} from './ui/trackingReadouts';
import {orientationNote} from './input/iphoneCamera';
import {cameraStatusText,drawCornerMarks,drawDecodedMarkers} from './ui/markerOverlay';
import {mergeNewMarkers,offsetMarkers} from './input/flowScale';
import {DistanceTracks,measureTrackerDistance} from './input/trackerDistance';
import {chooseFace,faceCandidates} from './input/rotationTracking';
import {createTrackedInstrument,createTrackedScissors,setScissorsOpening} from './scene/trackingInstrumentModels';
import {mountDetectionPreviews} from './ui/detectionPreviews';
import {mountDepthRangeControls} from './input/depthRangeControls';
import {mountStereoCalibrationPanel} from './input/stereoCalibrationPanel';
import {steadyCaptureFrame} from './input/sizeDepthEstimator';
import {CameraMovedMonitor} from './ui/trackingHealth';
import {markerReadoutText} from './input/markerReadout';
import {cameraImage,recordedInput} from './trackingLab/runtime';
import {solveStereoRigPose,type StereoRigDiagnostics,type StereoRigPose} from './input/stereoRigPose';
import {StereoPositions} from './input/stereoPositions';
import {RingPoseTracker} from './input/RingPoseTracker';
import {StereoFrames} from './input/StereoFrames';
import {StereoFallback,type MonoView} from './input/StereoFallback';
import {stereoBoard} from './input/stereoBoard';
import {trackingPageMarkup} from './ui/trackingPageMarkup';
import {WorkerDetector} from './input/WorkerDetector';
import {stereoPracticePosition} from './input/stereoTrackingPose';
import {practiceUnitsPerMm,workspacePracticePosition} from './input/stereoWorkspace';
import {cameraPlaneXY,desiredDepthZ,filteredDepthZ,LOCKED_DEPTH_Z} from './input/monocularDepthMapping';
import {flowBitmapsSupported,flowFrameSettings} from './input/flowFrames';
import {frameClock,observeCameraFrames} from './input/CameraFrameClock';
import {captureSettings,FLOW_MIN_INTERVAL_MS,frameDrivenEnabled} from './input/captureScheduling';
import {trackProcessor} from './input/trackFrames';
import {latestStereoTips,stereoTipCalibration,TIP_READOUT_MAX_AGE_MS} from './input/stereoTipCalibration';
import {projectToCamera} from './input/stereoProjection';
import {TABLE_POINTS,tableHeight} from './input/tableHeight';
import {motionRecorder} from './gameplay/motionMetrics';
import {mountMotionMetricsPanel} from './ui/MotionMetricsPanel';
import {cameraMode} from './input/cameraDevices';
import {DISCOVERY_INTERVAL_MS} from './input/PredictiveDecodeSearch';
import {RestLock} from './input/RestLock';
import {drawRingAxes as drawRingAxesOverlay,drawTipDot,TIP_DOT_COLORS} from './ui/ringAxisOverlay';
import {LiveProfiler} from './diagnostics/LiveProfiler';
import {mountProfilerPanel} from './ui/ProfilerPanel';
import {trackingPerformance as perf} from './diagnostics/TrackingPerformance';
import {mountHallSensorPanel} from './ui/HallSensorPanel';
import {mountPerformancePanel} from './ui/PerformancePanel';
import {MarkerRestLatch} from './input/MarkerRestLatch';
import {MonocularDepthFilter} from './input/MonocularDepthFilter';
import {TrackedPoseFilter} from './input/TrackedPoseFilter';
import {instrumentCalibration} from './input/InstrumentCalibration';
import {mountTrackingLayout} from './ui/TrackingLayout';
import './ui/workspace.css';
import {trackedInstrumentRotation} from './input/trackingFrame';
import * as THREE from 'three';
import {calibrationMatches,type StereoCalibration} from './input/stereoGeometry';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MARKER_GROUPS,type MarkerObservation} from './input/arucoTracking';
import {availableCameras,openCamera,fillCameraSelect,savedCamera,rememberCamera,CAMERA_STORAGE_PRIMARY,CAMERA_STORAGE_SECONDARY} from './input/cameraDevices';
import {createCameraSettingsPanel} from './ui/CameraSettingsPanel';
import {publishTrackingMessage,TRACKING_MESSAGE,type TrackingStatusMessage} from './input/trackingMessages';
import {readStored,writeStored,parseTrackerType,trackerTypeStorageKey} from './input/trackingStorage';
import {estimateMarkerPose} from './input/markerPose';
import {RING_LAYOUT_REVISION,trackerGeometry,type PrismPose,type TrackerType} from './input/prismPose';
import {Instrument} from './instruments/Instrument';
import type {BallInstrumentName} from './input/ballTrackingSlots';
import './style.css';
import './tracking.css';

declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=trackingPageMarkup({build:__SUTUREHERO_BUILD__,revision:__SUTUREHERO_REVISION__,squareSizeMm:stereoBoard.squareSizeMm});
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
// Slider readouts and the all-instruments depth lock (src/ui/trackingControls.ts).
bindSliderReadouts({rotationSensitivity,rotationSensitivityValue,rotationGain,rotationGainValue,depthSensitivity,depthSensitivityValue},()=>depthStates.clear());
bindDepthLock(lockDepth,instrumentCalibration,()=>{liveTargets.clear();stationaryStates.clear();depthStates.clear();});
trackingMode.addEventListener('change',()=>{resetTrackerPose();
 liveTargets.clear();stationaryStates.clear();depthStates.clear();
 trackingModeInfo.textContent=trackingModeDescription(trackingMode.value);
});
simulation.addEventListener('change',()=>{resetTrackerPose();stereoPositions.clear();liveTargets.clear();stationaryStates.clear();depthStates.clear();resetSimulatedInstruments({driver,forceps,scissors});});
const markerReadout=document.querySelector<HTMLElement>('#marker-readout')!;
const driverReadout=document.querySelector<HTMLElement>('#driver-readout')!;
const forcepsReadout=document.querySelector<HTMLElement>('#forceps-readout')!;
const scissorsReadout=document.querySelector<HTMLElement>('#scissors-readout')!;
const faceOverlapReadout=document.querySelector<HTMLElement>('#face-overlap-readout')!;
const detector=new WorkerDetector('Camera 1 decode');
const fastTracker=new WorkerDetector('Camera 1 flow');
let latestFlowAt=0,latestDecodeAt=0;
let lastAppliedFrameAt=0;
let staleDecodeDrops=0;
let fastFrames=0,slowFrames=0,fastWindow=performance.now();
// Threshold and crop decode previews (src/ui/detectionPreviews.ts).
const detectionPreviews=mountDetectionPreviews();


// Second independent USB camera for stereo setup validation (not yet fused into pose).
const video2=document.querySelector<HTMLVideoElement>('#camera-video-2')!;
const overlay2=document.querySelector<HTMLCanvasElement>('#camera-overlay-2')!;
const select2=document.querySelector<HTMLSelectElement>('#camera-select-2')!;
const start2=document.querySelector<HTMLButtonElement>('#start-camera-2')!;
const stop2=document.querySelector<HTMLButtonElement>('#stop-camera-2')!;
const status2=document.querySelector<HTMLElement>('#camera-status-2')!;
const detector2=new WorkerDetector('Camera 2 decode');
const fastTracker2=new WorkerDetector('Camera 2 flow');
// Calibrated stereo: calibration, workspace axes, import/remove (src/input/stereoCalibrationPanel.ts).
const stereoSetup=mountStereoCalibrationPanel(document.querySelector('#stereo-calibration-status')!.closest('section')!,{
 cameras:()=>({first:select.value,second:select2.value}),
 reset:restore=>{if(restore)stereoPositions.clear();else resetTrackerPose();},
});
type InstrumentName='needleDriver'|'forceps'|'scissors';
const trackerTypeSelect=document.querySelector<HTMLSelectElement>('#tracker-type')!;
const trackerTypeStatus=document.querySelector<HTMLElement>('#tracker-type-status')!;
let trackerType:TrackerType='prism';
/** Marker groups for the decode region search: each instrument's ring plus its handle prism, so a hidden handle face is not treated as a lost object (which forces whole-frame scans). */
const decodeSearchGroups=()=>Object.values(markerGroups()).map(ids=>[...ids]);
const markerGroups=():Record<InstrumentName,readonly number[]>=>markerGroupsFor(trackerType);
function updateTrackerDescription(){
 const text=trackerDescriptionText(trackerType,trackerGeometry(trackerType),markerGroups());
 trackerTypeStatus.textContent=text.status;
 document.querySelector('#tracker-geometry-description')!.textContent=text.description;
}

function resetTrackerPose(){
 instrumentCalibration.clearSessions();rawRenderedPoses.clear();ringPoseTrackers.clear();stereoFallbacks.clear();stereoFallbackStatus.clear();stereoFrames.clear();monoDepthFilters.clear();distanceTracks.resetSizeEstimators();capture1.search.reset();capture2.search.reset();
 rotationTracker.reset();
 liveTargets.clear();stereoPositions.reset();
 
 distanceTracks.resetHistories();
}
trackerTypeSelect.addEventListener('change',()=>{
 trackerType=parseTrackerType(trackerTypeSelect.value);
 resetTrackerPose();
 updateTrackerDescription();
 writeStored(trackerTypeStorageKey(cameraMode()),trackerType);
});
trackerTypeSelect.value=parseTrackerType(readStored(trackerTypeStorageKey(cameraMode())));
trackerType=parseTrackerType(trackerTypeSelect.value);
updateTrackerDescription();
window.addEventListener('suturehero:camera-mode-changed',()=>{
 const saved=parseTrackerType(readStored(trackerTypeStorageKey(cameraMode())));
 if(saved===trackerType)return;
 trackerTypeSelect.value=saved;
 trackerTypeSelect.dispatchEvent(new Event('change'));
});

const stereoPositions=new StereoPositions<InstrumentName>();

type StereoRotation=StereoRigPose;
const ringPoseTrackers=new Map<InstrumentName,RingPoseTracker>();
const stereoFrames=new StereoFrames();
const stereoFallbacks=new Map<InstrumentName,StereoFallback>();
const stereoFallbackStatus=new Map<InstrumentName,string>();
const stereoMonoCache=new Map<InstrumentName,{key:string;calibration:StereoCalibration;views:MonoView[]}>();
const stereoPoseCache=new StereoPoseMemory<InstrumentName,StereoRotation,StereoCalibration>();
// Fit all known face corners jointly in the calibrated camera frames.
/** Why stereo was not used for each instrument on the latest frame (diagnostics only). */
const stereoRejections=new Map<InstrumentName,string>();
/** Why the latest stereo frame pairing failed (null when paired), for the status strip. */
let latestPairingFailure:string|null=null;
const cameraMovedMonitor=new CameraMovedMonitor();
function noteStereoRejection(name:InstrumentName,reason:string){
 if(stereoRejections.get(name)!==reason)perf.count('Stereo not used: '+reason.replace(/·.*$/,'').replace(/-?\d+(\.\d+)?/g,'#').trim());
 stereoRejections.set(name,reason);
}
function stereoPrismRotation(name:InstrumentName,now:number):StereoRotation|null{
 if(!stereoActive()||!stereoSetup.calibration||!overlay.width||!overlay2.width)return null;
 if(calibrationMatches(stereoSetup.calibration,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight))return null;
 const synchronized=stereoFrames.pair(now);if(!synchronized){noteStereoRejection(name,'no time-matched camera pair: '+(stereoFrames.lastFailure??'unknown'));return null;}
 const key=`${synchronized.at}:${trackerType}:${overlay.width}:${overlay.height}:${overlay2.width}:${overlay2.height}`;
 const cached=stereoPoseCache.cached(name,key,stereoSetup.calibration);if(cached!==undefined)return cached;
 const diagnostics:StereoRigDiagnostics={};
 const pose=solveStereoRigPose(stereoSetup.calibration,synchronized.first,synchronized.second,{width:overlay.width,height:overlay.height},{width:overlay2.width,height:overlay2.height},markerGroups()[name][0],trackerType,stereoPoseCache.seed(name,synchronized.at),diagnostics);
 if(pose)stereoRejections.delete(name);else noteStereoRejection(name,diagnostics.reason??'rejected');
 // Keep the last accepted pose through rejected frames so the next fit stays continuous.
 stereoPoseCache.remember(name,key,stereoSetup.calibration,pose,synchronized.at);return pose;
}

function stereoMonoViews(name:InstrumentName,now:number):MonoView[]{
 if(!stereoSetup.calibration)return [];
 const cal=stereoSetup.calibration;
 const key=`${observationsAt}:${secondaryObservationsAt}:${trackerType}:${overlay.width}:${overlay.height}:${overlay2.width}:${overlay2.height}`;
 const cached=stereoMonoCache.get(name);if(cached?.key===key&&cached.calibration===cal)return cached.views.filter(v=>now-v.at<MONO_VIEW_MAX_AGE_MS);
 // Each camera's own pose estimate (src/input/stereoMonoViews.ts).
 const views=monoViewsFromCameras(cal,markerGroups()[name],trackerType,[
  {at:observationsAt,size:{width:overlay.width,height:overlay.height},markers:liveMarkers()},
  {at:secondaryObservationsAt,size:{width:overlay2.width,height:overlay2.height},markers:liveSecondMarkers()},
 ],now);
 stereoMonoCache.set(name,{key,calibration:cal,views});return views;
}

const stereoActive=()=>stereoSetup.enabled.checked&&!!stereoSetup.calibration&&trackingMode.value==='stereo'&&!simulation.checked;
const stereoViewDot=document.querySelector<HTMLElement>('#stereo-view-dot')!;
const stereoViewLabel=document.querySelector<HTMLElement>('#stereo-view-label')!;
let lastTrackingStatus='',lastTrackingStatusAt=0;
function updateStereoViewIndicator(now:number){
 const configured=stereoActive();
 const fallback=[...stereoFallbackStatus].filter(([,source])=>source==='camera1'||source==='camera2');
 const fresh=[...stereoFallbackStatus].filter(([,source])=>source==='stereo').map(([name])=>name);
 const mismatch=configured?calibrationMatches(stereoSetup.calibration!,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight):null;
 const indicator=stereoIndicator({configured,fallback,fresh,mismatch,monoStreaming:!!stream&&!simulation.checked});
 stereoViewDot.style.background=indicator.color;
 setText(stereoViewLabel,indicator.label);
 const state=indicator.state;
 const detail:TrackingStatusMessage={type:TRACKING_MESSAGE.status,state,label:stereoViewLabel.textContent,sources:Object.fromEntries(stereoFallbackStatus)};
 const key=JSON.stringify(detail);
 if(embeddedTracking&&!recordedInput()&&(key!==lastTrackingStatus||now-lastTrackingStatusAt>500)){
  lastTrackingStatus=key;lastTrackingStatusAt=now;
  publishTrackingMessage(detail,root.dataset.embedded==='true');
 }

}

stereoSetup.enabled.addEventListener('change',resetTrackerPose);
stereoSetup.restoreSaved();
const overlayContext2=overlay2.getContext('2d')!;
let stream2:MediaStream|null=null,ready2=false,lastDetection2=0,session2=0;
let latestFlowAt2=0;
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
async function stopSecondCamera(){stereoPositions.clear();stereoFrames.clear();detector2.dispose();fastTracker2.dispose();
 capture2.flowBusy=false;capture2.decodeBusy=false;capture2.lastFlowAt=0;capture2.lastDecodeAt=0;latestFlowAt2=0;confirmed2.clear();decoded2.clear();decodedFrames2=0;flowFrames2=0;statsAt2=performance.now();
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
 // src/input/startBothCameras.ts
 try{await startBothCameras({trackingMode,simulation,stereoEnabled:stereoSetup.enabled,
  refreshCameraLists:async()=>{await refreshCameras();await refreshSecondCameraList();},
  selectedCameras:()=>({first:select.value,second:select2.value}),running:camera=>!!(camera?stream2:stream),
  startPrimary:startPrimaryCamera,startSecondary:startSecondaryCamera,calibrated:()=>!!stereoSetup.calibration,
  setStatus:text=>{stereoQuickStatus.textContent=text;}});}
 finally{stereoQuick.disabled=false;}
});

select2.addEventListener('change',()=>{rememberCamera(CAMERA_STORAGE_SECONDARY,select2.value);if(stream2)void stopSecondCamera();});
async function detectSecondFrame(now:number){
 if(!stream2||!ready2||!video2.videoWidth)return;
 const recovering=!liveSecondMarkers().length||now-latestFlowAt2>120;
 const frame=capture2.begin(now,recovering);if(!frame)return;
 const currentSession=session2;
 const {doFlow:doFast,doDecode:doSlow,w,h,toNative,toFlow,capturedAt:secondaryCaptureAt,pairAt:secondaryPairAt}=frame;
 if(capture1.capturedAt)perf.sample('Camera capture skew',Math.abs(secondaryCaptureAt-capture1.capturedAt));
 try{
 const render=()=>{
  const fresh=liveSecondMarkers();
  drawDecodedMarkers(overlayContext2,fresh,id=>performance.now()-(decoded2.get(id)??-Infinity),w,h);
  drawTipDots(overlayContext2,2,w,h);
  const stamp=performance.now();
  if(stamp-statsAt2>=1000){
   const seconds=(stamp-statsAt2)/1000;
   status2.textContent=cameraStatusText('Camera 2',w,h,fresh.map(m=>m.id),decodedFrames2,flowFrames2,seconds);
   statsAt2=stamp;decodedFrames2=0;flowFrames2=0;
  }
  updateStereoMatches();
 };
 if(doFast){
  const flowResult=capture2.requestFlow(frame,now);
  void flowResult.then(found=>{
   if(currentSession!==session2)return;
   perf.sample('Camera 2 flow frame age',performance.now()-secondaryCaptureAt);const stamp=performance.now();flowFrames2++;
   if(found.length){
    for(const marker of found)confirmed2.set(marker.id,stamp);
    secondaryObservations=found;secondaryObservationsAt=stamp;latestFlowAt2=stamp;stereoFrames.push(1,secondaryPairAt,found);
    detector2.seed(toNative(found));
   }else{
    secondaryObservations=[];confirmed2.clear();secondaryObservationsAt=stamp;stereoFrames.push(1,secondaryPairAt,[]);
    capture2.lastDecodeAt=Math.min(capture2.lastDecodeAt,stamp-65);
   }
   render();
  }).catch(error=>{if(currentSession===session2)status2.textContent='Camera 2 flow error: '+String(error);})
   .finally(()=>{if(currentSession===session2)capture2.flowBusy=false;});
 }
 if(doSlow){
  const {request:decodeRequest2,region,flowSeedFrame}=capture2.requestDecode(frame,now,toNative(liveSecondMarkers()));
  const {left,top}=region;
  void decodeRequest2.then(nativeFound=>{
   if(currentSession!==session2)return;
   perf.sample('Camera 2 decode frame age',performance.now()-secondaryCaptureAt);decodedFrames2++;
   const nativeMarkers=offsetMarkers(nativeFound,left,top);capture2.search.result(nativeMarkers);perf.sample('Camera 2 '+region.kind+' decode worker',detector2.diagnostics.durationMs);
   const found=toFlow(nativeMarkers),stamp=performance.now();
   if(found.length&&stamp-secondaryCaptureAt<180)stereoFrames.push(1,secondaryPairAt,found);
   if(found.length){
    for(const marker of found)decoded2.set(marker.id,stamp);
    fastTracker2.seed(found,flowSeedFrame);
    const {merged,added}=mergeNewMarkers(liveSecondMarkers(),found);
    for(const marker of added)confirmed2.set(marker.id,stamp);
    secondaryObservations=merged;secondaryObservationsAt=stamp;
   }
   render();
  }).catch(error=>{if(currentSession===session2)status2.textContent='Camera 2 decode error: '+String(error);})
   .finally(()=>{if(currentSession===session2)capture2.decodeBusy=false;});
 }
 }finally{frame.close();}
}

void refreshSecondCameraList().catch(()=>{status2.textContent='Connect both USB cameras and allow camera access.';});


// Validated stereo capture is owned by stereoAutoCapture.

const diag=(name:string)=>document.querySelector<HTMLElement>('#diag-'+name)!;
let framesAnalyzed=0,detectorFpsWindow=performance.now(),detectorFpsCount=0;
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
const verifiedMarkers=()=>selectVerifiedMarkers(liveMarkers(),markerGroups(),trackerType,markerLastDecoded,performance.now(),OVERLAP_DECODE_MS);
const MARKER_LIVE_MS=140;
const markerAge=(id:number,now=performance.now())=>now-(markerLastConfirmed.get(id)??-Infinity);
const liveMarkers=()=>observations.filter(m=>markerAge(m.id)<=MARKER_LIVE_MS);
/** Live markers of these IDs whose identity was decoded within `maxAgeMs` (flow-only outlines excluded). */
const recentlyDecodedMarkers=(ids:readonly number[],maxAgeMs:number)=>liveMarkers().filter(m=>ids.includes(m.id)&&performance.now()-(markerLastDecoded.get(m.id)??-Infinity)<maxAgeMs);
/** This instrument's ring pose tracker, created on first use. */
const ringPoseTracker=(name:InstrumentName)=>{const tracker=getOrCreate(ringPoseTrackers,name,()=>new RingPoseTracker());return tracker;};
function pruneMarkers(){observations=observations.filter(m=>markerAge(m.id)<=MARKER_LIVE_MS);}

let observationsAt=0;
const trackingHoldMs=650;
// Rotation-only rigid-body state. Never used to accept/reject translation.
const rotationTracker=new RotationTracker<InstrumentName>();
/** What the rotation step reads from this page for one instrument (src/input/RotationTracker.ts). */
const rotationContextFor=(name:InstrumentName,ids:readonly number[]):RotationContext=>({
 ids,trackerType,mono:trackingMode.value==='mono',width:overlay.width,height:overlay.height,
 flowRotation:document.querySelector<HTMLInputElement>('#flow-rotation')!.checked,
 faceTransition:document.querySelector<HTMLInputElement>('#face-transition')!.checked,
 recentlyDecoded:recentlyDecodedMarkers,lastDecodedAt:id=>markerLastDecoded.get(id),markerAge:id=>markerAge(id),
 ringTracker:create=>create?ringPoseTracker(name):ringPoseTrackers.get(name),
 stereoRotation:()=>stereoPrismRotation(name,performance.now()),
 stageRaw:rotationStageRaw,stageStatus:rotationStageStatus,
 setSolverStatus:text=>{document.querySelector<HTMLElement>('#rotation-solver-status')!.textContent=text;},
 setAngleDegrees:degrees=>{const m=filterMeasurements.get(name);if(m)m.angle=degrees;},
});
const depthStates=new Map<'needleDriver'|'forceps'|'scissors',number>();
const monoDepthFilters=new Map<InstrumentName,MonocularDepthFilter>();
const stableDepth=document.querySelector<HTMLInputElement>('#stable-depth')!;
stableDepth.addEventListener('change',()=>{monoDepthFilters.clear();depthStates.clear();});
const depthBinding=()=>`${stream?.getVideoTracks()[0]?.getSettings().deviceId??select.value}|${trackerType}${trackerType==='prism'?'':':marker'+trackerGeometry(trackerType).markerSizeMm+'mm:layout'+RING_LAYOUT_REVISION}|${video.videoWidth&&video.videoHeight?(video.videoWidth/video.videoHeight).toFixed(3):'off'}`;
/** Distance state per instrument: recent distances, size-depth frames, last depth (src/input/trackerDistance.ts). */
const distanceTracks=new DistanceTracks<InstrumentName>();
function resetDepthFilters(){depthStates.clear();monoDepthFilters.clear();stationaryStates.clear();distanceTracks.resetHistories();}
// Near/Far size-depth range, working depth and its saved copy (src/input/depthRangeControls.ts).
const {range:depthRangeState,label:depthRangeLabel}=mountDepthRangeControls({
 binding:depthBinding,
 capture:()=>{
  const name=(document.querySelector<HTMLElement>('[data-calibration-tool][aria-pressed="true"]')?.dataset.calibrationTool??'needleDriver') as InstrumentName;
  const frame=steadyCaptureFrame(distanceTracks.get(name).sizeEstimator.frames(),performance.now(),depthBinding());
  if(trackingMode.value!=='mono'||!filterMeasurements.get(name)?.valid||frame==='too-few')return `Show a face-on ${name} marker in camera 1 and hold still before capturing.`;
  if(frame==='unsteady')return 'Hold the instrument steady at this distance, then retry.';
  return frame;
 },
 changed:resetDepthFilters,
});
trackerTypeSelect.addEventListener('change',depthRangeLabel);
/** Side (px) of each instrument's chosen marker, for the "move closer" hint (ui/trackingHealth.ts). */
const markerSides=new Map<string,number>();
const filterMeasurements=new Map<'needleDriver'|'forceps'|'scissors',{rawZ:number;filteredZ:number;angle:number;locked:boolean;source:string;valid:boolean}>();
const stationaryStates=new Map<InstrumentName,MarkerRestLatch>();
const liveTargets=new Map<'needleDriver'|'forceps'|'scissors',{position:THREE.Vector3;quaternion:THREE.Quaternion;lastSeen:number;id:number;pose:NonNullable<ReturnType<typeof estimateMarkerPose>>}>();
let detectorReady=false,lastDetection=0,cameraSession=0;
let idleNoMarkers=true,skippedFrames=0,renderFrames=0,renderFps=0,lastFpsTime=performance.now();
const motionCanvas=document.createElement('canvas');motionCanvas.width=64;motionCanvas.height=36;
const motionCtx=motionCanvas.getContext('2d',{willReadFrequently:true})!;
let motionPrevious:Uint8Array|null=null;
function changedFrame(source:HTMLVideoElement){motionCtx.drawImage(cameraImage(source),0,0,64,36);const data=motionCtx.getImageData(0,0,64,36).data;const next=new Uint8Array(64*36);let changed=0;for(let i=0;i<next.length;i++){const p=i*4;next[i]=(data[p]*3+data[p+1]*6+data[p+2])/10;if(motionPrevious&&Math.abs(next[i]-motionPrevious[i])>24)changed++;}motionPrevious=next;return changed>32;}

let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value||savedCamera(CAMERA_STORAGE_PRIMARY);fillCameraSelect(select,await availableCameras(),current,'Default camera');}catch{ /* permission or unsupported */ }
}
async function stopCamera(){resetTrackerPose();stereoPositions.clear();cameraSession++;detector.dispose();fastTracker.dispose();capture1.flowBusy=false;capture1.lastFlowAt=0;capture1.lastDecodeAt=0;latestFlowAt=0;latestDecodeAt=0;lastAppliedFrameAt=0;staleDecodeDrops=0;detectorReady=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;observations=[];observationsAt=0;liveTargets.clear();stationaryStates.clear();depthStates.clear();overlayContext.clearRect(0,0,overlay.width,overlay.height);start.disabled=false;stop.disabled=true;document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='';status.textContent='Camera stopped.';renderCameraSettings();setText(markerReadout,'Camera stopped');diag('note').textContent='Camera stopped';}
async function startPrimaryCamera(){
 try {await stopCamera();detectorReady=false;stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();renderCameraSettings();depthRangeLabel();document.querySelector<HTMLElement>('#camera-placeholder')!.style.display='none';framesAnalyzed=0;detectorFpsWindow=performance.now();detectorFpsCount=0;diag('frames').textContent='0';diag('detection-fps').textContent='0';const settings=stream.getVideoTracks()[0]?.getSettings();diag('resolution').textContent=`${video.videoWidth} × ${video.videoHeight} camera · tracking ≤960px wide${settings?.frameRate?' · '+Math.round(settings.frameRate)+' fps':''}${cameraMode()==='iphone'?' · '+(stream.getVideoTracks()[0]?.label??'')+(orientationNote(video.videoWidth,video.videoHeight)?' · '+orientationNote(video.videoWidth,video.videoHeight):''):''}`;start.disabled=true;stop.disabled=false;status.textContent='Camera running. Loading marker detector…';const session=cameraSession;await Promise.all([detector.initialize(),fastTracker.initialize(true)]);if(session!==cameraSession)return;detectorReady=true;status.textContent='Live ArUco detection running. Hold a marker in view.';await refreshCameras();await refreshSecondCameraList();renderCameraSettings();status2.textContent='Camera 2 is optional for now.';}
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
const driverModel=createTrackedInstrument(scene,'right',0xe3b47e),forcepsModel=createTrackedInstrument(scene,'left',0x68d1bb);
previewInstrumentModels.set('right',driverModel.model);previewInstrumentModels.set('left',forcepsModel.model);
const driver=driverModel.group,forceps=forcepsModel.group;

const scissors=createTrackedScissors(scene);
const previewScissorOpening=(value:number)=>setScissorsOpening(scissors,value);
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
  const candidates=faceCandidates(liveMarkers(),ids,marker=>estimateMarkerPose(marker,overlay.width,overlay.height,trackerGeometry(trackerType).markerSizeMm));
  const previous=liveTargets.get(name);
  // PR #67 face selection: prefer a stable, well-fitting face instead of
  // switching IDs based on marker area on every frame.
  const chosen=chooseFace(candidates,previous?.id);
  if(!chosen)continue;
  const rest=getOrCreate(stationaryStates,name,()=>new MarkerRestLatch());
  const stationary=rest.observe(candidates.map(c=>c.marker),now);

  // Pose reprojection error gates rotation confidence, not marker-center translation.
  // Optical flow can track a valid 2D square even when the planar 3D fit is poor.
  const {pose}=chosen;
  // Translation comes directly from the displayed marker quadrilateral, not PnP pose.
  // The size-derived distance is approximate until camera intrinsics are calibrated.
  const markerCenter={x:chosen.marker.corners.reduce((sum,p)=>sum+p.x,0)/4,y:chosen.marker.corners.reduce((sum,p)=>sum+p.y,0)/4};
  const focalPx=overlay.width/(2*Math.tan(70*Math.PI/360/2));
  const binding=depthBinding();
  // Tracker-centre distance (3D pose or marker size) and, with one camera, tilt-corrected size depth.
  const distance=measureTrackerDistance(distanceTracks.get(name),{chosen,candidates,faceIndex:id=>ids.indexOf(id),trackerType,width:overlay.width,height:overlay.height,focalPx,now,stationary,singleCamera:trackingMode.value==='mono',binding,instrument:name});
  if(!distance)continue;
  const {measuredDistance,depthDistance,source:depthSource,valid:depthInputValid}=distance;
  markerSides.set(name,markerSidePx(chosen.marker.corners));
  const {near,span:range}=depthRangeState.range(binding,Number(workingDepthInput.value));

  const previousZ=depthStates.get(name);
  const lockedDepth=trackingMode.value==='mono'&&instrumentCalibration.profile(name).depthLock;
  const baseline=LOCKED_DEPTH_Z[name];
  const fraction=depthRangeState.size.fraction(depthDistance/(focalPx/overlay.width),binding);
  const desiredZ=desiredDepthZ(depthDistance,near,range,Number(depthSensitivity.value),fraction);
  const filter=getOrCreate(monoDepthFilters,name,()=>new MonocularDepthFilter());
  const z=filteredDepthZ(filter,trackingMode.value==='mono'&&(stableDepth.checked||lockedDepth),previousZ,desiredZ,now,lockedDepth,baseline,depthInputValid);
  depthStates.set(name,z);filterMeasurements.set(name,{rawZ:depthDistance,filteredZ:z,angle:filterMeasurements.get(name)?.angle??0,locked:lockedDepth,source:depthSource,valid:depthInputValid});
  // Perspective-correct camera-space X/Y, scaled against the same depth reference.
  const {x,y}=cameraPlaneXY(markerCenter,overlay.width,overlay.height,measuredDistance,focalPx,near,range);
  // Match simulator world axes: camera horizontal -> scene X, camera vertical
  // -> scene Y, and camera depth -> scene Z. Do not swap horizontal and depth:
  // doing so makes a left/right physical movement appear forward/back.
  const position=new THREE.Vector3(x,y,z);
  const rotationContext=rotationContextFor(name,ids);
  if(stationary&&previous&&now-previous.lastSeen<700&&rotationTracker.has(name)){
   // Holding still is exactly when overlap alignment should accumulate.
   // The rest latch must not skip those calibration observations.
   const alignedStatus=rotationTracker.holdStill(name,now,rotationContext);
   // Let a real depth move finish filtering after the instrument stops. The
   // held raw distance above prevents face-count changes from creating new depth.
   position.x=previous.position.x;position.y=previous.position.y;
   liveTargets.set(name,{...previous,position,lastSeen:now,id:chosen.pose.id,pose:chosen.pose});
   rotationStageStatus.set(name,'stationary image geometry · pose held');
   document.querySelector('#rotation-solver-status')!.textContent=name+' · stationary image geometry · pose held'+alignedStatus;
   continue;
  }
  // Independent rigid-body rotation: never gate or alter the working translation (src/input/RotationTracker.ts).
  const quaternion=rotationTracker.update(name,now,previous?.quaternion,rotationContext);
  liveTargets.set(name,{position,quaternion,lastSeen:now,id:pose.id,pose});
 }
}

// Diagnostic rotation stages: raw solver, accepted target, rendered mesh (src/ui/rotationStageReadout.ts).
const rotationStages=new RotationStageReadout<InstrumentName>();
const rotationStageRaw=rotationStages.raw,rotationStageStatus=rotationStages.status;
function updateRotationStageReadout(){
 const el=document.querySelector<HTMLElement>('#rotation-stage-readout');
 if(el)el.textContent=rotationStages.text([['needleDriver',driver],['forceps',forceps],['scissors',scissors]],name=>liveTargets.get(name)?.quaternion);
}
/** Send a calibrated jaw opening (camera or Bluetooth jaw sensor) to the previews and the practice scene. */
function sendJawOpening(name:BallInstrumentName,opening:number,cameras:number[]){
 if(name==='forceps')previewInstrumentModels.get('left')?.setTrackedOpening(opening);
 if(name==='needleDriver')previewInstrumentModels.get('right')?.setTrackedOpening(opening);
 if(name==='scissors')previewScissorOpening(opening);
 publishTrackingMessage({type:TRACKING_MESSAGE.jawOpening,instrument:name,opening,cameras:cameras.map(c=>c+1),seenAt:Date.now()},embeddedTracking);
}
function drawCornerDebug(){
 if(!cornerDebug.checked)return;
 const now=performance.now();
 const drawCorners=(pts:MarkerObservation['corners'],color:string,pointsOnly=false)=>drawCornerMarks(overlayContext,pts,color,pointsOnly);
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
/** Black line along each visible ring's shaft axis. */
const ringAxisPoses=new Map<InstrumentName,PrismPose>();
function drawRingAxes(){
 drawRingAxesOverlay(overlayContext,markerGroups(),observations,id=>performance.now()-(markerLastDecoded.get(id)??-Infinity),trackerType,overlay.width,overlay.height,ringAxisPoses);
 drawTipDots(overlayContext,1,overlay.width,overlay.height);
}
/** Calibrated stereo tips as dots in a camera view (src/input/stereoProjection.ts). */
function drawTipDots(context:CanvasRenderingContext2D,camera:1|2,width:number,height:number){
 if(!stereoSetup.calibration||!width||!height)return;
 const now=performance.now();
 for(const [name,tip] of latestStereoTips){
  if(now-tip.at>TIP_READOUT_MAX_AGE_MS)continue;
  const pixel=projectToCamera(stereoSetup.calibration,tip.mm.toArray() as [number,number,number],camera,{width,height});
  if(pixel)drawTipDot(context,pixel,TIP_DOT_COLORS[name]??'#fff');
 }
}
function drawDetections(){
 const overlayStarted=performance.now();
 const w=overlay.width,h=overlay.height;overlayContext.clearRect(0,0,w,h);
 pruneMarkers();
 for(const marker of observations){
  // A flow-only outline is not proof that the printed face is still visible.
  if(performance.now()-(markerLastDecoded.get(marker.id)??-Infinity)>650)continue;
  const pts=marker.corners;traceQuad(overlayContext,pts);const group=(Object.keys(markerGroups()) as Array<keyof typeof MARKER_GROUPS>).find(name=>(markerGroups()[name] as readonly number[]).includes(marker.id));const overlap=group&&verifiedMarkers().filter(m=>(markerGroups()[group] as readonly number[]).includes(m.id)).length>1;const stale=false;overlayContext.strokeStyle=stale?'#8b929c':overlap?'#ffc14d':'#18e89d';overlayContext.lineWidth=3;overlayContext.stroke();overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.font='bold 20px sans-serif';overlayContext.fillText((overlap?'OVERLAP ':'')+'ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));}
 drawRingAxes();
 drawCornerDebug();
 perf.sample('Marker overlay drawing',performance.now()-overlayStarted);
 perf.measure('Pose estimation + filtering',updateLiveTargets);const uiStarted=performance.now();
 setText(markerReadout,markerReadoutText(observations.map(m=>m.id),markerLastDecoded,performance.now()));
 if(!simulation.checked){
  const readout=(name:'needleDriver'|'forceps'|'scissors')=>poseReadoutText(liveTargets.get(name),performance.now(),trackingHoldMs);
  setText(driverReadout,readout('needleDriver'));setText(forcepsReadout,readout('forceps'));setText(scissorsReadout,readout('scissors'));
  setText(filterDiagnostics,filterDiagnosticsText(filterMeasurements));
  setText(faceOverlapReadout,faceOverlapText(markerGroups(),verifiedMarkers().map(m=>m.id),trackerGeometry(trackerType)));
 }
 perf.sample('Tracking status UI',performance.now()-uiStarted);
}
const roiDecodeToggle=document.querySelector<HTMLInputElement>('#roi-decode')!;
// Each camera's capture pipeline: snapshot, flow and decode requests (src/input/CameraCapture.ts).
const captureEnvironment:CaptureEnvironment={
 useBitmapFlow:()=>useBitmapFlow(),trackFramesActive:()=>trackFramesActive(),flowMinIntervalMs:()=>flowMinIntervalMs(),
 roiDecode:()=>roiDecodeToggle.checked,decodeSearchGroups:()=>decodeSearchGroups(),
 postFlowBitmap:(...args:Parameters<typeof postFlowBitmap>)=>postFlowBitmap(...args),
 decodeViaBitmap:(...args:Parameters<typeof decodeViaBitmap>)=>decodeViaBitmap(...args),
};
const capture1=new CameraCapture(1,video,overlay,fastTracker,detector,captureEnvironment);
const capture2=new CameraCapture(2,video2,overlay2,fastTracker2,detector2,captureEnvironment);
/** Whether camera frames are processed as they arrive (requestVideoFrameCallback) rather than at display refresh. */
const frameDriven=()=>!recordedInput()&&typeof video.requestVideoFrameCallback==='function'&&frameDrivenEnabled(captureSettings.frameDriven,cameraMode(),true);
/** Whether camera frames come from the camera track rather than the <video> element (frame-driven and supported). */
const trackFramesActive=()=>frameDriven()&&trackProcessor()!==null;
const flowMinIntervalMs=()=>frameDriven()?FLOW_MIN_INTERVAL_MS.frameDriven:FLOW_MIN_INTERVAL_MS.display;
// Optical-flow frames as transferred bitmaps (src/input/flowFrames.ts): the flow worker reads the
// pixels, so the main thread skips its canvas draw and getImageData. Off during Lab replay and after
// any bitmap error, when the previous ImageData path is used.
let bitmapFlowAvailable=flowBitmapsSupported();
const {postFlowBitmap,decodeViaBitmap}=bitmapRequests(()=>{bitmapFlowAvailable=false;});
const useBitmapFlow=()=>bitmapFlowAvailable&&flowFrameSettings.useBitmaps&&!recordedInput();
async function detectFrame(now:number){
 if(!stream||!detectorReady||!video.videoWidth)return;
 // Run decode faster when flow has no usable marker; only one decode can be in flight.
 const recovering=idleNoMarkers||now-latestFlowAt>120;
 const frame=capture1.begin(now,recovering);if(!frame)return;
 const session=cameraSession;
 const {doFlow:doFast,doDecode:doSlow,toNative,toFlow,capturedAt:frameCapturedAt,pairAt:framePairAt}=frame;
 try{
 if(doFast){
  const capturedAt=frameCapturedAt;
  const flowResult=capture1.requestFlow(frame,now);
  void flowResult.then(found=>{
   if(session!==cameraSession)return;
   perf.sample('Camera 1 flow frame age',performance.now()-capturedAt);fastFrames++;
   const stamp=performance.now();
   if(capturedAt<lastAppliedFrameAt)return;
   lastAppliedFrameAt=capturedAt;
   // A fresh optical-flow result supersedes the last decoder snapshot.
   // When flow fails, keep a recently decoded marker briefly, but never indefinitely.
   if(found.length){
    recordFlowMotion(flowMotion,found,stamp);
    for(const m of found)markerLastConfirmed.set(m.id,stamp);
    observations=found;observationsAt=stamp;latestFlowAt=stamp;stereoFrames.push(0,framePairAt,found);idleNoMarkers=false;detector.seed(toNative(found));drawDetections();}
   else {
     // A missing optical-flow frame must not erase a freshly decoded stationary marker.
     const decodedHold=holdDecodedMarkers(observations,markerLastDecoded,markerLastConfirmed,stamp);
     observations=decodedHold;stereoFrames.push(0,framePairAt,[]);
     observationsAt=stamp;idleNoMarkers=decodedHold.length===0;
     capture1.lastDecodeAt=Math.min(capture1.lastDecodeAt,stamp-65);drawDetections();
    }
   if(stamp-fastWindow>=1000){
    diag('detection-fps').textContent=(fastFrames*1000/(stamp-fastWindow)).toFixed(1)+' flow / '+(slowFrames*1000/(stamp-fastWindow)).toFixed(1)+' decode';
    fastFrames=0;slowFrames=0;fastWindow=stamp;
   }
  }).catch(e=>{if(session===cameraSession)diag('note').textContent='Flow error: '+String(e);}).finally(()=>{capture1.flowBusy=false;});
 }
 if(doSlow){
  const {request:decodeRequest,region,flowSeedFrame}=capture1.requestDecode(frame,now,toNative(liveMarkers()),detectionPreviews);
  const {left,top,width:regionW,height:regionH}=region,cropped=region.kind!=='full';
  const capturedAt=frameCapturedAt;
  void decodeRequest.then(nativeFound=>{
   const nativeMarkers=offsetMarkers(nativeFound,left,top);
   const found=toFlow(nativeMarkers);
   if(session!==cameraSession)return;capture1.search.result(nativeMarkers);perf.sample('Camera 1 '+region.kind+' decode worker',detector.diagnostics.durationMs);
   if(cornerDebug.checked)for(const marker of found)rawDecodedCorners.set(marker.id,{marker,capturedAt,receivedAt:performance.now()});
   perf.sample('Camera 1 decode frame age',performance.now()-capturedAt);slowFrames++;framesAnalyzed++;
   for(const [name,text] of Object.entries(decodeDiagnosticsText({frames:framesAnalyzed,matched:found.length,outlines:detector.candidateCorners.length,cropped,regionW,regionH,regionKind:region.kind,decoder:detector.diagnostics,flowNote:fastTracker.diagnostics.note})))diag(name).textContent=text;
   if(found.length){
    const decodeStamp=performance.now();
    if(decodeStamp-capturedAt<180)stereoFrames.push(0,framePairAt,found);
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
    const corrected=arucoCorrection.checked?driftCorrections(found,active,flowMotion,decodeStamp,capturedAt):[];
    const applyCorrections=()=>{
     if(!corrected.length)return;
     const ids=new Set(corrected.map(m=>m.id));
     observations=[...observations.filter(m=>!ids.has(m.id)),...corrected];
     detector.seed(toNative(corrected));
     for(const marker of corrected){markerLastConfirmed.set(marker.id,decodeStamp);}
     observationsAt=decodeStamp;
     drawDetections();
    };
    if(stale){
     staleDecodeDrops++;perf.count('Camera 1 stale decode results');
     if(missing.length&&recoveryFresh){
      for(const marker of missing){markerLastConfirmed.set(marker.id,decodeStamp);}
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
     for(const marker of missing){markerLastConfirmed.set(marker.id,decodeStamp);}
     observations=[...active,...missing];
     observationsAt=decodeStamp;
     idleNoMarkers=observations.length===0;
     applyCorrections();
     drawDetections();
    }
   }
  }).catch(e=>{if(session===cameraSession){status.textContent='Detection error: '+String(e);diag('note').textContent='Decoder error';}}).finally(()=>{capture1.decodeBusy=false;});
 }
 }finally{frame.close();}
}

const resize=new ResizeObserver(()=>{if(!renderer)return;const w=mount.clientWidth,h=mount.clientHeight;if(w<1||h<1)return;renderer.setDrawingBufferSize(w,h,Math.min(window.devicePixelRatio,1.5,Math.sqrt(1500000/(w*h))));camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});if(!embeddedTracking)resize.observe(mount);
const rawRenderedPoses=new Map<InstrumentName,TrackedPoseFilter>();
const restLocks=new Map<InstrumentName,RestLock>();
let last=performance.now();
let lastPoseMessage=0;
let lastEmbeddedFpsReport=0;
let embeddedFrames=0;
function animate(now:number){const loopStarted=performance.now();perf.tick('Tracking loop');perf.sample('Tracking frame interval',Math.max(0,now-last));if(stream&&lastAppliedFrameAt>0)perf.sample('Camera 1 applied image age',Math.max(0,performance.now()-lastAppliedFrameAt));if(stream2&&observationsAt&&secondaryObservationsAt)perf.sample('Camera accepted-update skew',Math.abs(observationsAt-secondaryObservationsAt));const dt=Math.min((now-last)/1000,.05);last=now;
 updateRotationStageReadout();
 if(!simulation.checked){
  for(const [name,mesh] of [['needleDriver',driver],['forceps',forceps],['scissors',scissors]] as const){
   const target=liveTargets.get(name);
   const metric=stereoActive(),stereo=metric?stereoPositions.get(name):undefined;
   let fallback:ReturnType<StereoFallback['update']>=null;
   if(metric){
    const controller=getOrCreate(stereoFallbacks,name,()=>new StereoFallback());
    const fusion=controller;
    fallback=perf.measure('Stereo fusion (render loop)',()=>{
     const views=stereoMonoViews(name,now);
     const orientation=stereo?.quaternion;
     return fusion.update(stereo&&orientation?{position:stereo.position.clone().multiply(new THREE.Vector3(200,-200,-200)),quaternion:orientation,at:stereo.lastSeen}:undefined,views,now);
    });
    stereoFallbackStatus.set(name,fallback?.source??'lost');
   }
   if(metric?!!fallback:target&&now-target.lastSeen<trackingHoldMs){
    const raw=getOrCreate(rawRenderedPoses,name,()=>new TrackedPoseFilter());
    if(fallback?.source==='stereo'&&name==='needleDriver')stereoSetup.feedWorkspace(fallback.position,now);
    // Stereo: hold a still instrument steady against small-marker pose wobble.
    let steady=fallback?restLocks.get(name):undefined;if(fallback&&!steady){steady=new RestLock();restLocks.set(name,steady);}
    const stereoPose=fallback?steady!.update(fallback.position,fallback.quaternion):undefined;
    raw.update(stereoPose?workspacePracticePosition(stereoPose.position,stereoSetup.workspace):target!.position,stereoPose?.quaternion??target!.quaternion,now);
    const calibrated=instrumentCalibration.transform(name,raw.position,raw.quaternion,fallback?.at??target!.lastSeen,metric);
    // Stereo tip calibration (src/input/stereoTipCalibration.ts): feed rocking poses; with a calibrated
    // tip, place the instrument at its real tip in the shared workspace (src/input/sharedTipFrame.ts).
    if(fallback?.source==='stereo')stereoTipCalibration.feed(name,{position:fallback.position,quaternion:fallback.quaternion},now);
    // Shared practice frame at the calibrated tip (src/input/stereoTipPose.ts).
    const shared=stereoPose?stereoTipPose(name,stereoPose,trackerType,stereoTipCalibration,stereoSetup.workspace,tableHeight.points(),calibrated.quaternion):null;
    const sharedFrame=!!shared;
    if(shared){
     calibrated.position.copy(shared.position);calibrated.quaternion.copy(shared.quaternion);
     latestStereoTips.set(name,{mm:shared.tipMm.clone(),at:now});
     motionRecorder.add(name,shared.tipMm,now);
    }else latestStereoTips.delete(name);
    mesh.position.copy(calibrated.position);mesh.quaternion.copy(calibrated.quaternion);
    // The standalone lab remains the camera/diagnostic owner. When embedded,
    // publish the exact rendered pose to the simulator on the same origin.
    if(embeddedTracking&&(root.dataset.embedded==='true'||now-lastPoseMessage>=32)){
     publishTrackingMessage({type:TRACKING_MESSAGE.pose,instrument:name,
      position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),seenAt:Date.now(),shared:sharedFrame,...(sharedFrame?{unitsPerMm:practiceUnitsPerMm(stereoSetup.workspace)}:{})},root.dataset.embedded==='true');
    }
   }
  }
  if(embeddedTracking)lastPoseMessage=now;
 }
 if(simulation.checked){
  moveSimulatedInstruments(keys,dt,{driver,forceps,scissors});
  setText(driverReadout,simulatedReadout(driver.position));
  setText(scissorsReadout,simulatedReadout(scissors.position));
  setText(forcepsReadout,simulatedReadout(forceps.position));
 }
 renderFrames++;if(now-lastFpsTime>=1000){renderFps=Math.round(renderFrames*1000/(now-lastFpsTime));renderFrames=0;lastFpsTime=now;diag('note').title='Virtual FPS '+renderFps+' · detector frames skipped '+skippedFrames+' · mode '+(idleNoMarkers?'idle':'tracking');}
 // Frame-driven capture starts from each camera's frame callback instead (see observeCameraFrames below).
 if(!recordedInput()&&!frameDriven()){void detectFrame(now);void detectSecondFrame(now);}
 if(stereoSetup.enabled.checked){
  const blocked=stereoBlockedReason({calibrated:!!stereoSetup.calibration,stereoMode:trackingMode.value==='stereo',simulated:simulation.checked,
   mismatch:()=>calibrationMatches(stereoSetup.calibration!,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight)});
  if(blocked)setText(stereoSetup.triangulationStatus,blocked);
  else{
    const synchronized=stereoFrames.pair(now),notes:string[]=[];
    if(!synchronized)notes.push('No time-matched camera pair: '+(stereoFrames.lastFailure??'unknown'));
    latestPairingFailure=synchronized?null:stereoFrames.lastFailure??'unknown';
    for(const name of ['needleDriver','forceps','scissors'] as const){
     const rigid=stereoPrismRotation(name,now);
     // Status note and the fit error the camera-moved monitor watches (src/input/stereoIndicator.ts).
     const report=stereoInstrumentReport(name,rigid,synchronized,markerGroups()[name],stereoRejections.get(name));
     if(report.note)notes.push(report.note);
     if(report.fitErrorPx!==null)cameraMovedMonitor.feed(now,report.fitErrorPx);
     if(!rigid||!synchronized)continue;
     if(stereoPositions.get(name)?.lastSample!==synchronized.at)stereoPositions.accept(name,stereoPracticePosition(rigid.translation),rigid.quaternion,synchronized.at);
    }
    setText(stereoSetup.triangulationStatus,notes.length?notes.join(' | '):'Waiting for a consistent rigid stereo pose. Each camera may see different tracker faces; both views must fit the calibrated geometry.');
  }
 }
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
// Frame-driven capture (src/input/captureScheduling.ts): process each camera's frame as it arrives.
observeCameraFrames(video,count=>{perf.tick('Camera 1 presented frames',count);if(frameDriven())void detectFrame(performance.now());},frameDriven);
observeCameraFrames(video2,count=>{perf.tick('Camera 2 presented frames',count);if(frameDriven())void detectSecondFrame(performance.now());},frameDriven);
const performanceContext=()=>({build:'0.226',frameSource:trackFramesActive()?'camera track':frameDriven()?'video frame callback':'display',flowBackoff:{camera1:{costMs:capture1.budget.costMs??null,intervalMs:capture1.budget.intervalMs(flowMinIntervalMs())},camera2:{costMs:capture2.budget.costMs??null,intervalMs:capture2.budget.intervalMs(flowMinIntervalMs())}},revision:__SUTUREHERO_REVISION__,mode:embeddedTracking?'embedded':'standalone',userAgent:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,trackerType,graphics:document.querySelector<HTMLSelectElement>('#graphics-quality')?.value??'standalone',camera1:{width:video.videoWidth,height:video.videoHeight,requestedFps:video.srcObject?(video.srcObject as MediaStream).getVideoTracks()[0]?.getSettings().frameRate:null},camera2:{width:video2.videoWidth,height:video2.videoHeight},decode1:detector.lastFrameSize,flow1:fastTracker.lastFrameSize,decode2:detector2.lastFrameSize,flow2:fastTracker2.lastFrameSize,decodeIntervalMs:roiDecodeToggle.checked?65:110,recoveryIntervalMs:65,globalScanIntervalMs:DISCOVERY_INTERVAL_MS,snapshotBackend1:capture1.snapshotBackend,snapshotBackend2:capture2.snapshotBackend,depth:{nearMm:depthRangeState.nearMm,farMm:depthRangeState.farMm,spanMm:Number(workingDepthInput.value),sensitivity:Number(depthSensitivity.value),instruments:Object.fromEntries([...filterMeasurements].map(([name,m])=>[name,{distanceMm:m.rawZ,sourceZ:m.filteredZ,locked:m.locked,source:m.source,measurementValid:m.valid}]))},roiDecode:roiDecodeToggle.checked,stereoActive:stereoActive(),stereoSources:Object.fromEntries(stereoFallbackStatus),stereoRejections:Object.fromEntries(stereoRejections),staleDecodeDrops});
mountPerformancePanel(diagnosticsHost,performanceContext);
// Bluetooth Hall-sensor jaw (src/ui/HallSensorPanel.ts): the only jaw input (camera jaw tracking removed in build 0.205).
mountHallSensorPanel(document.querySelector<HTMLElement>('#jaw-sensor-controls')!,(name,opening)=>sendJawOpening(name,opening,[]));
mountMotionMetricsPanel(diagnosticsHost,()=>performanceContext().build);
// Live profiler (Diagnostics → Performance): off by default, measurement only.
mountProfilerPanel(diagnosticsHost,new LiveProfiler(perf,[{index:1,video},{index:2,video:video2}]),performanceContext);
// Main-screen status strip: setup checklist, camera-moved warning, holding reasons (src/ui/trackingStatusStrip.ts).
mountTrackingStatusStrip(()=>{
 const stereoMode=trackingMode.value==='stereo',metric=stereoMode&&!!stereoSetup.calibration;
 const instrument=(name:InstrumentName)=>({
  lastSeen:liveTargets.get(name)?.lastSeen,
  neutralSaved:!!instrumentCalibration.savedNeutral(name,metric),
  depthSource:filterMeasurements.get(name)?.source,
  markerSidePx:markerSides.get(name),
  stereoRejection:stereoRejections.get(name),
  tipCalibrated:!!stereoTipCalibration.saved(name,trackerType),
 });
 return {
  stereoMode,camera1Running:!!stream&&video.videoWidth>0,camera2Running:!!stream2&&video2.videoWidth>0,
  stereoCalibrated:!!stereoSetup.calibration,
  calibrationMismatch:stereoSetup.calibration?calibrationMatches(stereoSetup.calibration,select.value,select2.value,video.videoWidth,video.videoHeight,video2.videoWidth,video2.videoHeight)||null:null,
  pairingFailure:latestPairingFailure,workspaceSet:!!stereoSetup.workspace,tableSet:tableHeight.points().length>=TABLE_POINTS,
  instruments:{needleDriver:instrument('needleDriver'),forceps:instrument('forceps'),scissors:instrument('scissors')},
 };
},now=>cameraMovedMonitor.check(now));

// Tracking Lab access to the live page (src/trackingLab/bridge.ts).
export const trackingLabBridge=createTrackingLabBridge({
 videos:()=>[video,video2],
 running:camera=>!!(camera?stream2:stream),
 startPrimary:startPrimaryCamera,startSecondary:startSecondaryCamera,
 stereoMode:()=>trackingMode.value==='stereo',
 primaryDeviceId:()=>stream?.getVideoTracks()[0]?.getSettings().deviceId??select.value,
 secondarySelect:select2,availableCameras,
 instrumentProfiles:()=>Object.fromEntries((['needleDriver','forceps','scissors'] as const).map(name=>[name,instrumentCalibration.profile(name)])),
 observationsAt:camera=>camera?secondaryObservationsAt:observationsAt,
 workers:camera=>camera?[detector2,fastTracker2]:[detector,fastTracker],
 presentedAt:camera=>frameClock(camera?video2:video)?.presentedAt,
 liveMarkers:camera=>camera?liveSecondMarkers():liveMarkers(),
 overlaySize:camera=>camera?overlay2:overlay,
 statusText:()=>(stereoViewLabel.textContent??'')+(stereoActive()&&stereoSetup.triangulationStatus.textContent?'\n'+stereoSetup.triangulationStatus.textContent:''),
 stereoActive,
 liveTargets:()=>liveTargets,
 recordedInput:()=>!!recordedInput(),
 detect:(camera,at)=>camera?detectSecondFrame(at):detectFrame(at),
 busy:()=>detector.busy||detector2.busy||fastTracker.busy||fastTracker2.busy||capture1.flowBusy||capture2.flowBusy||capture1.decodeBusy||capture2.decodeBusy,
 updateLiveTargets,animate,
});
