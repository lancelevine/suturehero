import {describe,it,expect} from 'vitest';
import {groupMarkers} from './arucoTracking';
describe('marker grouping',()=>{
 it('distinguishes instruments with separate IDs',()=>{
  const corners=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
  const result=groupMarkers([{id:1,corners},{id:4,corners}]);
  expect(result.map(r=>r.name)).toEqual(['needleDriver','forceps']);
 });
 it('ignores unrelated marker IDs',()=>expect(groupMarkers([{id:18,corners:[]}])).toEqual([]));
});
