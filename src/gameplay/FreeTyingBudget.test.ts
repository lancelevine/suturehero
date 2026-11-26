import {expect,it,vi} from 'vitest';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice,MAX_TIME_STEPS} from './FreeKnotPractice';
it('bounds catch-up work on slow frames while still applying the latest grasp pose',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools,'auto');
 const advance=vi.spyOn(model.long,'advance');
 for(let i=0;i<8;i++){
  tools[0].root.position.x+=.01;model.update(.05,tools);
  const grip=model.grips.get('left')!,target=tools[0].root.localToWorld(grip.local.clone());
  expect(model.long.points[grip.index].distanceTo(target)).toBeLessThan(1e-8);
  // A 0.05 s frame needs 6 steps of 1/120 s; catch-up stays bounded at MAX_TIME_STEPS (4 since 2026-11-26).
  expect(advance).toHaveBeenCalledTimes((i+1)*MAX_TIME_STEPS);
 }
});
