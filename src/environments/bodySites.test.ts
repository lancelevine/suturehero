import { expect, it } from 'vitest';
import { BODY_SITES, resolveSiteSkin, siteSkin, STANDARD_GAP } from './bodySites';
import { SKIN_TYPES } from './SkinTypes';

const params = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

it('turns a body-site preset into skin settings', () => {
  const forearm = siteSkin(BODY_SITES[0]);
  expect(forearm.dermalBottom).toBeCloseTo(SKIN_TYPES[1].dermalBottom);
  expect(forearm.gap).toBe(STANDARD_GAP);
  const back = siteSkin(BODY_SITES.find((s) => s.id === 'back')!);
  expect(back.dermalBottom).toBeLessThan(forearm.dermalBottom);
  expect(back.gap).toBeGreaterThan(forearm.gap);
});

it('reads a site and slider overrides from the URL, clamped to the slider range', () => {
  expect(resolveSiteSkin(params({}))).toBeNull();
  const face = resolveSiteSkin(params({ site: 'face', tension: '9' }))!;
  expect(face.label).toBe('Face skin');
  expect(face.site.tension).toBe(2);
  expect(face.site.thickness).toBe(0.7);
});
