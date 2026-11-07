// Saved tracking settings restore after reload, a corrupt saved stereo
// calibration is discarded, and the tracking page still loads when the
// browser blocks site storage.
//
// With `npm run dev` running:  node scripts/check-tracking-storage.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

async function openTracking(blockStorage = false) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Marker detection is not needed for these checks.
  await page.route('**/arucoWorker*', (route) => route.abort());
  if (blockStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('Storage blocked', 'SecurityError'); },
      });
    });
  }
  await page.goto(new URL('tracking.html', base).href);
  return {page, errors};
}

try {
  {
    const {page, errors} = await openTracking();
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('suturehero.trackerType', 'ring8');
      localStorage.setItem('suturehero.needleJawPattern.v1', 'white10');
      localStorage.setItem('suturehero.depthCalibration.v2', JSON.stringify({near: null, far: null, range: 600, size: {}}));
      localStorage.setItem('suturehero.stereoCalibration.v1', '{corrupt');
    });
    await page.reload();
    await page.waitForSelector('#camera-settings-controls > *');
    const restored = await page.evaluate(() => ({
      tracker: document.querySelector('#tracker-type').value,
      pattern: document.querySelector('#needle-ball-pattern').value,
      depth: document.querySelector('#working-depth-mm').value,
      stereo: localStorage.getItem('suturehero.stereoCalibration.v1'),
    }));
    assert.deepEqual(restored, {tracker: 'ring8', pattern: 'white10', depth: '600', stereo: null});

    await page.evaluate(() => {
      const select = document.querySelector('#tracker-type');
      select.value = 'ring6';
      select.dispatchEvent(new Event('change'));
    });
    assert.equal(await page.evaluate(() => localStorage.getItem('suturehero.trackerType')), 'ring6');
    assert.deepEqual(errors, []);
    await page.evaluate(() => localStorage.clear());
    await page.close();
  }
  {
    const {page, errors} = await openTracking(true);
    await page.waitForSelector('#camera-settings-controls > *', {timeout: 10000});
    assert.equal(await page.evaluate(() => document.querySelector('#tracker-type').value), 'prism');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed: tracking settings restore, corrupt stereo calibration is discarded, and the page loads with storage blocked.');
} finally {
  await browser.close();
}
