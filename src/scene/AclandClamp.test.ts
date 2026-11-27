import { afterEach, expect, it } from 'vitest';
import { CLAMP_SPREAD, microProfile, setClampSpread } from '../environments/MicroTargets';
import { AclandClamp } from './AclandClamp';

afterEach(() => setClampSpread(CLAMP_SPREAD.default));

it('places a clamp head on each vessel end that moves with the clamp spread', () => {
  const clamp = new AclandClamp();
  clamp.update(microProfile('artery'), true);
  const heads = () => clamp.root.children.filter((c) => c.name === 'clamp-head').map((c) => c.position.x);
  const wide = heads();
  expect(wide).toHaveLength(2);
  setClampSpread(0.5);
  clamp.update(microProfile('artery'), true);
  expect(Math.abs(heads()[1])).toBeLessThan(Math.abs(wide[1]));
  clamp.update(microProfile('artery'), false);
  expect(clamp.root.visible).toBe(false);
});
