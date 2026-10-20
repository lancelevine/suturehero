import * as THREE from 'three';
import {availableCameras,groupMarkers,openCamera,type MarkerObservation} from './input/arucoTracking';
import {UnconfiguredDetector} from './input/arucoDetector';
import './style.css';
import './tracking.css';

const root=document.querySelector<HTMLDivElement>('#tracking-app')!;
root.innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">INSTRUMENT TRACKING LAB</span><a href="./">← Return to practice</a></header>
<main class="tracking-layout"><section class="tracking-panel"><div class="eyebrow">01 / CAMERA</div><h1>Instrument tracking</h1><p class="intro">Preview your webcam and test simulated instrument motion. Live ArUco recognition is the next integration step.</p>
<div class="tracking-actions"><label for="camera-select">Camera</label><select id="camera-select"><option value="">Default camera</option></select><button id="start-camera">Start camera</button><button id="stop-camera" disabled>Stop camera</button></div>
<div class="tracking-video"><video id="camera-video" autoplay playsinline muted></video><canvas id="camera-overlay"></canvas><span id="camera-placeholder">Camera is off</span></div>
<p class="tracking-message" id="camera-status" role="status">Ready. Camera permission requires localhost or HTTPS.</p>
<div class="tracking-actions"><label><input id="simulation" type="checkbox" checked> Simulated input</label><button id="reset-sim">Reset positions</button></div>
<p class="tracking-message">Simulation: move the needle driver with arrow keys, forceps with W/A/S/D. Hold Shift for faster movement. This is a 2D movement demonstration, not 6-DOF optical tracking.</p>
</section><section class="tracking-panel"><div class="eyebrow">02 / VIRTUAL VIEW</div><h2>Instrument diagnostics</h2><div id="tracking-scene"></div><div class="tracking-stats"><div><strong>Needle driver</strong><span id="driver-readout">Simulated · (0, 0)</span></div><div><strong>Forceps</strong><span id="forceps-readout">Simulated · (0, 0)</span></div><div><strong>Detected markers</strong><span id="marker-readout">Not configured</span></div></div><p class="tracking-message">ArUco dictionary: DICT_4X4_50 · Driver IDs 0–2 · Forceps IDs 3–5. Camera preview works now; physical marker detection and prism pose estimation are not yet enabled.</p></section></main>`;
const video=document.querySelector<HTMLVideoElement>('#camera-video')!;
const overlay=document.querySelector<HTMLCanvasElement>('#camera-overlay')!;
const status=document.querySelector<HTMLElement>('#camera-status')!;
const start=document.querySelector<HTMLButtonElement>('#start-camera')!;
const stop=document.querySelector<HTMLButtonElement>('#stop-camera')!;
const select=document.querySelector<HTMLSelectElement>('#camera-select')!;
const simulation=document.querySelector<HTMLInputElement>('#simulation')!;
let stream:MediaStream|null=null;
async function refreshCameras(){
 try {const current=select.value;const devices=await availableCameras();select.innerHTML='<option value="">Default camera</option>';devices.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||`Camera ${i+1}`;select.append(o)});select.value=devices.some(d=>d.deviceId===current)?current:'';}catch{ /* permission or unsupported */ }
}
async function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;start.disabled=false;stop.disabled=true;status.textContent='Camera stopped.';}
start.addEventListener('click',async()=>{
 try {await stopCamera();stream=await openCamera(select.value||undefined);video.srcObject=stream;await video.play();start.disabled=true;stop.disabled=false;status.textContent='Camera preview running. ArUco detection not yet connected.';await refreshCameras();}
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
const detector=new UnconfiguredDetector(); // Replace with validated ArUco WASM detector in next milestone.
const noMarkers:MarkerObservation[]=[];
const observed=groupMarkers(noMarkers); // wiring contract exercised even without detector
void detector;void observed;
const resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();});resize.observe(mount);
let last=performance.now();
function animate(now:number){const dt=Math.min((now-last)/1000,.05);last=now;
 if(simulation.checked){const speed=(keys.has('shift')?2:1)*dt;
  driver.position.x+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*speed;driver.position.z+=(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*speed;
  forceps.position.x+=(Number(keys.has('d'))-Number(keys.has('a')))*speed;forceps.position.z+=(Number(keys.has('s'))-Number(keys.has('w')))*speed;
 }
 driver.position.x=THREE.MathUtils.clamp(driver.position.x,-2,2);driver.position.z=THREE.MathUtils.clamp(driver.position.z,-2,2);
 forceps.position.x=THREE.MathUtils.clamp(forceps.position.x,-2,2);forceps.position.z=THREE.MathUtils.clamp(forceps.position.z,-2,2);
 document.querySelector('#driver-readout')!.textContent=simulation.checked?`Simulated · (${driver.position.x.toFixed(2)}, ${driver.position.z.toFixed(2)})`:'Waiting for tracker';
 document.querySelector('#forceps-readout')!.textContent=simulation.checked?`Simulated · (${forceps.position.x.toFixed(2)}, ${forceps.position.z.toFixed(2)})`:'Waiting for tracker';
 if(video.videoWidth){overlay.width=video.videoWidth;overlay.height=video.videoHeight;}
 renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{void stopCamera();resize.disconnect();renderer.dispose();});
