// Runs the fast, reliable browser checks against a fresh dev server (CI and local).
// Usage: node scripts/ci-browser-checks.mjs [check-name ...]
//   CHROMIUM_PATH   browser binary (CI: /usr/bin/google-chrome)
//   CI_CHECK_RETRIES  extra attempts for a failing check (default 1; a pass on retry is reported as flaky)
// Each check runs alone, with a time limit; the script exits non-zero if any check fails.
import {spawn} from 'node:child_process';

/** Checks that pass reliably in a software-rendered browser (timed 2026-11-26: about 7.5 min in total). */
const DEFAULT_CHECKS = [
  'check-ov9281-detect',
  'check-tracking-storage',
  'check-iphone-start',
  'check-camera-controls',
  'check-detection-previews',
  'check-production-mode',
  'check-hall-sensor',
  'check-layout',
  'check-tracking-lab',
  'check-tracking-lab-scroll',
  'check-free-tying',
  'check-sandbox',
  'check-course-export',
  'check-practice-setup',
  // Added 2026-11-27 after two clean sweeps in a software-rendered sandbox.
  'check-calibration-preview',
  'check-calibration-rotation',
  'check-camera-aspect',
  'check-checkerboard-worker',
  'check-driver-depth',
  'check-dual-camera-fit',
  'check-full-scan',
  'check-guided-calibration',
  'check-marker-motion',
  'check-marker-recognition',
  'check-marker-rest',
  'check-neutral-placement',
  'check-predictive-decode',
  'check-profiler',
  'check-render-recovery',
  'check-ring-configuration',
  'check-ring-handoffs',
  'check-ring-markers',
  'check-rotation-frame',
  'check-status-strip',
  'check-stereo-motion',
  'check-stereo-rig-faces',
  'check-stereo-shortcut',
  'check-tracking-lab-layout',
  'check-tracking-motion',
  'check-tracking-panels',
  // Updated for bitmap flow frames (2026-11-27); passed 4/4 here.
  'check-performance',
];
const PORT = 5173;
const SERVER_START_TIMEOUT_MS = 60_000;
const CHECK_TIMEOUT_MS = 6 * 60_000;
const RETRIES = Number(process.env.CI_CHECK_RETRIES ?? 1);

const checks = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_CHECKS;
const url = `http://127.0.0.1:${PORT}/`;

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < SERVER_START_TIMEOUT_MS) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not start within ${SERVER_START_TIMEOUT_MS / 1000} s\n${serverLog}`);
}

function runCheck(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    let output = '';
    const child = spawn(process.execPath, [`scripts/${name}.mjs`], {env: {...process.env, SUTURE_TEST_URL: url}, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => { output += `\nTimed out after ${CHECK_TIMEOUT_MS / 1000} s`; child.kill('SIGKILL'); }, CHECK_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({passed: code === 0, seconds: Math.round((Date.now() - started) / 1000), output});
    });
  });
}

const results = [];
try {
  await waitForServer();
  for (const name of checks) {
    let attempt = 0, result;
    do {
      result = await runCheck(name);
      attempt++;
    } while (!result.passed && attempt <= RETRIES);
    const status = result.passed ? (attempt > 1 ? 'PASS (flaky: passed on retry)' : 'PASS') : 'FAIL';
    results.push({name, status, passed: result.passed});
    console.log(`${status.padEnd(30)} ${name} (${result.seconds} s)`);
    if (!result.passed || attempt > 1) console.log(result.output.split('\n').slice(-25).map((line) => '    ' + line).join('\n'));
  }
} finally {
  server.kill();
}
const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed${failed.length ? ' · failed: ' + failed.map((r) => r.name).join(', ') : ''}`);
process.exit(failed.length ? 1 : 0);
