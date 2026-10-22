import {expect,it} from 'vitest';
import * as THREE from 'three';
import {tissueTractPoints,tractEntry,tractExit,TRACT_CENTER_Y,TRACT_BOTTOM} from './sutureTract';
import {TISSUE_LAYERS} from './anatomy';
import {NEEDLE_RADIUS} from '../suture/needleGeometry';
import {TissueThreadGuide} from '../suture/TissueThreadGuide';
import {ThreadStrand} from '../suture/ThreadStrand';
import {NEEDLE_ARC} from '../suture/needleGeometry';
it('keeps the buried route and guided material in dermis on the actual needle radius',()=>{
 const entry=tractEntry(),exit=tractExit(),center=new THREE.Vector3(0,TRACT_CENTER_Y,0);
 const points=tissueTractPoints(entry,exit,65);
 expect(points[0].distanceTo(entry)).toBeLessThan(1e-8);expect(points.at(-1)!.distanceTo(exit)).toBeLessThan(1e-8);
 for(const p of points){expect(p.y).toBeGreaterThan(TISSUE_LAYERS.dermis.bottom);expect(p.distanceTo(center)).toBeCloseTo(NEEDLE_RADIUS,8);}
 expect(Math.min(...points.map(p=>p.y))).toBeCloseTo(TRACT_BOTTOM,8);
 const strand=new ThreadStrand(),guide=new TissueThreadGuide();
 const pins=guide.anchors(strand,new THREE.Vector3(-.3,1,0),NEEDLE_ARC+Math.PI,center);
 for(const point of pins.values())expect(point.y).toBeGreaterThan(TISSUE_LAYERS.dermis.bottom);
});
