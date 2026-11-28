import { describe, expect, it } from 'vitest';
import { NeedleWear } from './needleWear';

describe('needle wear', () => {
  it('dulls faster with a cutting point, lowers the tear limit and resets with a fresh needle', () => {
    const cutting = new NeedleWear('cutting'), taper = new NeedleWear('taper');
    for (let i = 0; i < 8; i++) { cutting.addPass(); taper.addPass(); }
    expect(cutting.extraForce).toBeGreaterThan(taper.extraForce);
    expect(cutting.dull).toBe(true);
    expect(taper.dull).toBe(false);
    expect(cutting.tearFactor).toBeLessThan(1);
    expect(cutting.describe()).toContain('Fresh needle');
    for (let i = 0; i < 100; i++) cutting.addPass();
    expect(cutting.extraForce).toBe(0.6);
    cutting.fresh();
    expect([cutting.tearFactor, cutting.describe()]).toEqual([1, '']);
  });
});
