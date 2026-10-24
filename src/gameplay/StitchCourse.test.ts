import {expect,it} from 'vitest';
import * as THREE from 'three';
import {StitchCourse} from './StitchCourse';
const site={closure:1,initialGap:.1,eversion:.015,pucker:0};
it('gates each station, freezes independent records and finishes exactly three stitches',()=>{
 const c=new StitchCourse(),strand=[new THREE.Vector3(0,.4,0),new THREE.Vector3(.1,.4,.1)];
 expect(c.advance()).toBe(false);expect(c.record(true,site,[],[strand])).toBe(false);c.begin();
 for(let i=0;i<3;i++){
  expect(c.siteZ).toBe([-.75,0,.75][i]);expect(c.advance()).toBe(false);
  expect(c.record(false,site,[],[strand])).toBe(false);
  expect(c.record(true,site,['Review'],[strand])).toBe(true);
  const record=c.completed[i];expect(record.strands[0][0].z).toBe(c.siteZ);
  expect(c.record(true,site,[],[strand])).toBe(false);
  const saved=record.strands[0][0].x;strand[0].x+=1;expect(record.strands[0][0].x).toBe(saved);
  expect(c.advance()).toBe(i<2);
 }
 expect(c.finished).toBe(true);expect(c.status).toContain('3 / 3');c.reset();expect(c.completed).toHaveLength(0);expect(c.siteZ).toBe(0);
});
it('rejects non-finite or empty retained strand data',()=>{
 const c=new StitchCourse();c.begin();expect(c.record(true,site,[],[])).toBe(false);
 expect(c.record(true,site,[],[[new THREE.Vector3(),new THREE.Vector3(NaN,0,0)]])).toBe(false);expect(c.completed).toHaveLength(0);
});
