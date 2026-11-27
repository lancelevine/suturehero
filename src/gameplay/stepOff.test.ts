import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeStepOffs } from './stepOff';

it('flags stitches whose edges sit at different heights', () => {
  const units = (mm: number) => mm / SCENE_MM_PER_UNIT;
  expect(describeStepOffs([{ mismatch: units(0.2) }, { mismatch: -units(0.8) }, {}])).toBe('Step-off: 2/3 level within 0.5 mm · stitch 2 0.8 mm');
  expect(describeStepOffs([])).toMatch(/tie a stitch/);
});
