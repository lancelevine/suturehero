import { expect, it } from 'vitest';
import * as THREE from 'three';
import { ForcepsArms } from './ForcepsArms';
it('has continuous arms whose opposing gripping ends meet when closed',()=>{
  const forceps=new ForcepsArms(new THREE.MeshBasicMaterial()); expect(forceps.root.children).toHaveLength(2);
  forceps.update(1);
  const left=forceps.arms[0].geometry.getAttribute('position'); const right=forceps.arms[1].geometry.getAttribute('position');
  expect(left.getX(0)).toBeCloseTo(-0.18); expect(right.getX(0)).toBeCloseTo(0.18);
  forceps.update(0); expect(left.getX(0)).toBeCloseTo(0); expect(right.getX(0)).toBeCloseTo(0);
  for(const arm of forceps.arms) {
    const positions=arm.geometry.getAttribute('position');
    expect(positions.getZ(0)).toBe(0); expect(positions.getZ(positions.count-1)).toBeCloseTo(3.1);
    expect(arm.geometry.index!.count).toBeGreaterThan(0);
  }
});
