// Marker-relative white-ball jaw tracking with a synthetic 3D camera:
// an 8-face ring (real ArUco images, perspective-projected) plus two white
// balls on the jaws, one fixed and one swinging open. Calibrates closed/open
// by clicking the balls and turning, then checks openings in new poses,
// that a bright distractor is ignored, that instrument tracking still runs,
// and that the classic engine switch stops new readings.
//
// With `npm run dev` running:  node scripts/check-marker-jaws.mjs
// (ARUCO_LIBRARY_DIR as for the other marker checks when the CDN is blocked)
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

async function installRingCamera(page) {
  await page.context().route('**/scripts/fixtures/aruco-4x4-50.png', async (route) =>
    route.fulfill({contentType: 'image/png', body: await readFile(new URL('./fixtures/aruco-4x4-50.png', import.meta.url))}));
  await page.addInitScript(() => {
    localStorage.setItem('suturehero.trackerType', 'ring8');
    // Body frame (mm): ball A fixed, ball B swings outward when opening.
    window.__jawScene = {
      opening: 0, turning: false, distractor: false,
      euler: [-15, 180, 0], translation: [10, -40, 380],
      closed: [[-6, 45, 10], [6, 45, 10]], open: [[-6, 45, 10], [22, 41, 10]],
      ballPixels: [], frames: 0,
    };
    window.__jawMessages = [];
    window.addEventListener('message', (e) => { if (e.data?.type === 'suturehero:jaw-opening') window.__jawMessages.push(e.data); });
    navigator.mediaDevices.enumerateDevices = async () => [{kind: 'videoinput', deviceId: 'ring', label: 'Synthetic ring camera', groupId: 'g', toJSON() { return {}; }}];
    navigator.mediaDevices.getUserMedia = async () => {
      const [{localCorners}, {defaultIntrinsics, projectBodyPoint}, THREE] = await Promise.all([
        import('/src/input/prismPose.ts'), import('/src/jaw/jawGeometry.ts'), import('/node_modules/three/build/three.module.js'),
      ]);
      const image = new Image();
      image.src = '/scripts/fixtures/aruco-4x4-50.png';
      await image.decode();
      const W = 960, H = 540, k = defaultIntrinsics(W, H);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');
      const start = performance.now();
      // Affine-map a source triangle of the marker image onto a destination triangle.
      const triangle = (s, d) => {
        const [[x0, y0], [x1, y1], [x2, y2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = d;
        const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
        const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
        const cc = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
        const dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
        c.save();
        c.beginPath(); c.moveTo(u0, v0); c.lineTo(u1, v1); c.lineTo(u2, v2); c.closePath();
        // Expand the clip slightly so the two triangles leave no seam.
        c.lineWidth = 1; c.clip();
        c.setTransform(a, b, cc, dd, u0 - a * x0 - cc * y0, v0 - b * x0 - dd * y0);
        c.drawImage(image, 0, 0);
        c.restore();
      };
      const draw = () => {
        const s = window.__jawScene;
        const t = (performance.now() - start) / 1000;
        const euler = [...s.euler];
        if (s.turning) {
          // A person turning "in small steps": 0.25 s moves, 0.35 s pauses.
          const step = Math.floor(t / 0.6), within = Math.min(1, (t % 0.6) / 0.25), phase = step + within;
          euler[0] += 8 * Math.sin(phase * 0.5);
          euler[1] += 12 * Math.sin(phase * 0.35);
        }
        const pose = {
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler.map((v) => v * Math.PI / 180))),
          translation: new THREE.Vector3(...s.translation),
        };
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = '#5a5a5a';
        c.fillRect(0, 0, W, H);
        for (let face = 0; face < 8; face++) {
          const corners = localCorners(face, 'ring8');
          const center = corners.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(0.25);
          const pad = corners.map((p) => projectBodyPoint(pose, center.clone().add(p.clone().sub(center).multiplyScalar(19 / 16)), k));
          const px = corners.map((p) => projectBodyPoint(pose, p, k));
          if (pad.some((p) => !p) || px.some((p) => !p)) continue;
          // Draw only faces whose corners wind like an upright marker in the
          // image (the solver's convention); others would appear mirrored.
          const area = px.reduce((sum, p, i) => sum + p.x * px[(i + 1) % 4].y - px[(i + 1) % 4].x * p.y, 0);
          if (area < 40) continue;
          c.fillStyle = '#f2f2f2';
          c.beginPath(); pad.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
          const col = face % 7, row = Math.floor(face / 7), sx = col * 100 + 20, sy = row * 100 + 20;
          const src = [[sx, sy], [sx + 60, sy], [sx + 60, sy + 60], [sx, sy + 60]];
          const dst = px.map((p) => [p.x, p.y]);
          triangle([src[0], src[1], src[2]], [dst[0], dst[1], dst[2]]);
          triangle([src[0], src[2], src[3]], [dst[0], dst[2], dst[3]]);
        }
        s.ballPixels = s.closed.map((closed, i) => {
          const body = new THREE.Vector3(...closed).lerp(new THREE.Vector3(...s.open[i]), s.opening);
          const p = projectBodyPoint(pose, body, k);
          const r = k.fx * 5 / p.depth;
          c.fillStyle = '#f4f4f4';
          c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
          return {x: p.x, y: p.y};
        });
        if (s.distractor) {
          const [a] = s.ballPixels;
          c.beginPath(); c.arc(a.x + 70, a.y + 60, 9, 0, Math.PI * 2); c.fill();
        }
        s.frames++;
        requestAnimationFrame(draw);
      };
      draw();
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0], settings = track.getSettings.bind(track);
      track.getSettings = () => ({...settings(), deviceId: 'ring'});
      return stream;
    };
  });
}

