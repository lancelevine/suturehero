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
