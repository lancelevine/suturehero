import * as THREE from 'three';
/** Kinematic needle body. The attached thread is a visual reference, not a solver. */
export class SutureModel {
  readonly root = new THREE.Group();
  readonly points = Array.from({length:65},(_,i)=>{
    const a=i/64*Math.PI*1.25;
    return new THREE.Vector3(Math.cos(a)*0.3,0,Math.sin(a)*0.3);
  });
  private material = new THREE.MeshStandardMaterial({color:0xe0e9ed,metalness:0.95,roughness:0.2});
  constructor() {
    this.root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(this.points),64,0.018,8,false),this.material));
    const threadPoints=[this.points[0],new THREE.Vector3(0.65,0,0.2),new THREE.Vector3(0.8,0,0.65),new THREE.Vector3(1.25,0,0.5),new THREE.Vector3(1.6,0,0.8)];
    this.root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(threadPoints),50,0.009,6,false),new THREE.MeshStandardMaterial({color:0x294c89})));
    this.reset();
  }
  reset() { this.root.position.set(-0.3,0.65,0); this.root.quaternion.identity(); }
  highlight(ready: boolean) { this.material.emissive.setHex(ready?0x278b65:0); }
}
