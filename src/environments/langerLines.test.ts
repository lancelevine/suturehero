import { describe, expect, it } from 'vitest';
import { BODY_SITES } from './bodySites';
import { describeLanger, langerAngle, LANGER_ANGLE_DEG } from './langerLines';

describe("Langer's lines", () => {
  it('has an angle for every body site and describes along vs across', () => {
    for (const site of BODY_SITES) expect(LANGER_ANGLE_DEG[site.id]).toBeTypeOf('number');
    expect(langerAngle(undefined)).toBeNull();
    expect(describeLanger(langerAngle('back'))).toContain('across');
    expect(describeLanger(langerAngle('scalp'))).toContain('along');
  });
});
