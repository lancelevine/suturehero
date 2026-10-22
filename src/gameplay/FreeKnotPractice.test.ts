import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
it('grasps only nearby material on jaw closure, follows full tool pose, releases and resets',()=>{
  const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
  expect(model.grips.has('left')).toBe(true);const right=tools[1];
  right.root.position.set(3,3,3);right.openness=0.1;model.update(0,tools);expect(model.grips.has('right')).toBe(false);
  const target=model.short.points[25].clone();right.root.position.copy(target).sub(new THREE.Vector3(0,0,0.05));
  model.update(0,tools);expect(model.grips.has('right')).toBe(false);
  right.openness=0.7;model.update(0,tools);right.openness=0.1;model.update(0,tools);
  const grip=model.grips.get('right')!;expect(grip.strand).toBe(model.short);
  right.root.position.x+=0.2;right.root.rotateY(0.5);model.update(1/60,tools);
  expect(grip.strand.points[grip.index].distanceTo(right.root.localToWorld(grip.local.clone()))).toBeLessThan(1e-8);
  right.openness=0.7;model.update(1/60,tools);expect(model.grips.has('right')).toBe(false);
  model.reset();expect(model.active).toBe(false);expect(model.grips.size).toBe(0);
});
it('lays and retains a contact wrap through actual forceps movement',()=>{
  const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
  const left=tools[0],driver=tools[1];driver.root.position.set(0,1.25,-0.65);
  for(let i=0;i<=480;i++) {
    const a=i/480*Math.PI*2;
    left.root.position.set(-0.7*Math.cos(a),1.25+0.7*Math.sin(a),0.55);
    model.update(1/120,tools);
  }
  expect(Math.abs(model.winding)).toBeGreaterThan(0.75);
  for(let i=0;i<240;i++)model.update(1/120,tools);
  expect(model.long.measuredLength).toBeCloseTo(model.long.length,1);
  expect(Math.abs(model.winding)).toBeGreaterThan(0.75);
  expect(model.long.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
  expect(model.reachLimited).toBe(false);
});

it('passes independent input commands through to both instruments without a knot pose override',async()=>{
  const {PracticeSession}=await import('./PracticeSession');
  const tools=[new Instrument('left',0),new Instrument('right',0)];
  const session=new PracticeSession({sample:id=>({translation:id==='left'?[1,0,0]:[0,1,0],rotation:[0,0,1],jaw:0}),dispose:()=>{}},tools);
  session.beginFreeTying();const starts=tools.map(t=>t.root.position.clone());session.update(0.05);
  expect(tools[0].root.position.x-starts[0].x).toBeCloseTo(0.075);
  expect(tools[1].root.position.y-starts[1].y).toBeCloseTo(0.075);
  expect(tools[0].root.quaternion.z).not.toBe(0);expect(session.knot.phase).toBe('idle');
  session.reset();expect(session.freeKnot.active).toBe(false);
});
it('settles without grasp/jaw conflict jitter while retaining slack',()=>{
  const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
  let largest=0,tail=0;
  for(let i=0;i<1200;i++) {
    const before=model.long.points.map(p=>p.clone());const b=model.short.points.map(p=>p.clone());model.update(1/120,tools);
    if(i>=1080) {largest=Math.max(largest,...model.long.points.map((p,j)=>p.distanceTo(before[j])),...model.short.points.map((p,j)=>p.distanceTo(b[j])));tail+=model.long.points.reduce((s,p,j)=>s+p.distanceToSquared(before[j]),0);}
  }
  expect(largest).toBeLessThan(0.001);expect(tail).toBeLessThan(0.001);
  expect(model.long.measuredLength).toBeCloseTo(model.long.length,1);
  expect(model.long.points.at(-1)!.distanceTo(model.exit)).toBeLessThan(model.long.length);
});
it('keeps the resting short tail broadly curved and reachable by jaws above the skin',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 for(let i=0;i<600;i++)model.update(1/120,tools);
 let minimum=1;
 for(let i=1;i<model.short.count-1;i++)minimum=Math.min(minimum,model.short.points[i].clone().sub(model.short.points[i-1]).normalize().dot(model.short.points[i+1].clone().sub(model.short.points[i]).normalize()));
 expect(minimum).toBeGreaterThan(0.85);
 const driver=tools[1],tip=model.short.points.at(-1)!.clone();
 driver.root.position.copy(tip).sub(new THREE.Vector3(0,0,0.05));driver.openness=0.7;model.update(1/120,tools);
 driver.openness=0.1;model.update(1/120,tools);
 expect(model.gripLabel('right')).toBe('short tail');
 const grip=model.grips.get('right')!;
 expect(grip.strand.points[grip.index].distanceTo(driver.root.localToWorld(grip.local.clone()))).toBeLessThan(1e-8);
 expect(grip.local.distanceTo(new THREE.Vector3(0,0,0.05))).toBeLessThanOrEqual(0.040001);
 expect(driver.root.position.y).toBeGreaterThan(0.47);
 expect(driver.root.position.y).toBeLessThan(0.50);
 expect(model.short.measuredLength).toBeCloseTo(model.short.length,1);
});
