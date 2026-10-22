import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
it('forms and retains a first throw through actual grasp, wrap, pull-through and opposed pulling',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 const [left,right]=tools;
 for(let i=0;i<240;i++)model.update(1/120,tools);
 right.root.position.copy(model.short.points.at(-1)!);right.root.position.z-=.05;
 model.update(1/120,tools);right.openness=.1;model.update(1/120,tools);
 expect(model.gripLabel('right')).toBe('short tail');
 const from=right.root.position.clone(),target=new THREE.Vector3(0,1,-.65);
 for(let i=1;i<=240;i++){right.root.position.copy(from).lerp(target,i/240);model.update(1/120,tools);}
 // Lay a real wrap with the forceps; no particle reseeding or passage injection.
 for(let i=0;i<=480;i++){
  const a=i/480*Math.PI*2;left.root.position.set(-.5*Math.cos(a),1+.5*Math.sin(a),.55);model.update(1/120,tools);
 }
 expect(Math.abs(model.winding)).toBeGreaterThan(.8);
 const start=right.root.position.clone();
 for(let i=1;i<=480;i++){right.root.position.copy(start);right.root.position.z+=i/480*1.6;model.update(1/120,tools);}
 expect(model.passage.passage).toBeDefined();expect(model.retainedThrow.phase).toBe('retained');
 const lp=left.root.position.clone(),rp=right.root.position.clone();
 for(let i=1;i<=480;i++){
  const t=Math.min(1,i/240);left.root.position.copy(lp);left.root.position.x-=.55*t;
  right.root.position.copy(rp);right.root.position.x+=.35*t;model.update(1/120,tools);
 }
 expect(model.retainedThrow.phase).toBe('seated');
 left.openness=right.openness=.7;
 for(let i=0;i<240;i++)model.update(1/120,tools);
 expect(model.retainedThrow.phase).toBe('seated');expect(model.grips.size).toBe(0);
 expect(model.long.points[model.retainedThrow.first].distanceTo(model.long.points[model.retainedThrow.last])).toBeLessThan(.045);
 expect(model.long.measuredLength).toBeCloseTo(model.long.length,1);expect(model.short.measuredLength).toBeCloseTo(model.short.length,1);
},30000);
