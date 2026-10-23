import * as THREE from 'three';
import {availableCameras,groupMarkers,openCamera,type MarkerObservation} from './input/arucoTracking';
import {BrowserArucoDetector} from './input/arucoDetector';
import './style.css';
import './tracking.css';

declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">INSTRUMENT TRACKING LAB · BUILD ${__SUTUREHERO_BUILD__} (${__SUTUREHERO_REVISION__})</span><a href="./">← Return to practice</a></header>
<main class="tracking-layout"><section class="tracking-panel"><div class="eyebrow">01 / CAMERA</div><h1>Instrument tracking</h1><p class="intro">Start your webcam to detect ArUco markers IDs 0–8. Outlines and IDs appear on the video.</p>
<div class="tracking-actions"><label for="camera-select">Camera</label><select id="camera-select"><option value="">Default camera</option></select><button id="start-camera">Start camera</button><button id="stop-camera" disabled>Stop camera</button></div>
<div class="tracking-video"><video id="camera-video" autoplay playsinline muted></video><canvas id="camera-overlay"></canvas><span id="camera-placeholder">Camera is off</span></div>
<p class="tracking-message"><span style="color:#d49a00;font-weight:bold">Yellow</span> = candidate square · <span style="color:#179a68;font-weight:bold">Green</span> = decoded marker</p>
<p class="tracking-message" id="camera-status" role="status">Ready. Camera permission requires localhost or HTTPS.</p>
<div class="tracking-stats" aria-label="Live camera diagnostics">
<div><strong>Camera resolution</strong><span id="diag-resolution">Not started</span></div>
<div><strong>Frames analyzed</strong><span id="diag-frames">0</span></div>
<div><strong>Candidate squares</strong><span id="diag-candidates">—</span></div><div><strong>Outlines drawn</strong><span id="diag-outlines">—</span></div>
<div><strong>Decoded markers</strong><span id="diag-decoded">—</span></div>
<div><strong>Detection time</strong><span id="diag-time">—</span></div><div><strong>Detection pass</strong><span id="diag-pass">—</span></div><div><strong>Image contrast</strong><span id="diag-contrast">—</span></div>
<div><strong>Detection status</strong><span id="diag-note">Waiting for camera</span></div>
</div>
<div class="tracking-actions"><label><input id="simulation" type="checkbox" checked> Simulated input</label><button id="reset-sim">Reset positions</button></div>
<p class="tracking-message">Simulation: move the needle driver with arrow keys, forceps with W/A/S/D. Hold Shift for faster movement. This is a 2D movement demonstration, not 6-DOF optical tracking.</p>
</section><section class="tracking-panel"><div class="eyebrow">02 / VIRTUAL VIEW</div><h2>Instrument diagnostics</h2><div id="tracking-scene"></div><div class="tracking-stats"><div><strong>Needle driver</strong><span id="driver-readout">Simulated · (0, 0)</span></div><div><strong>Forceps</strong><span id="forceps-readout">Simulated · (0, 0)</span></div><div><strong>Detected markers</strong><span id="marker-readout">Waiting for camera</span></div></div><p class="tracking-message">ArUco dictionary: DICT_4X4_50 · Driver IDs 0–2 · Forceps IDs 3–5. Live 2D marker detection enabled. 3D pose estimation is not yet implemented.</p></section></main>`;
const video=document.querySelector<HTMLVideoElement>('#camera-video')!;
const overlay=document.querySelector<HTMLCanvasElement>('#camera-overlay')!;
const status=document.querySelector<HTMLElement>('#camera-status')!;
const start=document.querySelector<HTMLButtonElement>('#start-camera')!;
const stop=document.querySelector<HTMLButtonElement>('#stop-camera')!;
const select=document.querySelector<HTMLSelectElement>('#camera-select')!;
const simulation=document.querySelector<HTMLInputElement>('#simulation')!;
const markerReadout=document.querySelector<HTMLElement>('#marker-readout')!;
const driverReadout=document.querySelector<HTMLElement>('#driver-readout')!;
const forcepsReadout=document.querySelector<HTMLElement>('#forceps-readout')!;
const detector=new BrowserArucoDetector();
const diag=(name:string)=>document.querySelector<HTMLElement>('#diag-'+name)!;
let framesAnalyzed=0;
const frameCanvas=document.createElement('canvas');
const frameContext=frameCanvas.getContext('2d',{willReadFrequently:true})!;
const overlayContext=overlay.getContext('2d')!;
let observations:MarkerObservation[]=[];
let detectorReady=false,processing=false,lastDetection=0,cameraSession=0;
let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value;const devices=await availableCameras();select.innerHTML='<option value="">Default camera</option>';devices.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Camera ${i+1}`;select.append(o)});select.value=devices.some(d=>d.deviceId===current)?current:'';}catch{ /* permission or unsupported */ }
}
async function stopCamera(){cameraSession++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;observations=[];overlayContext.clearRect(0,0,overlay.width,overlay.height);start.disabled=false;stop.disabled=true;status.textContent='Camera stopped.';markerReadout.textContent='Camera stopped';diag('note').textContent='Camera stopped';}
start.addEventListener('click',async()=>{
 try {await stopCamera();detectorReady=false;stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();framesAnalyzed=0;diag('frames').textContent='0';const settings=stream.getVideoTracks()[0]?.getSettings();diag('resolution').textContent=`${video.videoWidth} × ${video.videoHeight} (requested 1920 × 1080)${settings?.frameRate?' · '+Math.round(settings.frameRate)+' fps':''}`;start.disabled=true;stop.disabled=false;status.textContent='Camera running. Loading marker detector…';const session=cameraSession;await detector.initialize();if(session!==cameraSession)return;detectorReady=true;status.textContent='Live ArUco detection running. Hold a marker in view.';await refreshCameras();}
 catch(e){status.textContent=`Camera error: ${e instanceof Error?e.message:String(e)}`;}
});
stop.addEventListener('click',stopCamera);
select.addEventListener('change',()=>{if(stream)void stopCamera();});
void refreshCameras();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x15242c);
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,3.7,6);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
const mount=document.querySelector<HTMLElement>('#tracking-scene')!;mount.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x63788a,2));
const grid=new THREE.GridHelper(5,10,0x527d85,0x304852);scene.add(grid);
function instrument(color:number){const group=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,2.3,10),new THREE.MeshStandardMaterial({color,metalness:.6,roughness:.32}));body.rotation.z=Math.PI/2;group.add(body);const tip=new THREE.Mesh(new THREE.ConeGeometry(.11,.4,10),new THREE.MeshStandardMaterial({color:0xd7e1e4}));tip.rotation.z=-Math.PI/2;tip.position.x=1.25;group.add(tip);group.position.y=.25;scene.add(group);return group;}
const driver=instrument(0xe3b47e),forceps=instrument(0x68d1bb);
driver.position.z=-.65;forceps.position.z=.65;
const keys=new Set<string>();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelector('#reset-sim')!.addEventListener('click',()=>{driver.position.set(0,.25,-.65);forceps.position.set(0,.25,.65);});
function drawDetections(){
 const w=overlay.width,h=overlay.height;overlayContext.clearRect(0,0,w,h);
 for(const pts of detector.candidateCorners){overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();overlayContext.strokeStyle='#ffdb32';overlayContext.lineWidth=4;overlayContext.stroke();}
 for(const marker of observations){const pts=marker.corners;overlayContext.beginPath();overlayContext.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)overlayContext.lineTo(pts[i].x,pts[i].y);overlayContext.closePath();overlayContext.strokeStyle='#18e89d';overlayContext.lineWidth=3;overlayContext.stroke();overlayContext.fillStyle=overlayContext.strokeStyle;overlayContext.font='bold 20px sans-serif';overlayContext.fillText('ID '+marker.id,pts[0].x,Math.max(22,pts[0].y-8));}
 const groups=groupMarkers(observations);
 markerReadout.textContent=observations.length?observations.map(m=>m.id).sort((a,b)=>a-b).join(', '):'None visible';
 if(!simulation.checked){driverReadout.textContent=groups.find(g=>g.name==='needleDriver')?'Visible · 2D marker tracked':'Not visible';forcepsReadout.textContent=groups.find(g=>g.name==='forceps')?'Visible · 2D marker tracked':'Not visible';}
}
async function detectFrame(now:number){
 if(!stream||!detectorReady||processing||!video.videoWidth||now-lastDetection<90)return;
 lastDetection=now;processing=true;const session=cameraSession;
 try{
  const w=video.videoWidth,h=video.videoHeight;if(frameCanvas.width!==w||frameCanvas.height!==h){frameCanvas.width=w;frameCanvas.height=h;overlay.width=w;overlay.height=h;}
  frameContext.drawImage(video,0,0,w,h);const found=await detector.detect(frameContext.getImageData(0,0,w,h));
  if(session===cameraSession){observations=found;framesAnalyzed++;diag('frames').textContent=String(framesAnalyzed);diag('candidates').textContent=detector.diagnostics.candidateCount===null?'Unavailable':String(detector.diagnostics.candidateCount);diag('outlines').textContent=String(detector.candidateCorners.length);diag('decoded').textContent=`${detector.diagnostics.recognizedCount} matched · ${detector.diagnostics.rawMarkerCount} total`;diag('time').textContent=detector.diagnostics.durationMs.toFixed(0)+' ms';diag('pass').textContent=detector.diagnostics.pass;diag('contrast').textContent=detector.diagnostics.contrast;diag('note').textContent=detector.diagnostics.note;drawDetections();}
 }catch(e){status.textContent='Detection error: '+(e instanceof Error?e.message:String(e));detectorReady=false;diag('note').textContent='Detector threw an error';}
 finally{processing=false;}
}
const resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});resize.observe(mount);
let last=performance.now();
function animate(now:number){const dt=Math.min((now-last)/1000,.05);last=now;
 if(simulation.checked){const speed=(keys.has('shift')?2:1)*dt;
  driver.position.x+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*speed;driver.position.z+=(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*speed;
  forceps.position.x+=(Number(keys.has('d'))-Number(keys.has('a')))*speed;forceps.position.z+=(Number(keys.has('s'))-Number(keys.has('w')))*speed;
 }
 driver.position.x=THREE.MathUtils.clamp(driver.position.x,-2,2);driver.position.z=THREE.MathUtils.clamp(driver.position.z,-2,2);
 forceps.position.x=THREE.MathUtils.clamp(forceps.position.x,-2,2);forceps.position.z=THREE.MathUtils.clamp(forceps.position.z,-2,2);
 if(simulation.checked)driverReadout.textContent=`Simulated · (${driver.position.x.toFixed(2)}, ${driver.position.z.toFixed(2)})`;
 if(simulation.checked)forcepsReadout.textContent=`Simulated · (${forceps.position.x.toFixed(2)}, ${forceps.position.z.toFixed(2)})`;
 void detectFrame(now);
 renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{void stopCamera();resize.disconnect();renderer.dispose();});
