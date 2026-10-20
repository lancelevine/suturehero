import * as THREE from 'three';
import type { GuidedKnot } from '../suture/GuidedKnot';
import type { Instrument } from '../instruments/Instrument';
/** Geometric thread poses illustrate stages; they do not certify knot security. */
export class KnotView {
  readonly root=new THREE.Group();
  private thread=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:0x355fb0,roughness:0.7}));
  private seated=new THREE.Group();
  private tailMarker=new THREE.Mesh(new THREE.SphereGeometry(0.055,12,8),new THREE.MeshBasicMaterial({color:0xf0c277,depthTest:false}));
  private stamp=''; private count=-1;
  constructor() {this.thread.castShadow=true;this.tailMarker.renderOrder=4;this.root.add(this.thread,this.seated,this.tailMarker);}
  update(knot: GuidedKnot,tools: readonly Instrument[],entry: THREE.Vector3,exit: THREE.Vector3,eye: THREE.Vector3) {
    this.root.visible=knot.active; if(!knot.active) {this.stamp='';return;}
    const left=tools.find(t=>t.id==='left')!,right=tools.find(t=>t.id==='right')!;
    const jaw=(tool:Instrument)=>{tool.root.updateWorldMatrix(true,false);return tool.root.localToWorld(new THREE.Vector3(0,0,0.05));};
    const leftJaw=jaw(left),rightJaw=jaw(right);
    this.tailMarker.visible=knot.phase==='tail';this.tailMarker.position.copy(knot.tail);
    const key=[knot.phase,knot.throws,knot.wrap.toFixed(3),knot.seating.toFixed(3),entry.x.toFixed(4),exit.x.toFixed(4)].join(':');
    if(key===this.stamp)return;this.stamp=key;
    const seating=knot.phase==='seating'?knot.seating:knot.phase==='between' || knot.phase==='complete'?1:0;
    const tail=knot.phase==='seating' || knot.phase==='between' || knot.phase==='complete'?rightJaw:knot.tail;
    const slack=1-knot.takeUp;
    const tailBend=tail.clone().lerp(entry,0.5).add(new THREE.Vector3(0,0.12*slack,0.18*slack));
    const points=[tail.clone(),tailBend,entry.clone(),new THREE.Vector3(0,0.15,0),exit.clone()];
    const center=right.root.position.clone().add(new THREE.Vector3(0,0,0.55)).lerp(new THREE.Vector3(0,0.47,0),seating);
    const fraction=knot.phase==='wrapping'?knot.wrap:1;
    if(fraction>0) {
      const steps=Math.max(2,Math.ceil(fraction*48));
      for(let i=0;i<=steps;i++) {
        const a=i/steps*fraction*Math.PI*2*knot.direction;
        const radius=0.14*(1-seating)+0.025*seating;
        points.push(center.clone().add(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,(i/steps-0.5)*0.12*(1-seating))));
      }
    }
    points.push(center.clone().lerp(leftJaw,0.5).add(new THREE.Vector3(0,-0.15*slack,0.08*slack)),leftJaw,
      leftJaw.clone().lerp(eye,0.5).add(new THREE.Vector3(0,-0.2,0.15)),eye.clone());
    (this.thread.material as THREE.MeshStandardMaterial).color.copy(new THREE.Color(0x4b79b5)).lerp(new THREE.Color(0x294a87),knot.takeUp);
    const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal'),128,0.012,6,false);
    this.thread.geometry.dispose();this.thread.geometry=geometry;
    if(this.count!==knot.throws) {
      this.count=knot.throws;
      for(const child of [...this.seated.children]) {this.seated.remove(child);(child as THREE.Mesh).geometry.dispose();}
      for(let n=0;n<knot.throws;n++) {
        const crossing=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return new THREE.Vector3(Math.cos(a)*0.06,0.45+n*0.025+Math.sin(a*2)*(n===0?1:-1)*0.012,Math.sin(a)*0.035);});
        const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crossing),40,0.012,6,false),this.thread.material);mesh.castShadow=true;this.seated.add(mesh);
      }
    }
  }
}
