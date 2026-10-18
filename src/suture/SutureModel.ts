import * as THREE from 'three';
/** Preview geometry only: intentionally no attachment, collision, or knot solver. */
export function createSuturePreview(): THREE.Group {
  const group=new THREE.Group();
  const points=Array.from({length:41},(_,i)=>{const a=(i/40)*Math.PI*1.25;return new THREE.Vector3(Math.cos(a)*0.3,0,Math.sin(a)*0.3);});
  const needle=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,0.018,8,false),new THREE.MeshStandardMaterial({color:0xe0e9ed,metalness:0.95,roughness:0.2}));
  group.add(needle);
  const threadPoints=[points[0],new THREE.Vector3(0.65,0,0.2),new THREE.Vector3(0.8,0,0.65),new THREE.Vector3(1.25,0,0.5),new THREE.Vector3(1.6,0,0.8)];
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(threadPoints),50,0.009,6,false),new THREE.MeshStandardMaterial({color:0x294c89})));
  group.position.set(-1.7,0.44,0.8); return group;
}
