import {expect,it} from 'vitest';
import {FreeKnotPractice} from './FreeKnotPractice';
import {Instrument} from '../instruments/Instrument';
it('smooths a discontinuous held-tool request across frames without detaching the strand',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);model.update(1/60,tools);
 const left=tools[0];let largest=0;
 for(let i=0;i<30;i++){
  const before=left.root.position.clone();left.root.position.x=-4;model.update(1/60,tools);
  largest=Math.max(largest,before.distanceTo(left.root.position));
 }
 expect(largest).toBeLessThan(.08);expect(model.gripLabel('left')).toBe('long strand');expect(model.tension.long.state).toBe('excessive');
 left.openness=.7;model.update(1/60,tools);expect(model.tension.long.state).toBe('released');
 model.reset();expect(model.tension.long.peakDemand).toBe(0);
});
