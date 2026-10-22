import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Scissors} from './Scissors';
import {ThreadStrand} from '../suture/ThreadStrand';
import {REST_COMMAND} from '../input/InstrumentControls';
it('cuts only on closure within the finite blades and can reopen for a second cut',()=>{
 const tool=new Scissors(),strand=new ThreadStrand(1,20);strand.reset([new THREE.Vector3(-.5,.8,0),new THREE.Vector3(.5,.8,0)]);
 tool.positionAt(new THREE.Vector3(0,.8,0));expect(tool.findCut([strand])).toBeUndefined();
 tool.openness=.1;const hit=tool.findCut([strand]);expect(hit?.strand).toBe(strand);expect(hit!.coordinate).toBeCloseTo(9.5,1);
 expect(tool.findCut([strand])).toBeUndefined();
 tool.openness=.8;tool.findCut([strand]);tool.openness=.1;expect(tool.findCut([strand])).toBeDefined();
 tool.positionAt(new THREE.Vector3(0,1.2,0));tool.findCut([strand]);tool.openness=.1;expect(tool.findCut([strand])).toBeUndefined();
 tool.update({...REST_COMMAND,translation:[1,0,0]},.05);expect(tool.root.position.x).toBeCloseTo(.075);
});
it('uses fine Westcott blades in microsurgery while retaining the same cutting controls',()=>{
 const tool=new Scissors();tool.setStyle('westcott');
 const rings:THREE.Object3D[]=[];tool.root.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry.type==='TorusGeometry')rings.push(o);});expect(rings).toHaveLength(0);
 const strand=new ThreadStrand(.5,20);strand.reset([new THREE.Vector3(-.25,.7,0),new THREE.Vector3(.25,.7,0)]);
 tool.positionAt(new THREE.Vector3(0,.7,0));tool.findCut([strand]);tool.openness=.1;expect(tool.findCut([strand])?.strand).toBe(strand);
});
