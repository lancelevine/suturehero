// Main-screen status strip: checklist reflects setup, items open the step they
// need, and a hidden marker shows a "holding" reason. Synthetic camera only.
// With `npm run dev` running:  node scripts/check-status-strip.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  if (process.env.ARUCO_LIBRARY_DIR) {
    await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*', async (route) => route.fulfill({contentType: 'application/javascript', body: await readFile(join(process.env.ARUCO_LIBRARY_DIR, new URL(route.request().url()).pathname.split('/').at(-1)))}));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installSyntheticCamera(page);
  await page.goto(new URL('?graphics=low', base).href);
  const item = (key) => page.locator(`[data-status-item="${key}"]`);
  await item('cameras').waitFor({timeout: 15000});
  assert.equal(await item('cameras').getAttribute('data-ok'), 'false', 'camera not started yet');
  await page.locator('#start-camera').click();
  await page.waitForFunction(() => document.querySelector('[data-status-item="cameras"]')?.dataset.ok === 'true', {}, {timeout: 30000});
  await page.waitForFunction(() => /Set neutral: Forceps/.test(document.querySelector('[data-status-item="neutral"]')?.title ?? ''), {}, {timeout: 30000});
  if (process.env.SUTURE_SCREENSHOT) await page.screenshot({path: process.env.SUTURE_SCREENSHOT, clip: {x: 0, y: 0, width: 1440, height: 260}});
  // The neutral item opens Calibrate on the Pose pane.
  await item('neutral').click();
  assert(await page.locator('#workspace-calibration-drawer').isVisible(), 'neutral item opens calibration');
  // Hide the marker: the strip explains why the instrument is holding.
  // The panels below the strip must not move when holding reasons or warnings appear (fixed-height strip, 2026-11-14).
  const panelTop = () => page.evaluate(() => Math.round(document.querySelector('#viewport').getBoundingClientRect().top));
  const topBefore = await panelTop();
  await page.evaluate(() => { window.__ballScene.marker = false; });
  await page.waitForFunction(() => /Forceps: holding · markers not visible/.test(document.querySelector('#tracking-status-strip')?.textContent ?? ''), {}, {timeout: 5000});
  assert.equal(await panelTop(), topBefore, 'holding reason must not push the panels down');
  await page.evaluate(() => { const w = document.querySelector('.tracking-status-warning'); w.hidden = false; w.textContent = 'Camera 1 may have moved since calibration — a long warning that would previously wrap onto its own row and push everything below it down the page'; });
  assert.equal(await panelTop(), topBefore, 'a warning must not push the panels down');
  await page.evaluate(() => { window.__ballScene.marker = true; });
  await page.waitForFunction(() => !/holding · markers not visible/.test(document.querySelector('#tracking-status-strip')?.textContent ?? ''), {}, {timeout: 8000});
  assert.equal(await panelTop(), topBefore, 'clearing messages must not move the panels');
  // Stereo mode without a calibration: the stereo item needs attention.
  await page.locator('#tracking-mode').selectOption('stereo', {force: true});
  await page.waitForFunction(() => document.querySelector('[data-status-item="stereo"]')?.dataset.ok === 'false', {}, {timeout: 5000});
  assert.match(await item('stereo').getAttribute('title'), /No stereo calibration loaded/);
  assert.deepEqual(errors, []);
  console.log('Passed: status strip checklist, item actions, holding reason, stereo item, and panels that stay put as messages come and go.');
} finally {
  await browser.close();
}
