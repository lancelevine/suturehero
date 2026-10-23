import {expect,it} from 'vitest';
import * as THREE from 'three';
import {StrandTension,limitSlackTakeUp} from './StrandTension';
it('distinguishes slack, gentle pull, sustained excess and release without a one-frame spike',()=>{
 const t=new StrandTension();t.update(1/60,.6,0,true);expect(t.state).toBe('slack');
 t.update(1/60,.97,0,true);expect(t.state).toBe('gentle');
 t.update(1/120,1,1,true);expect(t.state).toBe('gentle');
 for(let i=0;i<30;i++)t.update(1/120,1,1,true);expect(t.state).toBe('excessive');
 for(let i=0;i<120;i++)t.update(1/120,.97,0,true);expect(t.state).toBe('gentle');expect(t.peakDemand).toBeGreaterThan(.6);
 t.update(1/60,.97,0,false);expect(t.state).toBe('released');t.reset();expect(t.peakDemand).toBe(0);
});
it('bounds a sudden taut-arm jump and leaves ordinary movements and slack loops free',()=>{
 const anchor=new THREE.Vector3(),previous=new THREE.Vector3(.9,0,0),jump=new THREE.Vector3(2,0,0);
 limitSlackTakeUp(previous,jump,anchor,1,.03,1/120);expect(jump.distanceTo(previous)).toBeLessThan(.04);
 const ordinary=new THREE.Vector3(.91,0,0);limitSlackTakeUp(previous,ordinary,anchor,1,.03,1/120);expect(ordinary.x).toBe(.91);
 const slack=new THREE.Vector3(.5,0,0);limitSlackTakeUp(previous,slack,anchor,1,.03,1/120);expect(slack.x).toBe(.5);
});
