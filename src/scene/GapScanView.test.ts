import { expect, it } from 'vitest';
import { GapScanView } from './GapScanView';

it('draws one bar per open span and follows the current site', () => {
  const view = new GapScanView(0.42);
  view.update([{ from: -1.1, to: -0.9, widest: 0.06 }, { from: 0.2, to: 0.4, widest: 0.05 }], 0.3);
  expect(view.root.children).toHaveLength(2);
  expect(view.root.position.z).toBe(-0.3);
  expect(view.root.children[1].position.z).toBeCloseTo(0.3);
  view.update([], 0);
  expect(view.root.children).toHaveLength(0);
});
