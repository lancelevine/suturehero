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
it('lets each next stitch choose its site without moving saved positions and reviews unequal spacing',()=>{
 const c=new StitchCourse(),strand=[new THREE.Vector3(),new THREE.Vector3(.1,.4,.1)];c.begin();
 for(const z of [-1,-.5,.8]){
  expect(c.selectSite(z)).toBe(true);expect(c.record(true,site,[],[strand])).toBe(true);c.advance();
 }
 expect(c.completed.map(r=>r.site.siteZ)).toEqual([-1,-.5,.8]);expect(c.spacingReview).toContain('Uneven spacing');expect(c.selectSite(0)).toBe(false);
 c.reset();expect(c.selectSite(2)).toBe(true);expect(c.siteZ).toBe(1.1);
});
it('reserves room for later stitches and enforces separation from saved material',()=>{
 const c=new StitchCourse(),strand=[new THREE.Vector3(),new THREE.Vector3(0,.4,.1)];c.begin();c.selectSite(1.1);expect(c.siteZ).toBeCloseTo(.5);
 c.record(true,site,[],[strand]);c.advance();c.selectSite(-1);expect(c.siteZ).toBeCloseTo(.8);expect(c.completed[0].site.siteZ).toBeCloseTo(.5);
});
it('reviews residual opening between saved stitches and clears on reset',()=>{
 const c=new StitchCourse(),strand=[new THREE.Vector3(),new THREE.Vector3(.1,.4,.1)];c.begin();
 expect(c.closureReview).toContain('Save two');
 for(const z of [-1,-.7,.8]){c.selectSite(z);c.record(true,site,[],[strand]);c.advance();}
 expect(c.closureReview).toContain('visible opening');expect(c.spacingReview).toContain('Uneven');
 c.reset();expect(c.closureReview).toContain('Save two');
});
