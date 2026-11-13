// Production mode (src/ui/productionMode.ts): the live 3D view moves into a
// full-screen presentation overlay, keeps rendering, hides the simulator's
// working controls, and returns to the simulator on Exit / Esc.
// With `npm run dev` running:  node scripts/check-production-mode.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
try {
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    const page = await browser.newPage({viewport});
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/');
    const viewInSimulator = () => page.evaluate(() => !!document.querySelector('#viewport').closest('.suturing-app'));
    assert(await viewInSimulator());
    // Opening from Tracking Lab must hand the view over cleanly.
    await page.getByRole('tab', {name: 'Tracking Lab', exact: true}).click();
    await page.getByRole('tab', {name: 'Production', exact: true}).click();
    const state = await page.evaluate(() => {
      const view = document.querySelector('#viewport');
      const box = view.getBoundingClientRect();
      const visible = (selector) => [...document.querySelectorAll(selector)].some((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
      return {
        inProduction: !!view.closest('#production-mode'),
        labOpen: document.body.classList.contains('tracking-lab-active'),
        width: box.width, height: box.height,
        controlsShown: visible('#production-mode .production-stage button'),
        procedure: document.querySelector('[data-production="procedure"]').textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(state.inProduction && !state.labOpen, JSON.stringify(state));
    assert(state.width > viewport.width * 0.8 && state.height > viewport.height * 0.5, JSON.stringify(state));
    assert(!state.controlsShown, 'simulator controls hidden');
    assert.match(state.procedure, /suture/i);
    assert(!state.overflow, 'no horizontal scroll');
    const rendering = await page.evaluate(() => new Promise((resolve) => {
      const canvas = document.querySelector('#viewport canvas');
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(canvas.dataset.renderState)));
    }));
    assert.equal(rendering, 'ready');
    await page.keyboard.press('Escape');
    assert(await page.locator('#production-mode').isHidden());
    assert(await viewInSimulator(), 'view returns to the simulator on Esc');
    await page.getByRole('tab', {name: 'Production', exact: true}).click();
    await page.locator('[data-production-exit]').click();
    assert(await viewInSimulator(), 'view returns to the simulator on Exit');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed: Production mode opens full-screen (desktop and phone), hides simulator controls, and returns on Esc/Exit.');
} finally {
  await browser.close();
}
