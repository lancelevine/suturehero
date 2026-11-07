import {expect,it} from 'vitest';
import {BallMotionTracker,validJawBall} from './BallMotionTracker';
const ball=(x:number,y=100,r=6)=>({x,y,count:Math.PI*r*r,score:1});
const marker={x:50,y:50,side:20};
it('predicts from measured velocity and invalidates a missed frame immediately',()=>{
 const t=new BallMotionTracker();t.beginFrame(0);t.observe(ball(100),null,0,true);t.beginFrame(100);t.observe(ball(110),null,100);
 const plan=t.plan(200,{x:100,y:100},null,null,6);expect(plan.center.x).toBeGreaterThan(114);expect(plan.silhouette).toBe(true);
 t.beginFrame(200);t.miss(200);expect(t.current(200)).toBeNull();expect(t.plan(300,{x:100,y:100},null,null,6).stage).toContain('Predicted');
});
it('expands search and requests full-frame reacquisition without another assignment',()=>{
 const t=new BallMotionTracker(),anchor={x:100,y:100};t.miss(0);
 const initial=t.plan(0,anchor,marker,marker,6),expanded=t.plan(700,anchor,marker,marker,6),global=t.plan(1400,anchor,marker,marker,6);
 expect(expanded.searchRadius).toBeGreaterThan(initial.searchRadius*3);expect(global.fullFrame).toBe(true);t.startGlobal(1400);expect(t.plan(1500,anchor,marker,marker,6).fullFrame).toBe(false);
 t.hint(ball(300),marker,1600);expect(t.current(1600)).toBeNull();expect(t.plan(1610,anchor,marker,marker,6).center.x).toBe(300);
 t.beginFrame(1700);t.observe(ball(302),marker,1700);expect(t.current(1700)!.x).toBe(302);
});
it('uses marker motion without double counting it as independent ball velocity',()=>{
 const t=new BallMotionTracker();t.observe(ball(100),marker,0,true);const moved={...marker,x:70};t.observe(ball(120),moved,100);
 expect(t.plan(200,{x:100,y:100},{...marker,x:90},marker,6).center.x).toBeCloseTo(140);
 expect(t.current(1000)).toBeNull();
});
it('requires initial identity and validates the expected size and marker reach',()=>{
 const t=new BallMotionTracker();expect(t.plan(0,{x:100,y:100},marker,marker,6).silhouette).toBe(false);
 expect(validJawBall(ball(100),marker,16,6)).toBe(true);expect(validJawBall(ball(100,100,20),marker,16,6)).toBe(false);expect(validJawBall(ball(800),marker,16,6)).toBe(false);
});
