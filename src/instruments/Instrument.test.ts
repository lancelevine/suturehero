import { describe, it, expect } from 'vitest';
import { Instrument } from './Instrument';
import type { ToolCommand } from '../input/types';
const idle: ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
describe('instrument kinematics',()=>{
  it('moves independently and consistently across frame rates',()=>{
    const left=new Instrument('left',0); const right=new Instrument('right',0); const reference=new Instrument('left',0);
    const command:ToolCommand={...idle,translation:[1,0,0]};
    for(let i=0;i<60;i++)left.update(command,1/60);
    for(let i=0;i<120;i++)reference.update(command,1/120);
    expect(left.root.position.x).toBeCloseTo(reference.root.position.x);
    expect(right.root.position.x).toBe(0.85);
  });
  it('rotates about the tip without changing its position and limits jaw travel',()=>{
    const tool=new Instrument('left',0); const before=tool.root.position.clone();
    tool.update({...idle,rotation:[1,1,1],jaw:1},2);
    expect(tool.root.position.equals(before)).toBe(true); expect(tool.openness).toBe(1);
    tool.update({...idle,jaw:-1},3); expect(tool.openness).toBe(0);
    tool.reset(); expect(tool.openness).toBe(0.65);
  });
});
