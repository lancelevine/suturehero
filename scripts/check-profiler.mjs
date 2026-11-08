// Live performance profiler (Diagnostics → Performance) with synthetic cameras.
// Single camera, then stereo with Camera 2 at a different frame rate, to check
// that the two cameras' measurements are kept apart. Also checks that the
// profiler adds no hook while disabled, and that the JSON export has the
// expected sections and no camera labels or device IDs.
//
// With `npm run dev` running:  node scripts/check-profiler.mjs
// (ARUCO_LIBRARY_DIR as for the other marker checks when the CDN is blocked)
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
const CAMERA1_FPS = 30;
const CAMERA2_FPS = 6;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
try {
  const context = await browser.newContext({viewport: {width: Number(process.env.SUTURE_VIEWPORT_WIDTH ?? 1100), height: Number(process.env.SUTURE_VIEWPORT_HEIGHT ?? 800)}, acceptDownloads: true});
  if (process.env.ARUCO_LIBRARY_DIR) {
    await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*', async (route) => route.fulfill({
      contentType: 'application/javascript',
      body: await readFile(join(process.env.ARUCO_LIBRARY_DIR, new URL(route.request().url()).pathname.split('/').at(-1))),
    }));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installSyntheticCamera(page, {frameRate: CAMERA1_FPS, secondFrameRate: CAMERA2_FPS});
  // Same synthetic stereo scene as check-stereo-motion: 6-face ring, Camera 2 shifted by the marker's disparity.
  await page.addInitScript(() => localStorage.setItem('suturehero.trackerType', 'ring6'));
  await page.goto(new URL('tracking.html', base).href);
  const listenerSet = () => page.evaluate(async () => (await import('/src/diagnostics/TrackingPerformance.ts')).trackingPerformance.listener !== null);

  await page.locator('#camera-select').selectOption('synthetic', {force: true});
  await page.locator('#start-camera').click();
  await page.waitForTimeout(1500);
  assert.equal(await listenerSet(), false, 'profiler must add no hook while disabled');
  assert.equal(await page.locator('#live-profiler').evaluate((d) => d.open), false, 'Performance panel starts collapsed');

  await page.locator('#tracking-diagnostics-panel-toggle').click();
  await page.locator('#live-profiler > summary').click();
  await page.locator('[data-profiler-enable]').check();
  assert.equal(await listenerSet(), true);
  await page.waitForTimeout(4000);
  // One in-page read: the cards are rebuilt twice a second.
  const card = (n) => page.evaluate((i) => document.querySelector(`[data-profiler-camera="${i}"]`)?.innerText ?? '', n);
  const fps = (text) => Number(/Frame arrival: ([\d.]+) fps/.exec(text)?.[1]);
  const single1 = await card(1), single2 = await card(2);
  assert(fps(single1) > 5, single1);
  assert.match(single2, /Not running/);
  const rowNames = () => page.evaluate(() => [...document.querySelectorAll('[data-profiler-rows] tr td:first-child')].map((td) => td.textContent));
  const singleRows = await rowNames();
  assert(singleRows.some((r) => r.includes('Camera 1 decode worker')), singleRows.join('\n'));
  assert(!singleRows.some((r) => r.includes('Camera 2 ')), 'no Camera 2 rows in single-camera mode:\n' + singleRows.join('\n'));
  assert.match(await page.locator('[data-profiler-summary]').innerText(), /Largest measured cost/);

  // Stereo: Camera 2 at a lower frame rate; its arrival FPS must not match Camera 1's.
  await page.locator('#tracking-diagnostics-panel').evaluate((d) => d.close());
  await page.locator('#camera-select-2').selectOption('synthetic-secondary', {force: true});
  await page.locator('#start-camera-2').evaluate((e) => e.click());
  await page.evaluate(() => { window.__ballScene.camera2 = {shift: -180}; });
  await page.locator('#tracking-mode').selectOption('stereo', {force: true});
  const lens = {cameraMatrix: [[1800, 0, 480], [0, 1800, 270], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0]};
  const calibration = {format: 'suturehero-stereo-calibration-v1', imageSize: {width: 960, height: 540}, camera1: lens, camera2: lens, stereo: {rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], translationMm: [-60, 0, 0], baselineMm: 60, rmsPx: 0}};
  await page.locator('#stereo-import').setInputFiles({name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(calibration))});
  await page.waitForFunction(() => document.querySelector('#stereo-geometry-status').textContent.includes('Calibration loaded'));
  await page.locator('#stereo-enable').evaluate((e) => { e.checked = true; e.dispatchEvent(new Event('change', {bubbles: true})); });
  await page.locator('#tracking-diagnostics-panel-toggle').click();
  // Move the marker so poses are solved (a still image holds the last pose without solving).
  await page.evaluate(() => { const start = performance.now(); window.__moving = setInterval(() => { window.__ballScene.shift = 20 * Math.sin((performance.now() - start) / 400); }, 30); });
  await page.locator('[data-profiler-reset]').click();
  await page.waitForTimeout(5000);
  const stereo1 = await card(1), stereo2 = await card(2);
  const fps1 = fps(stereo1), fps2 = fps(stereo2);
  assert(fps2 > CAMERA2_FPS - 3 && fps2 < CAMERA2_FPS + 3, stereo2);
  assert(fps1 > fps2 + 4, `Camera 1 ${fps1} fps vs Camera 2 ${fps2} fps:\n${stereo1}\n${stereo2}`);
  const stereoRows = await rowNames();
  assert(stereoRows.some((r) => r.includes('Camera 2 decode worker')), stereoRows.join('\n'));
  assert(stereoRows.some((r) => r.includes('Stereo pose/synchronization')) && stereoRows.some((r) => r.includes('Stereo fusion (render loop)')), 'stereo stages measured:\n' + stereoRows.join('\n'));

  if (process.env.SUTURE_PROFILER_SCREENSHOT) await page.screenshot({path: process.env.SUTURE_PROFILER_SCREENSHOT});
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-profiler-download]').click()]);
  const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  if (process.env.SUTURE_PROFILER_REPORT) await writeFile(process.env.SUTURE_PROFILER_REPORT, JSON.stringify(report, null, 2));
  assert.equal(report.type, 'suturehero-live-profile');
  assert.deepEqual(report.cameras.map((c) => c.index), [1, 2]);
  assert(report.stages.length > 5 && report.breakdown && report.browser.userAgent);
  const text = JSON.stringify(report);
  assert(!/deviceId|groupId|Synthetic ball pair camera/.test(text), 'report must not contain device IDs or camera labels');

  await page.locator('[data-profiler-enable]').uncheck();
  assert.equal(await listenerSet(), false, 'disabling removes the hook');
  assert.deepEqual(errors, []);
  console.log('Passed: profiler off by default; single-camera and stereo measurements kept per camera', JSON.stringify({single: fps(single1), camera1: fps1, camera2: fps2, stages: report.stages.length, bottleneck: report.breakdown.bottleneck?.name}));
} finally {
  await browser.close();
}
