import {expect,it} from 'vitest';
import {InstrumentControls,REST_COMMAND} from './InstrumentControls';
it('parks the driver while routing its independent channel to scissors',()=>{
 const command={...REST_COMMAND,translation:[1,0,0] as const},router=new InstrumentControls({sample:()=>command,dispose:()=>{}});
 expect(router.sample('right')).toBe(command);expect(router.sampleScissors()).toBe(REST_COMMAND);
 router.scissorsActive=true;expect(router.sample('right')).toBe(REST_COMMAND);expect(router.sample('left')).toBe(command);expect(router.sampleScissors()).toBe(command);
});
