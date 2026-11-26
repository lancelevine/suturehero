# SutureHero — instructions for AI coding agents

This file is read by **both** ChatGPT Codex (`AGENTS.md`) and Claude Code
(`CLAUDE.md` imports this file). Keep all shared rules here so both agents
follow the same ones. The project owner is Lance Levine.

## The handoff log — read it first, write to it last

`docs/AGENT_HANDOFF.md` is how the agents (and Lance) tell each other what
changed. Every working session must:

1. **Before starting:** `git pull origin main`, then read the top of
   `docs/AGENT_HANDOFF.md` (the *Status* block and the newest few entries).
   If *Status → In progress* names another agent's unfinished work in the same
   files, stop and ask Lance before editing those files.
2. **While working:** set *Status → In progress* to your agent name and a
   one-line description, and commit/push that change first if the work will
   take more than one commit.
3. **When finishing:** add a new entry at the top of the *Log* section (format
   is in that file), update *Status* (clear *In progress*, update *Known
   issues* / *Next up*), and commit it in the same commit as the work or right
   after.

Keep entries short and factual: what changed, which files, how it was checked,
and what Lance still needs to test by hand (especially anything needing a real
camera, which agents cannot test).

## Working on `main` without conflicts

- Lance commits directly to `main`; there is no PR review step.
- Only one agent should be working at a time. The *In progress* line is the
  lock.
- Pull before you start and again right before you push. If the push is
  rejected, `git pull --rebase origin main`, re-run checks, then push.
- Make small, focused commits. Do not mix reformatting or refactoring with
  behavior changes, and do not reformat code you did not otherwise change —
  large whitespace diffs in `src/tracking.ts` or `src/main.ts` are the most
  likely source of conflicts.
- Never force-push `main`.
- Commit messages: imperative summary line (e.g. `Fix stripe threshold for
  small balls`), then a short body saying why.

## Lance's standing preferences: speed and deployment

- Keep each change focused. Record additional findings as separate follow-ups
  rather than expanding the current task.
- Run targeted checks locally; let deployment CI run the full unit suite.
  Do not repeat broad checks without new changes or a concrete unresolved risk.
- Deploy once the relevant checks pass. Lance has authorized deployment
  without asking again. Stop processing when deployment starts; do not wait
  for completion or send a later completion update.
- Flag investigations likely to exceed 5–10 minutes early, so Lance can
  redirect the work. This is a progress update, not a routine approval gate.
- Respect the shared agent lock and avoid duplicating Claude's work.
- These preferences supersede the former requirement to run the full suite
  locally before every commit. Documentation-only changes need a diff check,
  not application tests or a build.

## Checks appropriate to the change

Use **Node 24** (see `.nvmrc`). Some physics tests are sensitive to tiny
floating-point differences between Node versions and fail on Node 22.

Install dependencies with `npm ci` when needed, not for every edit. For code
changes run relevant tests (`npx vitest run src/path/File.test.ts`),
`npx tsc --noEmit`, and a production build when relevant (`npm run build`).
The GitHub Pages deploy (`.github/workflows/deploy.yml`) runs the full unit
suite and will not publish on failure. Reserve a local full suite for a
specific risk or explicit request.

Browser checks in `scripts/check-*.mjs` need `npm run dev` running and use
local Chromium (Playwright). Run them one at a time when a change touches the
area they cover. Since 2026-11-26 the deploy workflow also runs a fast, reliable
set through `scripts/ci-browser-checks.mjs` (its own dev server; list in
`DEFAULT_CHECKS`) and does not deploy if one fails. Run the same locally with
`node scripts/ci-browser-checks.mjs [check-name ...]`. Add a check to that list
only if it passes reliably in a software-rendered browser.

- `CHROMIUM_PATH` sets the browser binary (default `/usr/bin/chromium`);
  `SUTURE_TEST_URL` sets the dev server URL (default port 5173).
- Marker checks load js-aruco2 from jsDelivr. In a sandbox without that CDN,
  get the same version from the npm registry and point at it:
  `npm pack js-aruco2@2.0.0 && tar xzf js-aruco2-2.0.0.tgz` (in a scratch
  folder), then `ARUCO_LIBRARY_DIR=<that folder>/package/src`.
- Useful set for tracking changes: `check-tracking-storage`,
  `check-camera-controls`, `check-tracking-motion`, `check-driver-depth`,
  `check-ring-handoffs`, `check-calibration-preview`, `check-profiler`.
  (The camera jaw checks were removed with camera jaw tracking in build 0.205.)
- iPhone start-up (`src/ui/iphoneStart.ts`, iPhone camera mode): run
  `check-iphone-start`.
- Demo button (`src/demo/`): run `src/demo/freeKnotDemo.test.ts` (about a
  minute) and `check-demo` (about 12 minutes in a software-rendered sandbox;
  `SUTURE_DEMO_TRACE=1` prints the captions as it goes).
- OV9281 recognition by camera name (`cameraModeForLabel`, `openCamera` in
  `src/input/cameraDevices.ts`): run `check-ov9281-detect`.
- Bluetooth jaw sensor (`src/ui/HallSensorPanel.ts`, `src/input/BleHallSensorSource.ts`):
  run `check-hall-sensor` (fake Web Bluetooth device).
