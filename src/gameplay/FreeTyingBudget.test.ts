import {expect,it,vi} from 'vitest';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
it('bounds catch-up work on slow frames while still applying the latest grasp pose',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools,'auto');
 const advance=vi.spyOn(model.long,'advance');
 for(let i=0;i<8;i++){
  tools[0].root.position.x+=.01;model.update(.05,tools);
  const grip=model.grips.get('left')!,target=tools[0].root.localToWorld(grip.local.clone());
  expect(model.long.points[grip.index].distanceTo(target)).toBeLessThan(1e-8);
  expect(advance).toHaveBeenCalledTimes((i+1)*2);
 }
});
