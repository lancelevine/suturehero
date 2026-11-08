// Handle-prism jaw tracking with TWO synthetic 3D cameras and stereo (build 0.119):
// camera 2 sits 60 mm to the right of camera 1, a matching stereo calibration is
// imported, and the opening must come from the triangulated prism position
// ("stereo 3D"), including at a rolled pose. Based on check-handle-jaws.mjs: an 8-face ring plus a
// triangular marker prism (needle driver IDs 8, 9, 30) on a handle that turns
// about a hinge. Calibrates closed/open through the Jaws panel, then checks
// openings at a new hinge angle and a new instrument pose. Synthetic only.
//
// With `npm run dev` running:  node scripts/check-handle-jaws.mjs
// (ARUCO_LIBRARY_DIR as for the other marker checks when the CDN is blocked)
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';

const base = process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/';
/** Allowed error in the reported opening (fraction of closed→open). */
const OPENING_TOLERANCE = 0.15;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});

async function installCamera(page) {
  await page.context().route('**/scripts/fixtures/aruco-4x4-50.png', async (route) =>
    route.fulfill({contentType: 'image/png', body: await readFile(new URL('./fixtures/aruco-4x4-50.png', import.meta.url))}));
  await page.addInitScript(() => {
    localStorage.setItem('suturehero.trackerType', 'ring8');
    localStorage.setItem('suturehero.jawEngine.v1', 'handle');
    window.__scene = {swapFaces: !!window.__swapFaces, hingeDeg: 0, euler: [-15, 180, 0], translation: [10, -20, 380], frames: 0};
    navigator.mediaDevices.enumerateDevices = async () => [
      {kind: 'videoinput', deviceId: 'ring', label: 'Synthetic ring camera', groupId: 'g', toJSON() { return {}; }},
      {kind: 'videoinput', deviceId: 'ring2', label: 'Synthetic ring camera 2', groupId: 'g2', toJSON() { return {}; }},
    ];
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      // Camera 2: X2 = X1 + T with T = (−60, 0, 0) mm (same orientation and lens).
      const secondary = constraints?.video?.deviceId?.exact === 'ring2';
      const offsetX = secondary ? -60 : 0;
      const [{localCorners, faceGeometry}, {defaultIntrinsics, projectBodyPoint}, {HANDLE_PRISM_IDS}, THREE] = await Promise.all([
        import('/src/input/prismPose.ts'), import('/src/jaw/jawGeometry.ts'), import('/src/jaw/handleHinge.ts'), import('/node_modules/three/build/three.module.js'),
      ]);
      const image = new Image();
      image.src = '/scripts/fixtures/aruco-4x4-50.png';
      await image.decode();
      const W = 960, H = 540, k = defaultIntrinsics(W, H);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');
      const triangle = (s, d) => {
        const [[x0, y0], [x1, y1], [x2, y2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = d;
        const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
        const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
        const cc = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
        const dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
        c.save();
        c.beginPath(); c.moveTo(u0, v0); c.lineTo(u1, v1); c.lineTo(u2, v2); c.closePath(); c.clip();
        c.setTransform(a, b, cc, dd, u0 - a * x0 - cc * y0, v0 - b * x0 - dd * y0);
        c.drawImage(image, 0, 0);
        c.restore();
      };
      /** Draw one marker (ID) given its 4 body-frame corners, with a white pad. */
      const drawMarker = (pose, id, corners) => {
        const center = corners.reduce((sum, p) => sum.clone().add(p), new THREE.Vector3()).multiplyScalar(0.25);
        const pad = corners.map((p) => projectBodyPoint(pose, center.clone().add(p.clone().sub(center).multiplyScalar(19 / 12)), k));
        const px = corners.map((p) => projectBodyPoint(pose, p, k));
        if (pad.some((p) => !p) || px.some((p) => !p)) return;
        const area = px.reduce((sum, p, i) => sum + p.x * px[(i + 1) % 4].y - px[(i + 1) % 4].x * p.y, 0);
        if (area < 40) return;
        c.fillStyle = '#f2f2f2';
        c.beginPath(); pad.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
        const col = id % 7, row = Math.floor(id / 7), sx = col * 100 + 20, sy = row * 100 + 20;
        const src = [[sx, sy], [sx + 60, sy], [sx + 60, sy + 60], [sx, sy + 60]];
        const dst = px.map((p) => [p.x, p.y]);
        triangle([src[0], src[1], src[2]], [dst[0], dst[1], dst[2]]);
        triangle([src[0], src[2], src[3]], [dst[0], dst[2], dst[3]]);
      };
      // Handle prism in the ring frame: parallel to ring face 3 (the face this
      // camera pose sees head-on), 60 mm down the shaft, turning about that
      // face's normal through a hinge 25 mm down the shaft. Apothem of a 19 mm
      // equilateral prism ≈ 5.5 mm.
      // Prism body (original 3-face prism layout) mounted parallel to ring
      // face 3, 60 mm along the shaft, turning about that face's normal
      // through a hinge 25 mm along the shaft.
      const face3 = faceGeometry(3, 'ring8');
      const mount = face3.rotation.clone();
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mount).normalize();
      const hingeAxis = normal.clone();
      const hingePoint = face3.center.clone().add(new THREE.Vector3(0, 25, 0));
      const prismOrigin = face3.center.clone().add(new THREE.Vector3(0, 60, 0)).sub(faceGeometry(0, 'prism').center.clone().applyQuaternion(mount));
      const draw = () => {
        const s = window.__scene;
        const ring = {
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.euler.map((v) => v * Math.PI / 180))),
          translation: new THREE.Vector3(...s.translation).add(new THREE.Vector3(offsetX, 0, 0)),
        };
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = '#5a5a5a';
        c.fillRect(0, 0, W, H);
        for (let face = 0; face < 8; face++) drawMarker(ring, face, localCorners(face, 'ring8'));
        const hinge = new THREE.Quaternion().setFromAxisAngle(hingeAxis, s.hingeDeg * Math.PI / 180);
        // SUTURE_SWAP_FACES: stickers 9 and 30 swapped, as on a prism built in the reverse order.
        (s.swapFaces ? [8, 30, 9] : HANDLE_PRISM_IDS.needleDriver).forEach((id, face) => {
          const corners = localCorners(face, 'prism').map((p) => p.applyQuaternion(mount).add(prismOrigin).sub(hingePoint).applyQuaternion(hinge).add(hingePoint));
          drawMarker(ring, id, corners);
        });
        s.frames++;
        requestAnimationFrame(draw);
      };
      draw();
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0], settings = track.getSettings.bind(track);
      track.getSettings = () => ({...settings(), deviceId: secondary ? 'ring2' : 'ring'});
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
  // Must run before installCamera's init script, which reads it.
  if (process.env.SUTURE_SWAP_FACES) await page.addInitScript(() => { window.__swapFaces = true; });
  await installCamera(page);
  await page.goto(new URL('tracking.html', base).href);
  await page.locator('#ball-enable').evaluate((e) => { e.checked = true; e.dispatchEvent(new Event('change')); });
  await page.locator('#camera-select').selectOption('ring', {force: true});
  await page.locator('#start-camera').click();
  await page.locator('#camera-select-2').selectOption('ring2', {force: true});
  await page.locator('#start-camera-2').evaluate((e) => e.click());
  await page.locator('#tracking-mode').selectOption('stereo', {force: true});
  // Same lens model the synthetic renderer uses (defaultIntrinsics at 960×540).
  const f = 960 / (2 * Math.tan((70 * Math.PI) / 360 / 2));
  const lens = {cameraMatrix: [[f, 0, 480], [0, f, 270], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0]};
  const calibration = {format: 'suturehero-stereo-calibration-v1', imageSize: {width: 960, height: 540}, camera1: lens, camera2: lens, stereo: {rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], translationMm: [-60, 0, 0], baselineMm: 60, rmsPx: 0}};
  await page.locator('#stereo-import').setInputFiles({name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(calibration))});
  await page.waitForFunction(() => document.querySelector('#stereo-geometry-status').textContent.includes('Calibration loaded'));
  await page.locator('#stereo-enable').evaluate((e) => { e.checked = true; e.dispatchEvent(new Event('change', {bubbles: true})); });
  // This synthetic prism is the 3-face model with 12 mm faces (markers fill them); the setting must match the
  // real face width, or different faces find slightly different centre lines.
  await page.locator('[data-handle-face-width]').evaluate((e) => { e.value = '12'; e.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(2500);
  const status = () => page.locator('[data-handle-status]').textContent();
  const readout = () => page.locator('[data-handle-readout]').textContent();
  // Nudge the ring so stereo poses are solved (a still image is not re-solved).
  const wiggle = async (ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await page.evaluate((t) => { window.__scene.translation[0] = 10 + Math.sin(t / 150) * 0.6; }, Date.now());
      await page.waitForTimeout(60);
    }
  };
  const capture = async (jaw, done) => {
    await page.locator(`[data-handle-capture="${jaw}"]`).evaluate((b) => b.click());
    const end = Date.now() + 25000;
    while (Date.now() < end) {
      await wiggle(400);
      if (new RegExp(done).test(await status())) return;
    }
    throw new Error(`${jaw} capture: ${await status()} · ${await readout()}`);
  };
  await capture('closed', 'Stereo closed position captured|closed captured');
  await page.evaluate(() => { window.__scene.hingeDeg = 20; });
  await wiggle(600);
  await capture('open', 'Stereo calibrated');
  console.log('calibration:', await status());
  const results = [];
  // (−15, 300, 0) shows only prism face 30 (calibrated on face 8): checks that every face gives the same prism axis.
  for (const [hingeDeg, expected, euler] of [[10, 0.5, null], [0, 0, null], [20, 1, null], [10, 0.5, [-15, 205, 0]], [10, 0.5, [-15, 300, 0]]]) {
    await page.evaluate(([h, e]) => { window.__scene.hingeDeg = h; if (e) window.__scene.euler = e; }, [hingeDeg, euler]);
    await wiggle(1500);
    const text = await readout();
    const match = /(\d+)% open/.exec(text ?? '');
    results.push({hingeDeg, expected, measured: match ? Number(match[1]) / 100 : null, readout: text});
    assert(match && /stereo 3D/.test(text), JSON.stringify(results));
    assert(Math.abs(Number(match[1]) / 100 - expected) <= OPENING_TOLERANCE, JSON.stringify(results));
  }
  assert.deepEqual(errors, []);
  console.log('Passed: stereo handle-prism jaws (triangulated prism position)', JSON.stringify(results.map(({hingeDeg, expected, measured}) => ({hingeDeg, expected, measured}))));
} finally {
  await browser.close();
}
