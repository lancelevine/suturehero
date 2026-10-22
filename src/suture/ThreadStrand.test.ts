import {tractEntry,tractExit,TRACT_CENTER_Y} from '../tissue/sutureTract';
import { expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreadStrand } from './ThreadStrand';
import { TissueThreadGuide,threadSurfaceAt } from './TissueThreadGuide';
import { NEEDLE_ARC } from './needleGeometry';
function strand() {
  const s=new ThreadStrand(2,32);
  s.reset([new THREE.Vector3(0,1,0),new THREE.Vector3(0.7,0.6,0),new THREE.Vector3(1.3,0.3,0.5),new THREE.Vector3(1.5,0.3,0.7)]);
  return s;
}
it('settles slack under gravity, respects support and keeps its endpoint and material length',()=>{
  const s=strand();const eye=new THREE.Vector3(0,1,0); const anchors=new Map([[0,eye]]);
  const startHeight=s.points[12].y;
  for(let i=0;i<240;i++)s.advance(1/120,anchors,()=>0.2);
  expect(s.points[0].distanceTo(eye)).toBeLessThan(1e-8);
  expect(s.points[12].y).toBeLessThan(startHeight);
  for(const point of s.points)expect(point.y).toBeGreaterThanOrEqual(0.2);
  expect(s.measuredLength).toBeCloseTo(s.length,1);
  eye.x=0.4;
  for(let i=0;i<240;i++)s.advance(1/120,anchors,()=>0.2);
  expect(s.points[0].distanceTo(eye)).toBeLessThan(1e-8);expect(s.measuredLength).toBeCloseTo(s.length,1);
});
it('gives the same result at different display rates and resets without retained velocity',()=>{
  const a=strand(),b=strand();const pins=new Map([[0,new THREE.Vector3(0,1,0)]]);
  for(let i=0;i<60;i++)a.advance(1/60,pins,()=>0.2);
  for(let i=0;i<120;i++)b.advance(1/120,pins,()=>0.2);
  a.points.forEach((p,i)=>expect(p.distanceTo(b.points[i])).toBeLessThan(1e-8));
  const fresh=strand();a.reset([new THREE.Vector3(0,1,0),new THREE.Vector3(0.7,0.6,0),new THREE.Vector3(1.3,0.3,0.5),new THREE.Vector3(1.5,0.3,0.7)]);
  a.advance(1/60,pins,()=>0.2);fresh.advance(1/60,pins,()=>0.2);
  a.points.forEach((p,i)=>expect(p.distanceTo(fresh.points[i])).toBeLessThan(1e-8));
});
it('feeds into the tract only after eye entry and slides material between exterior and tail',()=>{
  const s=new ThreadStrand();const guide=new TissueThreadGuide();const center=new THREE.Vector3(0,TRACT_CENTER_Y,0);
  const eye=new THREE.Vector3(0.3,0.6,0);
  expect(guide.anchors(s,eye,NEEDLE_ARC-0.1,center).size).toBe(1);
  let pins=guide.anchors(s,new THREE.Vector3(0,0.13,0),NEEDLE_ARC+Math.PI/2,center);
  expect(pins.size).toBeGreaterThan(1);
  expect([...pins.values()].some(p=>p.distanceTo(tractEntry())<1e-7)).toBe(true);
  pins=guide.anchors(s,new THREE.Vector3(-0.3,1.1,0),NEEDLE_ARC+Math.PI+0.1,center);
  const exitIndex=[...pins].find(([i,p])=>i>0 && p.distanceTo(tractExit())<1e-7)![0];
  const pulled=guide.anchors(s,new THREE.Vector3(-0.3,1.6,0),NEEDLE_ARC+Math.PI+0.1,center);
  const nextExit=[...pulled].find(([i,p])=>i>0 && p.distanceTo(tractExit())<1e-7)![0];
  expect(nextExit).toBeGreaterThan(exitIndex);expect(Math.max(...pulled.keys())).toBeLessThan(s.count-5);
  guide.anchors(s,new THREE.Vector3(-0.3,8,0),NEEDLE_ARC+Math.PI+0.1,center);expect(guide.state).toBe('Thread at reach limit');
  expect(threadSurfaceAt(new THREE.Vector3(1,0,1))).toBeGreaterThan(threadSurfaceAt(new THREE.Vector3(3,0,1)));
});
it('relaxes alternating saw-tooth folds into broader slack without losing material',()=>{
 const strand=new ThreadStrand(1.2,40),rest=strand.restLength;
 strand.reset([new THREE.Vector3(0,0.423,0),new THREE.Vector3(0.6,0.423,0)]);
 for(let i=0;i<strand.count;i++){
  const target=new THREE.Vector3(i*rest*0.45,0.423,(i%2?1:-1)*rest*Math.sqrt(1-0.45**2)/2+0.002*Math.sin(i*0.3));
  strand.applyContactCorrection(i,target.sub(strand.points[i]));
 }
 const alignment=()=>{let sum=0;for(let i=1;i<strand.count-1;i++)sum+=strand.points[i].clone().sub(strand.points[i-1]).normalize().dot(strand.points[i+1].clone().sub(strand.points[i]).normalize());return sum/(strand.count-2);};
 const before=alignment(),pins=new Map([[0,strand.points[0].clone()],[39,strand.points[39].clone()]]);
 for(let i=0;i<360;i++)strand.advance(1/120,pins,()=>0.423);
 expect(alignment()).toBeGreaterThan(before+0.6);expect(strand.measuredLength).toBeCloseTo(strand.length,1);
 expect(strand.points[0].distanceTo(pins.get(0)!)).toBeLessThan(1e-9);
});
it('damps internal motion without slowing uniform free fall or changing material',()=>{
 const a=new ThreadStrand(1,20),b=new ThreadStrand(1,20),path=[new THREE.Vector3(0,2,0),new THREE.Vector3(1,2,0)];a.reset(path);b.reset(path);
 for(let i=0;i<120;i++){
  a.advance(1/120,new Map(),()=>-100);b.advance(1/120,new Map(),()=>-100);a.dampInternalMotion();
 }
 expect(a.length).toBe(1);expect(a.points.every((p,i)=>p.distanceTo(b.points[i])<1e-9)).toBe(true);
});
