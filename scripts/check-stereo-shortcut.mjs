// The main bar's "Start 2 cameras + metric 3D" shortcut starts both synthetic
// cameras without opening Tracking setup, and shows its status message.
// With `npm run dev` running:  node scripts/check-stereo-shortcut.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installSyntheticCamera(page);
  await page.goto(new URL('?graphics=low', base).href);
  const shortcut = page.getByRole('button', {name: 'Start 2 cameras + metric 3D', exact: true});
  await shortcut.waitFor({state: 'visible', timeout: 15000});
  // Pick distinct devices first, as a user with two cameras would have.
  await page.locator('#camera-select-2').selectOption('synthetic-secondary', {force: true});
  await shortcut.click();
  await page.waitForFunction(() => document.querySelector('#camera-video')?.videoWidth > 0 && document.querySelector('#camera-video-2')?.videoWidth > 0, {}, {timeout: 30000});
  await page.waitForFunction(() => /Both cameras started/.test(document.querySelector('#start-stereo-shortcut-status')?.textContent ?? ''), {}, {timeout: 10000});
  assert(await page.locator('#start-stereo-shortcut-status').isVisible(), 'status shows under the cameras');
  assert(!(await page.getByRole('dialog', {name: 'Tracking setup', exact: true}).isVisible()), 'no panel needed');
  assert.deepEqual(errors, []);
  console.log('Passed: main-bar stereo shortcut starts both cameras and shows its status.');
} finally {
  await browser.close();
}
