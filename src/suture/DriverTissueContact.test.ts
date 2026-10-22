import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from '../gameplay/FreeKnotPractice';
it('allows bounded driver overlap with skin while keeping room for exterior thread',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],practice=new FreeKnotPractice();practice.begin(tools);
 tools[1].root.position.set(0,0.3,-0.65);practice.update(1/120,tools);
 expect(tools[1].root.position.y).toBeGreaterThanOrEqual(0.47);
});

it('retains a wrapped strand as the driver is lowered onto the skin and held there',async()=>{
 const {ThreadStrand}=await import('./ThreadStrand');
 const {InstrumentThreadContact,shaftWinding}=await import('./InstrumentThreadContact');
 const driver=new Instrument('right',0);driver.root.position.set(0,1,0);driver.root.quaternion.identity();
 const contact=new InstrumentThreadContact(),floor=()=>0.423;
 const helix=Array.from({length:65},(_,i)=>new THREE.Vector3(0.1*Math.cos(i/64*Math.PI*2),1+0.1*Math.sin(i/64*Math.PI*2),1.25+i/64*0.5));
 let length=0;for(let i=1;i<helix.length;i++)length+=helix[i].distanceTo(helix[i-1]);
 const strand=new ThreadStrand(length,32);strand.reset(helix);
 let leastWinding=Infinity,penetration=0;
 for(let i=0;i<600;i++){
  driver.root.position.y-=i<240?0.004:0;
  contact.configure([driver]);contact.constrainDriverToSurface(driver,floor);contact.configure([driver],true);
  const offset=driver.root.position.y-1;
  const pins=new Map([[0,helix[0].clone().add(new THREE.Vector3(0,offset,0))],[31,helix.at(-1)!.clone().add(new THREE.Vector3(0,offset,0))]]);
  strand.advance(1/120,pins,p=>contact.supportAt(p,floor),contact.resolve);
  leastWinding=Math.min(leastWinding,Math.abs(shaftWinding(strand.points,driver.root.matrixWorld)));
  for(const p of strand.points){penetration=Math.max(penetration,contact.supportAt(p,floor)-p.y,0.086-Math.hypot(p.x,p.y-driver.root.position.y));}
 }
 expect(driver.root.position.y).toBeCloseTo(0.471,6);
 expect(leastWinding).toBeGreaterThan(0.8);expect(penetration).toBeLessThan(0.003);
 expect(strand.measuredLength).toBeCloseTo(length,1);
});

it('checks tilted shafts and pad-edge overlap without imposing pad height outside the pad',async()=>{
 const {InstrumentThreadContact}=await import('./InstrumentThreadContact');
 const {threadSurfaceAt}=await import('./TissueThreadGuide');
 const driver=new Instrument('right',0),contact=new InstrumentThreadContact();
 driver.root.position.set(0,0.2,-0.65);driver.root.rotation.set(-0.6,0,0.3);
 contact.configure([driver]);expect(contact.constrainDriverToSurface(driver,threadSurfaceAt)).toBe(true);
 for(let i=0;i<=40;i++){
  const center=driver.root.localToWorld(new THREE.Vector3(0,0,0.3+i/40*2.6));
  if(Math.abs(center.x)<2.6 && Math.abs(center.z)<1.6)expect(center.y-0.086).toBeGreaterThanOrEqual(0.3849);
 }
 driver.root.quaternion.identity();driver.root.position.set(2.7,0.3,-0.65);
 contact.configure([driver]);contact.constrainDriverToSurface(driver,threadSurfaceAt);expect(driver.root.position.y).toBeGreaterThan(0.47);
 driver.root.position.set(4,0.3,0);contact.configure([driver]);expect(contact.constrainDriverToSurface(driver,threadSurfaceAt)).toBe(false);expect(driver.root.position.y).toBe(0.3);
});
