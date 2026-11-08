# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** none
- **Needs Lance to test by hand:**
  - **New jaw tracker** (Calibrate → Needle driver → Jaws → Jaw tracker
    "White balls (new)"): calibrate closed and open with the real
    instrument and camera, then check the reading. Only synthetic-camera
    tested so far. If it doesn't work, the selector switches back to Classic.
- **Known issues:**
  - `FreeKnotTechniques.test.ts` "retains a double surgeon first throw…"
    passes on Node 24 but fails on Node 22 (thread point moves 0.042 vs a
    0.034 limit). The result sits close to its threshold and is sensitive to
    floating-point differences. Use Node 24; a more robust fix is open.
  - Stereo tracking is unreliable in practice; single camera is used.
  - `scripts/check-dual-camera-fit.mjs` fails at 1024×768 (camera previews
    not stacked / wrong proportions). Already failing before 2026-11-07
    changes (verified on `7f44662`); not yet investigated.
  - `scripts/check-depth-stability.mjs` is flaky (passes ~30–50% of runs on
    both the original `7f44662` and current code; A/B tested 10 vs 10). It
    samples depth while it is still settling after unlock. Not a regression.
  - The single-camera pose solvers compute focal length as
    `width/(2·tan(70·π/360/2))` = a **35°** horizontal field of view, though
    comments say 70°. Instrument tracking is self-consistent with it; mm
    distances in mono mode are scaled by this guess. Don't change it without
    re-checking depth calibration; new code must use the same model
    (`defaultIntrinsics` in `src/jaw/jawGeometry.ts`).
  - `src/tracking.ts` (~150 KB) and `src/main.ts` (~57 KB) are monolithic and
    are the most likely place for merge conflicts.
- **Next up (proposed, not started):**
  1. After Lance confirms the new jaw tracker on hardware: delete the
     classic jaw tracker (~70 KB: ball code in `src/tracking.ts`,
     `colorBallSearch`, `stripedBallSearch`, `ballPairTracking`,
     `BallMotionTracker`, `JawCalibration`, `JawViewFusion`, the striped
     worker, and their checks) in its own commit.
  2. New jaw tracker follow-ups: second camera (stereo), forceps balls,
     reduce frame lag by reading balls from the same frame as the markers.
  3. Continue splitting `src/tracking.ts`; next candidate: stereo
     calibration import/status panel.
  4. Add a code formatter in one dedicated commit (agree with Lance first).
  5. When the OV9281 cameras arrive (monochrome, global shutter, 1280×800 @
     up to 120 fps): change `CAMERA_REQUEST` in `src/input/cameraDevices.ts`,
     use white/striped jaw balls for the forceps, then recalibrate and retest
     stereo. Needs real-camera testing by Lance. Lance asked to wait until
     the cameras arrive.

## Log

Newest first. Template:

```
### YYYY-MM-DD — <Agent> — <short title>
- Changed: <what and why>
- Files: <main files touched>
- Checked: <tsc / npm test / build / browser scripts run>
- Lance to test: <hand checks needed, or "nothing">
- Notes for the other agent: <anything surprising, follow-ups>
```

### 2026-11-08 — Claude Code — New marker-relative jaw tracker (white balls)
- Changed: new jaw tracker in `src/jaw/`, selectable in the jaw panel and
  the default; the classic tracker remains under "Classic (previous)".
  Calibration: click each white ball with jaws closed, turn the instrument
  ~15–20° slowly (samples are only recorded below 6°/s), repeat open. Each
  ball's 3D position is solved in the ring's own frame, so ball placement
  is free and Near/Far captures are gone. At run time the ring pose
  predicts each ball's closed→open path; the bright blob on that path gives
  0–1 opening. Brightness only (works with the monochrome OV9281s).
  Instrument tracking is untouched: the jaw code reads camera-1 markers and
  solves its own pose with the pure `solvePrismPose` (ring8: side faces
  only). Openings go through the same `deliverJawOpening` path and
  `suturehero:jaw-opening` message as before.
- Files: `src/jaw/jawGeometry.ts`, `brightBalls.ts`, `JawTracker.ts`,
  `markerJawController.ts` (+ tests), `src/tracking.ts` (mount, per-frame
  call, classic on/off, shared `deliverJawOpening`),
  `src/input/trackingStorage.ts` (two keys),
  `scripts/check-marker-jaws.mjs` (new 3D synthetic ring + balls),
  `scripts/synthetic-camera.mjs` (2D scenes select the classic engine).
- Checked: tsc, full `npm test`, build on Node 24. Instrument-tracking
  browser checks before/after: same results (see Known issues for the flaky
  depth check). `check-marker-jaws` passed 4/4 runs: closed 0–0.07,
  half 0.49–0.50, open 0.91–0.92, 0.3 with a bright distractor 0.28–0.33.
  Classic jaw checks (ball-pairs, striped-jaws, striped-lifecycle) pass.
- Lance to test: see Status. Ball diameter is configurable (default 10 mm).
- Notes for the other agent: only camera 1 for now. A camera 2 path should
  reuse `JawTracker` with that camera's calibrated intrinsics/pose. Do not
  add features to the classic tracker; it is slated for removal.

