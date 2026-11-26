import { expect, it } from 'vitest';
import { KNOT_ENGINES } from '../knot/engines';
import { practicePageMarkup } from './practicePageMarkup';

it('shows the build and lists the setup choices, keeping the ids main.ts relies on', () => {
  const html = practicePageMarkup({ build: '0.999', buildInfo: '2026-11-26', revision: 'abc123' });
  expect(html).toContain('BUILD 0.999 · 2026-11-26 (abc123)');
  for (const engine of KNOT_ENGINES) expect(html).toContain(`<option value="${engine.id}"`);
  for (const id of ['viewport', 'knot-engine', 'skin-type', 'needle-type', 'suture-material', 'micro-target', 'switch-environment', 'camera-tracking-toggle', 'exercise-readout']) {
    expect(html, id).toContain(`id="${id}"`);
  }
});
