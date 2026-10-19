import { expect, it, vi } from 'vitest';
import { KeyboardInput } from './KeyboardInput';
it('scales tool commands in precision mode and clears held keys on blur',()=>{
  const handlers=new Map<string,(event:unknown)=>void>();
  vi.stubGlobal('window',{addEventListener:(name:string,fn:(event:unknown)=>void)=>handlers.set(name,fn),removeEventListener:(name:string)=>handlers.delete(name)});
  vi.stubGlobal('HTMLInputElement',class {}); vi.stubGlobal('HTMLButtonElement',class {});
  try {
    const input=new KeyboardInput();
    const press=(code:string)=>handlers.get('keydown')!({code,target:null,preventDefault:()=>{}});
    press('ArrowRight'); press('KeyI'); expect(input.sample('right').translation[0]).toBe(1);
    press('ShiftLeft'); expect(input.sample('right').translation[0]).toBe(0.2); expect(input.sample('right').rotation[0]).toBe(0.2);
    expect(input.sample('left').translation[0]).toBe(0);
    handlers.get('blur')!({}); expect(input.sample('right').translation[0]).toBe(0);
    input.dispose(); expect(handlers.size).toBe(0);
  } finally { vi.unstubAllGlobals(); }
});
