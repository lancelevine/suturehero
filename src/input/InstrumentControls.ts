import type {InputDevice,ToolCommand,ToolId} from './types';
export const REST_COMMAND:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
/** Routes one device channel without coupling instruments to keyboard bindings. */
export class InstrumentControls implements InputDevice {
 scissorsActive=false;
 constructor(private device:InputDevice){}
 sample(id:ToolId){return id==='right'&&this.scissorsActive?REST_COMMAND:this.device.sample(id);}
 sampleScissors(){return this.scissorsActive?this.device.sample('right'):REST_COMMAND;}
 dispose(){this.device.dispose();}
}
