import {expect,it} from 'vitest';
import {CameraFrameClock} from './CameraFrameClock';
it('submits a frame only once, while repeated checks do not consume new work',()=>{
 const c=new CameraFrameClock();expect(c.fresh).toBe(false);c.presented();expect(c.fresh).toBe(true);expect(c.fresh).toBe(true);c.consume();expect(c.fresh).toBe(false);
});
it('uses the latest frame after a busy worker without queuing old frames, and keeps cameras independent',()=>{
 const a=new CameraFrameClock(),b=new CameraFrameClock();for(let i=0;i<4;i++)a.presented();expect(a.fresh).toBe(true);expect(b.fresh).toBe(false);a.consume();expect(a.fresh).toBe(false);a.presented();expect(a.fresh).toBe(true);
});

it('lets callers fall back to timed capture when presentation callbacks are unavailable or stalled',()=>{
 const c=new CameraFrameClock();expect(c.recent(0)).toBe(false);c.presented(100);expect(c.recent(150)).toBe(true);expect(c.recent(350)).toBe(false);c.presented(400);expect(c.recent(401)).toBe(true);
});
