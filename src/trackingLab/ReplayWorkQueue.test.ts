import {it,expect} from 'vitest';
import {ReplayWorkQueue} from './ReplayWorkQueue';
it('preserves flow/decode order even when the second detector would finish first',async()=>{
 const queue=new ReplayWorkQueue(),events:string[]=[];let finish!:()=>void;
 const first=queue.run(async()=>{events.push('flow');await new Promise<void>(resolve=>finish=resolve);events.push('flow complete');});
 const second=queue.run(async()=>{events.push('decode');});
 await Promise.resolve();expect(events).toEqual(['flow']);finish();await Promise.all([first,second]);expect(events).toEqual(['flow','flow complete','decode']);
});
it('does not strand subsequent frames after a failed detector request',async()=>{
 const queue=new ReplayWorkQueue();await expect(queue.run(async()=>{throw new Error('decode failed');})).rejects.toThrow();expect(await queue.run(async()=>42)).toBe(42);
});
