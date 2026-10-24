import {expect,it} from 'vitest';
import * as THREE from 'three';
import {TissuePatch} from './TissuePatch';
import {WoundApproximation} from './WoundApproximation';
it('keeps all three fully split layers aligned during local closure and reset',()=>{
  const pad=new TissuePatch(),model=new WoundApproximation();
  const inner=(name:string)=>{
    const mesh=pad.root.getObjectByName(name) as THREE.Mesh<THREE.BoxGeometry>,pos=mesh.geometry.getAttribute('position');
    const points=Array.from({length:pos.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(pos,i).add(mesh.position));
    return points.filter(p=>Math.abs(p.z)<1e-6).sort((a,b)=>Math.abs(a.x)-Math.abs(b.x))[0];
  };
  for(const closure of [0,1,0]){
    model.closure=closure;pad.update(model);
    for(const layer of ['epidermis','dermis','subcutaneous-fat']){
      const left=inner(layer+'-left'),right=inner(layer+'-right');
      expect(right.x-left.x).toBeCloseTo(model.gapAt(0),6);
    }
  }
});

it('updates the layered mesh for eversion even when wound closure stays constant',async()=>{
  const {EdgeEversion}=await import('./EdgeEversion');
  const pad=new TissuePatch(),wound=new WoundApproximation(),edge=new EdgeEversion();
  const top=(name:string)=>{const mesh=pad.root.getObjectByName(name) as THREE.Mesh;mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox!.max.y+mesh.position.y;};
  pad.update(wound,edge);const resting=top('epidermis-right');
  edge.begin();edge.update({jaw:edge.anchor.clone(),rotation:new THREE.Quaternion(),openness:0.1},0.01);
  edge.update({jaw:edge.anchor.clone().add(new THREE.Vector3(0,0.15,0)),rotation:new THREE.Quaternion(),openness:0.1},0.01);
  pad.update(wound,edge);
  expect(top('epidermis-right')).toBeGreaterThan(0.5);expect(top('dermis-right')).toBeGreaterThan(0.47);
  expect(top('epidermis-left')).toBeCloseTo(resting,6);
  edge.reset();pad.update(wound,edge);expect(top('epidermis-right')).toBeCloseTo(resting,6);
});
it('preserves closure at earlier sites and recenters the pad while a fresh stitch remains open',()=>{
 const pad=new TissuePatch(),wound=new WoundApproximation(),sites=[{siteZ:-.75,closure:1,initialGap:.1,eversion:.015,pucker:0}];
 pad.update(wound,undefined,sites,0);
 const mesh=pad.root.getObjectByName('epidermis-right') as THREE.Mesh,positions=mesh.geometry.getAttribute('position');
 let near=Infinity,gap=.1;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i)+mesh.position.x,z=positions.getZ(i)+mesh.position.z;
  if(Math.abs(z+.75)<near&&x<.1){near=Math.abs(z+.75);gap=x*2;}
 }
 expect(gap).toBeLessThan(.03);expect(wound.closure).toBe(0);
 pad.update(wound,undefined,sites,.75);expect(pad.root.position.z).toBe(-.75);
 pad.update(wound);expect(pad.root.position.z).toBeCloseTo(0);
});
it('shows and retains a bounded edge-height mismatch for unequal dermal bites',()=>{
 const wound=new WoundApproximation();wound.setDermalBites(new THREE.Vector3(.3,.31,0),new THREE.Vector3(-.1,.31,0));wound.update(1,.05);wound.closure=1;
 expect(wound.edgeMismatch).toBeGreaterThan(.01);const right=wound.deformPoint(new THREE.Vector3(.05,.41,0)),left=wound.deformPoint(new THREE.Vector3(-.05,.41,0));expect(left.y).toBeGreaterThan(right.y);
 expect(wound.deformPoint(new THREE.Vector3(-.05,.05,0)).y).toBe(.05);expect(wound.surfaceLiftAt(new THREE.Vector3(-.05,.41,0))).toBeGreaterThan(0);
});
