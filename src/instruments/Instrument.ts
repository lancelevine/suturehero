import { steelSurface } from '../visuals/surfaceTextures';
import { ForcepsArms } from './ForcepsArms';
import * as THREE from 'three';
import type { ToolCommand, ToolId } from '../input/types';
export class Instrument {
  readonly root = new THREE.Group();
  readonly tip = new THREE.Object3D();
  private forcepsArms?: ForcepsArms;
  driverStyle:'standard'|'castro'='standard';
  private driverBody=new THREE.Group();
  private steel!:THREE.MeshStandardMaterial;
  get jawRadius(){return this.driverStyle==='castro'?0.03:0.04;}
  private jaws: THREE.Group[] = [];
  openness = 0.65;
  minimumHeight=0.15;
  readonly kind: 'forceps' | 'needle-driver';
  constructor(readonly id: ToolId, color: number) {
    this.kind = id === 'left' ? 'forceps' : 'needle-driver';
    const maps=steelSurface();
    const steel = new THREE.MeshStandardMaterial({color:0xffffff,metalness:0.8,roughness:0.5,map:maps.color,bumpMap:maps.height,bumpScale:0.0015,roughnessMap:maps.roughness});
    this.steel=steel;
    const accent = new THREE.MeshStandardMaterial({color,metalness:0.4,roughness:0.4});
    // Local +Z runs from the working tip toward the handle; the root is the tip pivot.
    if(this.kind==='needle-driver') {
      this.root.add(this.driverBody);this.buildDriver();
    } else {
      this.forcepsArms=new ForcepsArms(steel);
      this.root.add(this.forcepsArms.root);
    }
    const collar=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.18),accent);
    collar.position.z=2.75; this.root.add(collar);
    this.root.add(this.tip); this.root.traverse(object=>{if(object instanceof THREE.Mesh) { object.castShadow=true; object.receiveShadow=true; }}); this.reset();
  }
  setDriverStyle(style:'standard'|'castro'){
    if(this.kind!=='needle-driver'||style===this.driverStyle)return;
    this.driverStyle=style;
    this.driverBody.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    this.driverBody.clear();this.jaws=[];this.buildDriver();this.updateJaws();
  }
  private buildDriver(){
    const body=this.driverBody,steel=this.steel,castro=this.driverStyle==='castro';
    const rod=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),steel);
      mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());body.add(mesh);
    };
    rod(new THREE.Vector3(0,0,.3),new THREE.Vector3(0,0,castro?1.35:2.95),castro?.05:.065);
    for(const side of [-1,1]){
      if(castro){
        const points=[new THREE.Vector3(side*.035,0,1.1),new THREE.Vector3(side*.14,0,1.8),new THREE.Vector3(side*.17,0,2.55),new THREE.Vector3(0,0,3)];
        const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,.035,8),steel);spring.name='castro-spring-handle';body.add(spring);
        const grip=new THREE.Mesh(new THREE.BoxGeometry(.1,.05,.7),steel);grip.position.set(side*.15,0,2.1);body.add(grip);
        for(let z=1.85;z<2.4;z+=.07){const ridge=new THREE.Mesh(new THREE.BoxGeometry(.105,.057,.012),steel);ridge.position.set(side*.15,0,z);body.add(ridge);}
      }else{
        rod(new THREE.Vector3(0,0,2.9),new THREE.Vector3(side*.14,0,3.1),.04);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.045,10,32),steel);ring.rotation.x=Math.PI/2;ring.position.set(side*.27,0,3.28);body.add(ring);
      }
      const jaw=new THREE.Group();jaw.position.set(side*.035,0,.35);
      const blade=new THREE.Mesh(new THREE.BoxGeometry(castro?.045:.065,castro?.045:.065,.42),steel);
      blade.position.z=-.21;jaw.add(blade);body.add(jaw);this.jaws.push(jaw);
    }
    body.name=castro?'castroviejo-driver':'ring-handle-driver';
    body.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  reset() {
    this.root.position.set(this.id==='left'?-0.85:0.85,0.7,0.1);
    this.root.rotation.set(-0.45,this.id==='left'?-0.55:0.55,0);
    this.openness=0.65; this.updateJaws();
  }
  update(command: ToolCommand, dt: number, poseLocked=false) {
    if(!poseLocked){
    const delta = new THREE.Vector3(...command.translation);
    if(delta.lengthSq()>1) delta.normalize();
    this.root.position.addScaledVector(delta,dt*1.5);
    this.root.position.clamp(new THREE.Vector3(-4,this.minimumHeight,-3),new THREE.Vector3(4,4,4));
    this.root.rotateX(command.rotation[0]*dt); this.root.rotateY(command.rotation[1]*dt); this.root.rotateZ(command.rotation[2]*dt);
    }
    this.openness=THREE.MathUtils.clamp(this.openness+command.jaw*dt,0,1); this.updateJaws();
  }
  private updateJaws() { this.forcepsArms?.update(this.openness); this.jaws.forEach((jaw,i)=>{jaw.rotation.y=(i===0?1:-1)*this.openness*0.35;}); }
}
