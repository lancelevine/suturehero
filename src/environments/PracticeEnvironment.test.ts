import {ThreadStrand} from '../suture/ThreadStrand';
import {expect,it} from 'vitest';
import * as THREE from 'three';
import {environments,ARTERY} from './PracticeEnvironment';
import {ArteryTissue} from '../tissue/ArteryTissue';
import {Instrument} from '../instruments/Instrument';
import {PracticeSession} from '../gameplay/PracticeSession';
import {REST_COMMAND} from '../input/InstrumentControls';
it('uses hollow artery geometry and vessel wall purchase instead of a skin plane',()=>{
 const artery=new ArteryTissue(),profile=environments.microsurgery;
 expect(artery.root.children.filter(c=>c.name.startsWith('lumen'))).toHaveLength(2);
 expect(profile.surfaceAt(new THREE.Vector3(1,0,0))).toBeCloseTo(.423);
 expect(profile.surfaceAt(new THREE.Vector3(0,0,0))).toBeCloseTo(-.445);
 expect(profile.surfaceAt(new THREE.Vector3(1,0,.8))).toBeCloseTo(-.445);
 expect(profile.loadBearing(new THREE.Vector3(.2,.37,0))).toBe(true);
 expect(profile.loadBearing(new THREE.Vector3(.2,ARTERY.centerY,0))).toBe(false);
});
it('switches targets and driver form while keeping the same input and physics modules',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],session=new PracticeSession({sample:()=>REST_COMMAND,dispose:()=>{}},tools);
 session.beginFreeTying();session.setEnvironment('microsurgery');expect(session.freeKnot.active).toBe(false);
 expect(session.eversion.anchor.x).toBe(.15);expect(session.wound.initialGap).toBe(.3);
 expect(tools[1].driverStyle).toBe('castro');expect(session.pass.purchaseY).toBe(.37);
 const toruses:THREE.Object3D[]=[];tools[1].root.traverse(o=>{if(o instanceof THREE.Mesh&&o.geometry.type==='TorusGeometry')toruses.push(o);});expect(toruses).toHaveLength(0);
 const point=tools[1].root.position.clone();tools[1].update({...REST_COMMAND,translation:[1,0,0]},.05);expect(tools[1].root.position.x-point.x).toBeCloseTo(.075);
 session.beginFreeTying('surgeon');expect(session.freeKnot.sequence?.requiredWraps).toBe(2);expect(session.freeKnot.surfaceAt(new THREE.Vector3(0,0,0))).toBeCloseTo(-.445);
 session.setEnvironment('skin');expect(tools[1].driverStyle).toBe('standard');expect(session.pass.purchaseY).toBeCloseTo(.31);
});
it('shows fascicles inside two nerve ends and supports the smaller artery wall',async()=>{
 const {createMicroEnvironment}=await import('./PracticeEnvironment');const artery=new ArteryTissue();artery.setTarget('nerve');
 let fascicles=0;artery.root.traverse(o=>{if(o.name.startsWith('fascicle-'))fascicles++;});expect(fascicles).toBeGreaterThanOrEqual(14);
 const small=createMicroEnvironment('small-artery');expect(small.surfaceAt(new THREE.Vector3(.5,0,0))).toBeCloseTo(.423);
 expect(small.loadBearing(new THREE.Vector3(.2,.38,0))).toBe(true);expect(small.loadBearing(new THREE.Vector3(.2,.16,0))).toBe(false);
 artery.setTarget('small-artery');fascicles=0;artery.root.traverse(o=>{if(o.name.startsWith('fascicle-'))fascicles++;});expect(fascicles).toBe(0);
});

it('lets the driver reach and pick up a cut strand on the lowered microsurgery tray',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],session=new PracticeSession({sample:()=>REST_COMMAND,dispose:()=>{}},tools);
 session.setEnvironment('microsurgery');session.beginFreeTying();const model=session.freeKnot,driver=tools[1];
 const fragment=new ThreadStrand(.6,20);fragment.reset([new THREE.Vector3(.4,-.445,1),new THREE.Vector3(1,-.445,1)]);model.fragments.push(fragment);
 driver.root.position.copy(fragment.points[10]).sub(new THREE.Vector3(0,0,.05));driver.update(REST_COMMAND,0);
 expect(driver.root.position.y).toBeLessThan(.15);
 driver.openness=.7;model.update(0,tools);driver.openness=.1;model.update(1/120,tools);
 expect(model.grips.get('right')?.strand).toBe(fragment);
 session.setEnvironment('skin');expect(driver.minimumHeight).toBe(.15);
});
