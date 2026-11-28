import { describe, expect, it } from 'vitest';
import { assessTieOff, describeTieOff } from './runningTieOff';

describe('running tie-off', () => {
  it('grades the last loop and slack along the line', () => {
    expect(assessTieOff([])).toBeNull();
    const good = assessTieOff([0.3, 0.2, 2])!;
    expect(good).toMatchObject({ longEnough: true, cinched: false, looseLoops: 0 });
    expect(describeTieOff(good)).toContain('line snug');
    const cinched = assessTieOff([2, 0.1])!;
    expect(cinched).toMatchObject({ cinched: true, looseLoops: 1 });
    expect(describeTieOff(cinched)).toContain('cinched');
    expect(describeTieOff(assessTieOff([0.8]))).toContain('a little longer');
  });
});