### 2026-11-07 — Claude Code — Typed tracking → practice-scene messages
- Changed: the four messages tracking sends (pose, jaw opening, status,
  fps) are now defined in `src/input/trackingMessages.ts` with one
  `publishTrackingMessage` helper and validators used by `src/main.ts`.
  Same event names, same embedded/postMessage choice per message, same
  validation as before. `scripts/check-*.mjs` that hardcoded
  `/usr/bin/chromium` now honor `CHROMIUM_PATH` like the rest.
- Files: `src/tracking.ts`, `src/main.ts`, `src/input/trackingMessages.ts`
  (+ test), 8 `scripts/check-*.mjs`, `AGENTS.md` (how to run browser
  checks without the CDN).
- Checked: tsc, full `npm test`, build on Node 24. Browser checks pass:
  tracking-motion, driver-depth (scene instrument moves), ball-pairs,
  striped-jaws, striped-lifecycle, ring-handoffs, calibration-preview,
  tracking-storage, camera-controls.
- Lance to test: with the camera, confirm the needle driver still moves the
  virtual instrument and jaw opening/closing still shows in the scene.
- Notes for the other agent: add new tracking → scene data as a new
  message type in `trackingMessages.ts` with a parser and test.

### 2026-11-07 — Claude Code — Saved tracking settings module; blocked-storage crash fix
- Changed: moved all tracking-page storage keys and parsing into
  `src/input/trackingStorage.ts` (tracker type, needle-driver ball pattern,
  depth calibration, stereo calibration, jaw keys), with safe read/write
  helpers. **Bug fix:** if the browser blocked site storage, restoring the
  stereo calibration threw inside its own error handler and the tracking
  page stopped loading partway (camera panel never rendered). It now loads
  normally with defaults. Storage key names are unchanged.
- Files: `src/tracking.ts`, `src/input/trackingStorage.ts` (+ test),
  `scripts/check-tracking-storage.mjs` (new browser check).
- Checked: tsc, full `npm test`, build on Node 24;
  `check-tracking-storage.mjs` and `check-camera-controls.mjs` pass. The
  blocked-storage failure was reproduced on the old code first.
- Lance to test: reload the tracking page and confirm tracker type (8-face
  ring), needle-driver ball pattern and working depth are remembered.
- Notes for the other agent: use `readStored`/`writeStored` from
  `trackingStorage.ts` for new settings instead of raw `localStorage`.

### 2026-11-07 — Claude Code — README rewrite; camera setup out of tracking.ts
- Changed: README is now a current guide; the 80 per-build notes moved
  unchanged to `CHANGELOG.md` (newest first). Removed the outdated
  `TRACKING_PROTOTYPE.md`. Ignored local OpenCV build output (`vendor/`).
  Moved camera code out of `src/tracking.ts` with no behavior change:
  `src/input/cameraDevices.ts` (requested camera mode in `CAMERA_REQUEST`,
  open/list devices, remembered device per slot, slider scales) and
  `src/ui/CameraSettingsPanel.ts` (focus/exposure/gain panel). Removed
  `openCamera`/`availableCameras` from `arucoTracking.ts` and deleted
  `src/cameraExposure.ts`, which nothing imported.
- Files: `README.md`, `CHANGELOG.md`, `src/tracking.ts`,
  `src/input/cameraDevices.ts` (+ test), `src/ui/CameraSettingsPanel.ts`,
  `src/input/arucoTracking.ts`.
- Checked: tsc, full `npm test` and build on Node 24;
  `check-camera-controls.mjs` and `check-camera-aspect.mjs` pass.
- Lance to test: start the camera on the tracking panel, confirm the camera
  list, remembered camera, and focus/exposure controls behave as before.
- Notes for the other agent: new camera code goes in `cameraDevices.ts`,
  not `tracking.ts`. Storage keys `suturehero-camera-primary/secondary`
  kept unchanged on purpose.

### 2026-11-07 — Claude Code — Record upcoming OV9281 cameras
- Changed: documented the planned OV9281 stereo cameras and their impact
  (no color, 120 fps request needed, 800p) in `AGENTS.md`; added *Next up* 5.
- Files: `AGENTS.md`, `docs/AGENT_HANDOFF.md`.
- Checked: docs only.
- Lance to test: nothing yet.
- Notes for the other agent: don't extend colored-ball features; prefer
  white/striped markers.

### 2026-11-07 — Claude Code — Shared agent instructions and handoff log
- Changed: added `AGENTS.md` (shared rules for Codex and Claude),
  `CLAUDE.md` (points Claude at `AGENTS.md`), this handoff log, and pinned
  Node 24 (`.nvmrc`, `package.json` engines, README) because one physics test
  fails on Node 22.
- Files: `AGENTS.md`, `CLAUDE.md`, `docs/AGENT_HANDOFF.md`, `.nvmrc`,
  `package.json`, `README.md`.
- Checked: `npx tsc --noEmit`, full `npm test` and `npm run build` on Node 24.
- Lance to test: nothing (no app behavior changed).
- Notes for the other agent: please follow the read-first / write-last steps
  in `AGENTS.md` from now on. No source code was changed.