try {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  if (process.env.ARUCO_LIBRARY_DIR) {
    await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*', async (route) => route.fulfill({
      contentType: 'application/javascript',
      body: await readFile(join(process.env.ARUCO_LIBRARY_DIR, new URL(route.request().url()).pathname.split('/').at(-1))),
    }));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installRingCamera(page);
  await page.goto(new URL('tracking.html', base).href);
  assert.equal(await page.locator('#tracker-type').inputValue(), 'ring8');
  await page.locator('#start-camera').click();
  await page.waitForFunction(() => /needleDriver: distance/.test(document.querySelector('#tracking-filter-diagnostics')?.textContent ?? ''), {}, {timeout: 30000});

  const status = () => page.locator('[data-jaw-status]').textContent();
  const clickBalls = async () => {
    const points = await page.evaluate(() => {
      const canvas = document.querySelector('#marker-jaw-overlay');
      const rect = canvas.getBoundingClientRect();
      const fit = Math.min(rect.width / canvas.width, rect.height / canvas.height);
      return window.__jawScene.ballPixels.map((p) => ({
        x: rect.left + (rect.width - canvas.width * fit) / 2 + p.x * fit,
        y: rect.top + (rect.height - canvas.height * fit) / 2 + p.y * fit,
      }));
    });
    for (const p of points) {
      await page.evaluate(({x, y}) => document.querySelector('#marker-jaw-overlay').dispatchEvent(new MouseEvent('click', {clientX: x, clientY: y, bubbles: true})), p);
    }
  };
  const calibrate = async (jaw, opening) => {
    await page.evaluate((o) => { window.__jawScene.opening = o; window.__jawScene.turning = false; }, opening);
    await page.waitForTimeout(400);
    await page.evaluate((j) => document.querySelector(`[data-jaw-capture=${j}]`).click(), jaw);
    await clickBalls();
    assert.match(await status(), /turn/i, `${jaw}: balls should be found at the clicks: ${await status()}`);
    await page.evaluate(() => { window.__jawScene.turning = true; });
    await page.waitForFunction((j) => {
      const text = document.querySelector('[data-jaw-status]').textContent;
      return text.includes(`${j} captured`) || text.includes('calibrated') || /Lost|could not|inconsistent|did not/i.test(text);
    }, jaw, {timeout: 30000});
    const text = await status();
    assert.doesNotMatch(text, /Lost|could not|inconsistent|did not/i, text);
    await page.evaluate(() => { window.__jawScene.turning = false; });
  };
  await calibrate('closed', 0);
  await calibrate('open', 1);
  assert.match(await status(), /calibrated/i);

  const readingAt = async (opening, euler, distractor = false) => {
    await page.evaluate(({opening, euler, distractor}) => Object.assign(window.__jawScene, {opening, euler, distractor}), {opening, euler, distractor});
    await page.waitForTimeout(700);
    const text = await page.locator('[data-jaw-readout]').textContent();
    const match = text.match(/(\d+)% open/);
    assert(match, `expected a reading at opening ${opening}: ${text}`);
    return Number(match[1]) / 100;
  };
  const cases = [[0, [-15, 180, 0]], [0.5, [-25, 170, 5]], [1, [-5, 195, -5]], [0.3, [-20, 185, 0], true]];
  const results = [];
  for (const [opening, euler, distractor] of cases) {
    const measured = await readingAt(opening, euler, distractor);
    results.push({opening, measured});
    assert(Math.abs(measured - opening) <= 0.1, `opening ${opening} measured ${measured}`);
  }

  // Openings reach the scene through the usual message.
  const messages = await page.evaluate(() => window.__jawMessages.filter((m) => m.instrument === 'needleDriver').length);
  assert(messages > 5, 'jaw-opening messages should be published');
  // Instrument tracking keeps running.
  assert.match(await page.locator('#tracking-filter-diagnostics').textContent(), /needleDriver: distance/);

  // Classic engine: no new marker-jaw readings.
  await page.evaluate(() => { const s = document.querySelector('[data-jaw-engine]'); s.value = 'classic'; s.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__jawMessages.length);
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.__jawMessages.length), before, 'classic engine (not enabled) should publish nothing');
  assert.equal(await page.evaluate(() => localStorage.getItem('suturehero.jawEngine.v1')), 'classic');

  assert.deepEqual(errors, []);
  console.log('Passed: marker-relative jaw calibration and openings', JSON.stringify(results));
} finally {
  await browser.close();
}
