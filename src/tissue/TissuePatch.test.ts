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
