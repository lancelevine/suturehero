import {MICRO_TRAY_Y,MICRO_FLOOR_Y} from '../environments/MicroTargets';
import { clothTexture } from '../visuals/surfaceTextures';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function createScene(container: HTMLElement) {
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x101f27); scene.fog=new THREE.Fog(0x101f27,18,40);
  const camera=new THREE.PerspectiveCamera(42,1,0.1,100); camera.position.set(7,8,10);
  const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight),false);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.3;
  container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(0,0.5,0); controls.enableDamping=true; controls.minDistance=2; controls.maxDistance=20; controls.maxPolarAngle=Math.PI*0.48; controls.update();
  scene.add(new THREE.HemisphereLight(0xd7efff,0x34434b,2.5));
  const light=new THREE.DirectionalLight(0xffeee4,4); light.position.set(2,8,4); light.castShadow=true; light.shadow.mapSize.set(2048,2048);
  light.shadow.camera.left=-6; light.shadow.camera.right=6; light.shadow.camera.top=6; light.shadow.camera.bottom=-6;
  light.shadow.camera.near=0.1; light.shadow.camera.far=22; light.shadow.normalBias=0.015; light.shadow.bias=-0.0001; scene.add(light);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x172e38,roughness:1})); floor.receiveShadow=true; floor.rotation.x=-Math.PI/2; floor.position.y=-0.1; scene.add(floor);
  const tray=new THREE.Mesh(new THREE.BoxGeometry(7,0.12,5),new THREE.MeshStandardMaterial({color:0x41626b,metalness:0.05,roughness:0.9,bumpMap:clothTexture(),bumpScale:0.012})); tray.receiveShadow=true; tray.position.y=-0.02; scene.add(tray);
  let lastWidth=0,lastHeight=0;
  const resize=new ResizeObserver(()=>{
    const width=Math.floor(container.clientWidth),height=Math.floor(container.clientHeight);
    if(width<1 || height<1 || (width===lastWidth && height===lastHeight)) return;
    lastWidth=width; lastHeight=height;
    camera.aspect=width/height; camera.updateProjectionMatrix();
    // Resize the drawing buffer only. CSS owns the display size and cannot feed back.
    renderer.setSize(width,height,false);
  }); resize.observe(container);
  return {scene,camera,renderer,controls,setMicrosurgery:(enabled:boolean)=>{tray.position.y=enabled?MICRO_TRAY_Y:-.02;floor.position.y=enabled?MICRO_FLOOR_Y:-.1;},microCloseUp:()=>{controls.target.set(0,.25,0);camera.position.set(-1.8,1.6,2.6);controls.update();},edgeCloseUp:(target:THREE.Vector3)=>{controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(-2.2,1.25,1.2));controls.update();},closeUp:(target: THREE.Vector3)=>{controls.target.copy(target); camera.position.copy(target).add(new THREE.Vector3(-2.2,4,3)); controls.update();},resetCamera:()=>{camera.position.set(7,8,10); controls.target.set(0,0.5,0); controls.update();}};
}
