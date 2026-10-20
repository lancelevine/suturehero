import { StrandMesh } from './StrandMesh';
import { knotLoop, knotTailContact } from '../suture/knotGeometry';
import type { KnotSlack } from '../suture/KnotSlack';
import * as THREE from 'three';
import type { GuidedKnot } from '../suture/GuidedKnot';
import type { Instrument } from '../instruments/Instrument';
/** Geometric thread poses illustrate stages; they do not certify knot security. */
export class KnotView {
  readonly root=new THREE.Group();
  private thread=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:0x355fb0,roughness:0.7}));
  private shortSpan=new StrandMesh(32);
  private longSpan=new StrandMesh(36);
  private continuation=new THREE.Mesh(new THREE.BufferGeometry(),this.thread.material);
  private seated=new THREE.Group();
  private tailMarker=new THREE.Mesh(new THREE.SphereGeometry(0.055,12,8),new THREE.MeshBasicMaterial({color:0xf0c277,depthTest:false}));
  private stamp=''; private count=-1;
  constructor() {this.thread.castShadow=true;this.tailMarker.renderOrder=4;this.continuation.castShadow=true;this.root.add(this.thread,this.continuation,this.shortSpan,this.longSpan,this.seated,this.tailMarker);}
  update(knot: GuidedKnot,tools: readonly Instrument[],entry: THREE.Vector3,exit: THREE.Vector3,eye: THREE.Vector3,simulation:KnotSlack) {
    this.root.visible=knot.active; if(!knot.active) {this.stamp='';return;}
    const left=tools.find(t=>t.id==='left')!,right=tools.find(t=>t.id==='right')!;
    const jaw=(tool:Instrument)=>{tool.root.updateWorldMatrix(true,false);return tool.root.localToWorld(new THREE.Vector3(0,0,0.05));};
    const leftJaw=jaw(left),rightJaw=jaw(right);
    this.tailMarker.visible=knot.phase==='tail';this.tailMarker.position.copy(knot.tail);
    this.shortSpan.visible=this.longSpan.visible=this.continuation.visible=simulation.enabled;
    if(simulation.enabled) {
      this.root.updateWorldMatrix(true,false);
      this.shortSpan.update(simulation.short.points,this.root.matrixWorld);this.longSpan.update(simulation.long.points,this.root.matrixWorld);
    }
    const key=[knot.phase,knot.throws,knot.wrap.toFixed(3),knot.seating.toFixed(3),entry.x.toFixed(4),exit.x.toFixed(4),simulation.enabled].join(':');
    if(key===this.stamp)return;this.stamp=key;
    const loop=knotLoop(knot,right.root.position);
    const tail=knot.phase==='seating' || knot.phase==='between' || knot.phase==='complete'?rightJaw:knot.tail;
    const contact=knotTailContact(knot,entry);
    const slack=1-knot.takeUp;
    const tailBend=tail.clone().lerp(contact,0.5).add(new THREE.Vector3(0,0.12*slack,0.18*slack));
    const prefix=[entry.clone(),new THREE.Vector3(0,0.15,0),exit.clone()];
    if(contact.distanceToSquared(entry)>1e-12)prefix.unshift(contact);
    const points=simulation.enabled?prefix:[tail.clone(),tailBend,...prefix];
    // Retain the seated knot connection while the opposing throw is wrapped.
    if(knot.throws>0 && knot.phase!=='between' && knot.phase!=='complete')points.push(new THREE.Vector3(0.06,0.47,0));
    points.push(...loop.points);
    if(simulation.enabled) {
      if(loop.points.length===0)points.push(loop.end);
      const tailPoints=[leftJaw,leftJaw.clone().lerp(eye,0.5).add(new THREE.Vector3(0,-0.2,0.15)),eye.clone()];
      this.continuation.geometry.dispose();this.continuation.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPoints),40,0.012,6,false);
    } else points.push(loop.center.clone().lerp(leftJaw,0.5).add(new THREE.Vector3(0,-0.15*slack,0.08*slack)),leftJaw,
      leftJaw.clone().lerp(eye,0.5).add(new THREE.Vector3(0,-0.2,0.15)),eye.clone());
    (this.thread.material as THREE.MeshStandardMaterial).color.copy(new THREE.Color(0x4b79b5)).lerp(new THREE.Color(0x294a87),knot.takeUp);
    const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),128,0.012,6,false);
    this.thread.geometry.dispose();this.thread.geometry=geometry;
    if(this.count!==knot.throws) {
      this.count=knot.throws;
      for(const child of [...this.seated.children]) {this.seated.remove(child);(child as THREE.Mesh).geometry.dispose();}
      for(let n=0;n<knot.throws;n++) {
        const crossing=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return new THREE.Vector3(Math.cos(a)*0.06,0.47+n*0.025+Math.sin(a*2)*(n===0?1:-1)*0.012,Math.sin(a)*0.035);});
        const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crossing),40,0.012,6,false),this.thread.material);mesh.castShadow=true;this.seated.add(mesh);
      }
    }
  }
}
