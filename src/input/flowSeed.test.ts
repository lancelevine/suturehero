import {afterEach,expect,it,vi} from 'vitest';
import {copyFlowSeed} from './flowSeed';
afterEach(()=>vi.unstubAllGlobals());
it('retains identical seed pixels after the flow input buffer is transferred and detached',()=>{
 vi.stubGlobal('ImageData',class {constructor(public data:Uint8ClampedArray,public width:number,public height:number){}});
 const bytes=new Uint8ClampedArray([21,34,55,255,89,144,233,255]),frame=new ImageData(bytes,2,1),seed=copyFlowSeed(frame);
 structuredClone(bytes.buffer,{transfer:[bytes.buffer]});expect(bytes.byteLength).toBe(0);expect([...seed.data]).toEqual([21,34,55,255,89,144,233,255]);expect([seed.width,seed.height]).toEqual([2,1]);
});