- Sandbox changes (free passes, thread, tears, replay, session panel): run
  `check-sandbox` (uses the development-only `window.__sutureHeroSandbox`
  hook in `src/main.ts`), plus `check-layout` and `check-free-tying`.
- `SUTURE_CAMERA_PRESET=ov9281` makes the shared synthetic camera
  (`scripts/synthetic-camera.mjs`) rehearse the OV9281s: 1280×800,
  monochrome, 120 fps, camera type set to match. Single-camera checks pass
  with it (2026-11-08). Two-camera checks rescale their calibration to the
  preset (`presetCalibration`; `check-handle-jaws-stereo` renders natively at
  the preset size); with it `check-stereo-motion` passes and
  `check-stereo-rig-faces` exceeds its 3 px fit limit (upscaled 2D scene).
  In this sandbox (software rendering) two 1280×800 synthetic cameras deliver
  frames 150–240 ms apart, so stereo pairing (limit 120 ms) drops out there;
  a sandbox limit, not a tracking bug.
- Flaky: `check-depth-stability` (~40–60% pass in this sandbox, also on
  build 0.132; the 6/6 after the sub-pixel corner fix did not hold up)
  (see handoff log).

Some browser checks inject test data by rewriting served source (`page.route`
for `src/tracking.ts` or `src/input/WorkerDetector.ts`, matching exact
compiled text). When you move or rename code they patch, update those checks.

Never weaken a test threshold just to make it pass. If a limit is genuinely
wrong, say why in the commit message and the handoff entry.

## Versioning

- The user-facing build number is `APP_BUILD` in `src/main.ts` (shown as
  `BUILD 0.xx` in the header, whose markup is in `src/ui/practicePageMarkup.ts`
  since 2026-11-26). Bump it for each user-visible change. Also update `build` in
  `performanceContext` in `src/tracking.ts` (shown in exported profiles).
- Describe the change for Lance in the handoff entry. (The README currently
  also contains per-build notes; that history is planned to move to
  `CHANGELOG.md`.)

## Current hardware and priorities (as of 2026-11-07)

- **Camera:** one camera day to day. Stereo (two cameras) is the goal but does
  not yet track well. Do not break the single-camera path while working on
  stereo.
- **Upcoming cameras:** two OV9281 USB 2.0 webcams — **monochrome**, global
  shutter, 1280×800 at up to 120 fps (MJPEG). Implications: the camera
  request (`CAMERA_REQUEST` in `src/input/cameraDevices.ts`) must ask for
  1280×800 and a high frame rate instead of 1080p/30 fps; markers cover fewer pixels than at
  1080p; the two cameras are not hardware-synchronized. Keep current cameras
  working until Lance has switched.
- **Tracker:** the **8-face ring** (`ring8`) is the one in use. The black
  ArUco square is **12 mm**, measured by Lance; 16 mm is the surrounding
  white label, not the detected black-square edge. The physical pads remain
  19 mm. The prism and
  6-face paths still exist; don't remove them without asking.
- **Jaws:** measured only by the **Bluetooth Hall-sensor board** (nRF52840 +
  OH49E, firmware in `firmware/hall-jaw/`, app side `src/ui/HallSensorPanel.ts`).
  All camera jaw tracking (coloured/striped/white balls, marker-relative
  tracker, handle prism) was removed in build 0.205 at Lance's request; do not
  re-add it without asking.
- **Purpose:** intended for training medical students/residents in standard
  suturing and microsurgery, and for research. Be accurate about what is
  validated: say "approximate" or "synthetic test only" when that's the truth.
  Never claim clinical accuracy.

## Project map

- `index.html` → `src/main.ts`: practice scene (Three.js), UI, keyboard and
  camera-driven instruments.
- `tracking.html` → `src/tracking.ts`: camera tracking setup (also embedded in
  the main page). Talks to `main.ts` through `suturehero:*` window events or
  `postMessage`.
- `src/input/`: tracking, calibration, marker/ball detection, workers.
  Camera device handling (requested resolution/frame rate, device lists,
  remembered cameras) is in `src/input/cameraDevices.ts`.
- `src/suture/`, `src/tissue/`, `src/gameplay/`: thread/knot physics, tissue,
  practice-session logic. These are well unit-tested; keep it that way.
- `src/scene/`, `src/visuals/`, `src/ui/`: rendering and UI.
- `scripts/`: browser checks, OpenCV.js build, stereo calibration solver
  (Python).

`src/tracking.ts` and `src/main.ts` are very large. When you add logic, prefer
putting it in a new tested module under `src/input/` (or the relevant folder)
and calling it from those files, rather than growing them further.

## Code style

- TypeScript, strict mode. No new `any` without a reason.
- Write new or changed code readably: one statement per line where practical,
  descriptive names, named constants for tuning values (with units, e.g.
  `MAX_GAP_MS`). Do not mass-reformat existing code in a feature commit.
- Add or update a unit test next to the module (`Foo.ts` → `Foo.test.ts`) for
  any behavior change.
- Browser storage keys start with `suturehero.` and end with a version
  (e.g. `suturehero.jawTracking.v2`) so saved data can be migrated.
