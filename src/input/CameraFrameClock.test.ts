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

it('exposes frame identities without consuming another tracking client’s frame',()=>{const c=new CameraFrameClock();c.presented(100);expect(c.frameId).toBe(1);expect(c.presentedAt).toBe(100);c.consume();expect(c.frameId).toBe(1);c.presented(140);expect(c.frameId).toBe(2);});

it('keeps the camera capture time and pairs on it when plausible',async()=>{
 const {CameraFrameClock,pairingTime,MAX_CAPTURE_TO_READ_MS}=await import('./CameraFrameClock');
 const clock=new CameraFrameClock();
 clock.presented(1000,undefined,982);
 expect(clock.captureTime).toBe(982);
 expect(pairingTime(clock,1005)).toBe(982);
 // Not reported, in the future, or implausibly old: fall back to the read time.
 clock.presented(1100);expect(pairingTime(clock,1105)).toBe(1105);
 clock.presented(1200,undefined,1300);expect(pairingTime(clock,1205)).toBe(1205);
 clock.presented(1300,undefined,1000);expect(pairingTime(clock,1300+MAX_CAPTURE_TO_READ_MS)).toBe(1300+MAX_CAPTURE_TO_READ_MS);
 expect(pairingTime(undefined,50)).toBe(50);
});
