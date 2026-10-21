import {expect,it} from 'vitest';
import {KnotReleaseCheck} from './KnotReleaseCheck';
const stable={closure:1,shortMaterial:1.35,loopMaterial:0.754,anchorError:0,finite:true};
it('requires both released instruments and a full hold interval; reset clears release latches',()=>{
  const c=new KnotReleaseCheck();c.release(0.6,0.1);
  for(let i=0;i<240;i++)c.observe(1/60,stable);
  expect(c.state).toBe('waiting');expect(c.elapsed).toBe(0);
  c.release(0.1,0.6);expect(c.leftReleased).toBe(true);
  for(let i=0;i<179;i++)c.observe(1/60,stable);
  expect(c.state).toBe('observing');c.observe(1/60,stable);expect(c.state).toBe('passed');
  c.reset();expect(c.anyReleased).toBe(false);expect(c.state).toBe('waiting');expect(c.elapsed).toBe(0);
});
it('rejects wound reopening, material slip, anchor drift and invalid simulation state, including after passing',()=>{
  for(const failure of [{closure:0.9},{shortMaterial:1.4},{loopMaterial:0.8},{anchorError:0.1},{finite:false},{closure:NaN}]) {
    const c=new KnotReleaseCheck();c.release(1,1);
    for(let i=0;i<60;i++)c.observe(0.05,stable);
    expect(c.state).toBe('passed');c.observe(1/60,{...stable,...failure});expect(c.state).toBe('failed');
    c.observe(1/60,stable);expect(c.state).toBe('failed');
  }
});
it('allows skin to finish settling closed, but does not pass a persistently open wound',()=>{
  const c=new KnotReleaseCheck();c.release(1,1);c.observe(1/60,{...stable,closure:0.93});
  for(let i=0;i<180;i++)c.observe(1/60,stable);expect(c.state).toBe('passed');
  c.reset();c.release(1,1);for(let i=0;i<180;i++)c.observe(1/60,{...stable,closure:0.9});
  expect(c.state).toBe('failed');
});
