import { describe, expect, it } from 'vitest';
import { Bleeder, PRESSURE_SECONDS } from './bleeder';

describe('bleeder complication', () => {
  it('starts after enough passes, grows, and stops only with sustained pressure', () => {
    const bleeder = new Bleeder();
    const site = { x: 0.2, y: 0.41, z: 0 };
    bleeder.checkStart(2, site);
    expect(bleeder.state).toBe('waiting');
    bleeder.checkStart(3, site);
    expect(bleeder.state).toBe('bleeding');
    bleeder.update(1, { x: 2, y: 2, z: 2 }, true);
    expect(bleeder.pool).toBeGreaterThan(0);
    bleeder.update(2, site, true);
    bleeder.update(0.1, site, false);
    expect(bleeder.pressure).toBe(0);
    for (let t = 0; t < PRESSURE_SECONDS + 0.2; t += 0.1) bleeder.update(0.1, site, true);
    expect(bleeder.state).toBe('stopped');
    expect(bleeder.describe()).toContain('stopped');
  });
});
