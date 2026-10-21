import {expect,it} from 'vitest';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
it('keeps held material attached while a forceps grip is dragged across the driver shaft',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 const left=tools[0];left.root.position.set(-0.2,1.1,0.55);model.update(1/60,tools);
 for(let i=0;i<20;i++){left.root.position.x+=0.02;model.update(1/60,tools);}
 const held=model.long.points.at(-1)!;
 expect(held.x).toBeLessThan(-0.08);
 expect(held.distanceTo(left.root.localToWorld(model.grips.get('left')!.local.clone()))).toBeLessThan(1e-8);
});
