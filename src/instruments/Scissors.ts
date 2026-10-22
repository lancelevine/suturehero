import * as THREE from 'three';
import type {ToolCommand} from '../input/types';
import type {ThreadStrand} from '../suture/ThreadStrand';
import {closestSegments} from '../suture/StrandContact';
export class Scissors {
 readonly root=new THREE.Group();openness=.8;minimumHeight=.04;
 style:'mayo'|'westcott'='mayo';
 private blades:THREE.Group[]=[];private closedLast=false;
 private metal=new THREE.MeshStandardMaterial({color:0xcad5df,metalness:.8,roughness:.45});
 private accent=new THREE.MeshStandardMaterial({color:0x8394e8,roughness:.5});
 constructor(){this.build();this.reset();}
 setStyle(style:'mayo'|'westcott'){
  if(style===this.style)return;this.style=style;
  this.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.root.clear();this.blades=[];this.build();this.pose();
 }
 private build(){
  const metal=this.metal,westcott=this.style==='westcott';
  for(const side of [-1,1]){
   const half=new THREE.Group();half.position.set(0,side*.012,.25);
   if(westcott){
    const blade=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side*.02,0,0),new THREE.Vector3(side*.035,0,-.18),new THREE.Vector3(side*.015,0,-.36)]),20,.018,6),metal);blade.scale.y=.4;half.add(blade);
    const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side*.02,0,.1),new THREE.Vector3(side*.12,0,1.1),new THREE.Vector3(side*.12,0,1.75),new THREE.Vector3(0,0,2.1)]),24,.025,8),metal);half.add(spring);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(.075,.04,.6),metal);grip.position.set(side*.12,0,1.2);half.add(grip);
   }else{
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.055,.025,.43),metal);blade.position.set(side*.025,0,-.215);half.add(blade);
    const shank=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,1.8),metal);shank.position.set(side*.09,0,.9);half.add(shank);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.035,8,24),metal);ring.rotation.x=Math.PI/2;ring.position.set(side*.22,0,2);half.add(ring);
   }
   this.blades.push(half);this.root.add(half);
  }
  const collar=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.12),this.accent);collar.position.z=1.4;this.root.add(collar);
  this.root.name=westcott?'westcott-scissors':'mayo-scissors';this.root.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});
 }
 reset(){this.root.position.set(2.3,1.1,.2);this.root.quaternion.identity();this.openness=.8;this.closedLast=false;this.pose();}
 private pose(){this.blades.forEach((blade,i)=>blade.rotation.y=(i===0?-1:1)*this.openness*.45);}
 update(command:ToolCommand,dt:number){
  const step=Math.max(0,Math.min(dt,.05)),move=new THREE.Vector3(...command.translation);if(move.lengthSq()>1)move.normalize();
  this.root.position.addScaledVector(move,step*1.5).clamp(new THREE.Vector3(-4,this.minimumHeight,-3),new THREE.Vector3(4,4,4));
  this.root.rotateX(command.rotation[0]*step);this.root.rotateY(command.rotation[1]*step);this.root.rotateZ(command.rotation[2]*step);
  this.openness=THREE.MathUtils.clamp(this.openness+command.jaw*step,0,1);this.pose();
 }
 positionAt(point:THREE.Vector3){this.root.quaternion.identity();this.root.position.copy(point).sub(new THREE.Vector3(0,0,.075));this.openness=.8;this.closedLast=false;this.pose();}
 /** One cut per open-close cycle, confined to the finite blade edges. */
 findCut(strands:readonly ThreadStrand[]){
  const closed=this.openness<=.2,closing=closed&&!this.closedLast;this.closedLast=closed;if(!closing)return;
  this.root.updateWorldMatrix(true,false);
  const a=this.root.localToWorld(new THREE.Vector3(0,0,-.1)),b=this.root.localToWorld(new THREE.Vector3(0,0,.25));
  let best:{strand:ThreadStrand;coordinate:number;distance:number}|undefined;
  for(const strand of strands)for(let i=0;i<strand.count-1;i++){
   const hit=closestSegments(a,b,strand.points[i],strand.points[i+1]),distance=hit.p.distanceTo(hit.q);
   if(distance>(this.style==='westcott'?.035:.045)||best&&distance>=best.distance)continue;
   best={strand,coordinate:i+hit.t,distance};
  }
  return best;
 }
}
