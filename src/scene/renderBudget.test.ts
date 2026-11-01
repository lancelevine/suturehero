import {expect,it} from 'vitest';
import {renderPixelRatio} from './renderBudget';
it.each([[3840,2160,3],[2560,1440,2],[1440,900,1.5],[390,844,3]])('bounds GPU pixels at %ix%i, DPR %i',(w,h,dpr)=>{
 for(const fast of [true,false]){const ratio=renderPixelRatio(w,h,dpr,fast);expect(w*h*ratio*ratio).toBeLessThanOrEqual((fast?750000:2000000)+1);expect(ratio).toBeLessThanOrEqual(dpr);}
});
it('preserves small and low-DPI display resolution',()=>{expect(renderPixelRatio(390,400,1,false)).toBe(1);expect(renderPixelRatio(1440,900,.5,false)).toBe(.5);});
