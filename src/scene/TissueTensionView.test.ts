import { expect, it } from 'vitest';
import { stitchTension, TissueTensionView, tensionColour } from './TissueTensionView';

const site = (siteZ: number, initialGap: number, closure: number) => ({ siteZ, initialGap, closure, eversion: 0, pucker: 0 });

it('colours each tied stitch by the tension it holds', () => {
  expect(stitchTension(site(0, 0.1, 1))).toBe(1);
  expect(tensionColour(0.5).g).toBeGreaterThan(tensionColour(0.5).r);
  expect(tensionColour(1.6).r).toBeGreaterThan(tensionColour(1.6).g);
  const view = new TissueTensionView(0.41);
  view.update([site(-0.5, 0.1, 1), site(0.5, 0.14, 1)], 0, true);
  expect(view.root.children).toHaveLength(2);
});
