import {describe,it,expect} from 'vitest';
import {markerJawDiagnostics} from './markerJawDiagnostics';
import type {MarkerJawSnapshot} from '../jaw/markerJawController';
const snapshot:MarkerJawSnapshot={current:true,width:960,height:540,readings:[{instrument:'needleDriver',reading:{opening:.5,confidence:1,balls:[{closed:{x:10,y:10,depth:300},open:{x:30,y:10,depth:300},moving:true,found:{x:20,y:10}}]}}]};
describe('Marker-relative jaw replay diagnostics',()=>{
 it('uses actual detector readings and its visible-ball fraction',()=>{const d=markerJawDiagnostics(snapshot,0);expect(d.balls[0]).toMatchObject({x:20,y:10,state:'detected',confidence:1});expect(d.confidence).toBe(1);expect(d.ballSupported).toBe(true);});
 it('never presents held positions as valid current detections',()=>{const d=markerJawDiagnostics({...snapshot,current:false},0);expect(d.balls[0].state).toBe('predicted');expect(d.confidence).toBeNull();expect(d.ballProcessed).toBe(false);});
 it('reports the current tracker camera-2 limitation rather than inventing detections',()=>{const d=markerJawDiagnostics(snapshot,1);expect(d.balls).toEqual([]);expect(d.ballSupported).toBe(false);expect(d.confidence).toBeNull();});
});
