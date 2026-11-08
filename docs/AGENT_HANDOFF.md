# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** Claude Code — jaw tracking performance (brightBalls.ts, JawTracker.ts, markerJawController.ts).
- **Needs Lance to test by hand:**
  - **Stereo stabilization (build 0.88):** reload, hold the needle driver
    still, and confirm that the virtual instrument no longer jumps. Then move
    it deliberately and check that response remains usable. The supplied
    1.9-second Lab recording showed ACTIVE fits around 0.6–1.1 px alongside
    large pose discontinuities, motivating the continuity gate.
  - **Stereo correction (build 0.85):** test the needle driver in both cameras
    with unused instruments out of view, and confirm triangulation.
    IDs 2/3 on another instrument currently overlap the needle-driver group.
    Recapture ring mono Near/Far and marker-relative jaw calibrations made
    before this correction. Keep the existing checkerboard stereo calibration.
    If stereo still rejects, send the status/rejection text or a Lab recording.
  - **Tracking Lab (build 0.83):** record a real single/stereo-camera failure,
    stop, replay, and export it. Confirm practical recording FPS and image
    quality with the actual webcams. Replay has synthetic-camera coverage,
    not real-hardware validation.
  - **New jaw tracker** (Calibrate → Needle driver → Jaws → Jaw tracker
    "White balls (new)"): calibrate closed and open with the real
    instrument and camera, then check the reading. Only synthetic-camera
    tested so far. If it doesn't work, the selector switches back to Classic.
- **Known issues:**
  - Tracking Lab library can be clipped by camera setup's body overflow lock;
    browser zoom-out is the current workaround. A separate Lab scrolling fix
    is still needed.
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
### 2026-11-08 — Claude Code — Stereo workspace calibration (build 0.95)
- Changed: new `src/input/stereoWorkspace.ts` (axes from guided captures,
  up = right × forward checked against the up move, sweep scale = 4 units /
  larger horizontal extent, save/parse per stereo calibration) and
  `src/ui/StereoWorkspacePanel.ts`; `tracking.ts` feeds needle-driver stereo
  positions and maps rendered stereo positions with
  `workspacePracticePosition` (old camera-axis mapping without a workspace).
  Positions only; rotations still in the existing frame (follow-up).
- Checked: `stereoWorkspace` tests (tilted-camera axes, forward → −z only,
  rejections, persistence); stereo-motion, stereo-rig-faces,
  tracking-storage pass; panel renders without errors. No synthetic 3D walk
  through the guided steps; first full run is Lance's.
- Lance to test: steps 1–5 with stereo active, then forward/back and
  left/right movement.

### 2026-11-08 — Claude Code — Speed-adaptive rotation smoothing (build 0.94)
- Changed: `TrackedPoseFilter` rotation time constant = min(previous
  error-based value, 1/(2π(1 Hz + 0.1 Hz per °/s))), with angular velocity
  smoothed as a vector (τ 0.5 s). Position unchanged.
- Checked: filter tests incl. new steady-turn lag test; tracking-motion,
  ring-handoffs, marker-rest, stereo-motion browser checks pass.
- Lance to test: rotation responsiveness and stillness at rest.

### 2026-11-08 — Claude Code — Stereo jaw opening from 3D ball distance (build 0.93)
- Changed: new `src/jaw/stereoBallDistance.ts` (triangulate candidate
  pairings, ray gap ≤ 3 mm, spacing range, median, opening from distance).
  `markerJawController`: host `second` camera + `stereoCalibration()`
  (wired in tracking.ts); calibration records distance medians (camera-1
  balls = the tracked clicked balls); `JawModel.stereo {closedMm, openMm}`
  saved; at run time stereo distance is preferred, ring method otherwise.
- Checked: `src/jaw` tests (29); `check-marker-jaws`, Lab jaw check,
  `check-stereo-motion` pass. Real-data check on Lance's 11:48 PM clip was
  inconclusive: recorded at ~4 fps/camera with ~100 ms camera offsets; the
  only raw matches were wrong (~57 mm), which the new spacing filter rejects.
- Lance to test: recalibrate jaws in stereo; readout should say "stereo 3D
  ball distance". A higher-FPS Lab recording would allow offline checks.

### 2026-11-08 — Claude Code — Jaw ball lock-on and bright-spot following (build 0.92)
- Changed: `JawTracker` keeps a per-ball lock (path fraction, velocity),
  predicts, detects at 1/0.65/1.5× size near the prediction, and falls back
  to `brightSpotCentroid` (new, `brightBalls.ts`) at the prediction; lock
  timeout 300 ms.
- Checked: `src/jaw` tests (new: smaller ball, partly blocked ball kept only
  when locked, lock dropped when gone); `check-marker-jaws`,
  `check-tracking-lab-marker-jaws` pass.
- Lance to test: jaw opening/closing after calibration.

### 2026-11-08 — Claude Code — Jaw ball size measured at calibration (build 0.91)
- Changed: `markerJawController` snapSeeds tries sizes 1/0.6/0.4/1.6× the
  setting, measures diameter = setting × measured/expected radius, uses it
  for capture and the saved model, and shows it in the diameter field.
- Checked: tsc; `check-marker-jaws` with the setting at 10, 16 and 6 mm
  (new `SUTURE_JAW_WRONG_SIZE` option asserts ~10 mm measured).
- Lance to test: jaw calibration (closed, open).
- Next (agreed): stereo workspace alignment, 100 mm/unit stereo scale,
  steadier rotation at rest.

### 2026-11-08 — Claude Code — Shared ring model corrected; stereo checks fixed (build 0.90)
- Changed: `faceGeometry` (prismPose.ts) reflects ring faces z → −z
  (rotation (−qx,−qy,qz,qw), centre z negated); `RING_LAYOUT_REVISION = 2`.
  Removed 0.89's stereo-only `ringChirality.ts` (equivalent; stereo results
  identical on all recordings). Saved jaw models carry `ringLayout` and the
  depth binding includes `layout2`, so old calibrations are not reused.
- Tests: independent references in `prismPose.test.ts` and
  `ring8MeshReference.test.ts` mirrored in z with comments citing the
  triangulated recordings (assertions/tolerances unchanged); face k now
  turns −k·60°. Added a jaw test rejecting pre-revision models.
- Browser checks: `check-ring-configuration` expected 16 mm ring squares →
  12 mm. `check-stereo-motion` (failing since 0.85): its synthetic camera-2
  shift was the disparity for 16 mm (135 px); now 180 px for 12 mm, and the
  far/near scales (0.69 / 1.5) restore its original 267 / 400 mm movements,
  thresholds unchanged. Passed 3/3.
- Checked: tsc; `src/input`, `src/jaw`, `src/trackingLab` (265 tests);
  stereo-rig-faces, tracking-motion, ring-handoffs, driver-depth,
  ring-configuration, rotation-frame, neutral-placement, marker-jaws,
  calibration-preview, stereo-motion pass.
- Lance to test: recalibrate neutral, Near/Far and jaws; then mono and
  stereo, at rest and moving.
- Note: mono still has workarounds (angled-marker alignment learning,
  face-handoff logic) written for the mirrored model; they still pass their
  checks but may now be unnecessary. Review later, not urgent.

### 2026-11-08 — Claude Code — Stereo ring chirality correction (build 0.89)
- Finding: the ring model (`prismPose.ts` faceGeometry/localCorners) is the
  x-mirror of the physical ring. Triangulated in marker 3's frame, marker 2
  measured (−13.8, 0.2, **+7.9**) mm vs model (−14.2, 0, **−8.2**); marker 7
  likewise (+4.6 vs −4.1). Single planar markers fit either way (mono OK),
  but multi-marker stereo never fit and single-marker fits disagreed by
  60°/120° → jumping at rest.
- Changed: new `src/input/ringChirality.ts` (mirror-corrected ring faces,
  body pose from a marker, conversion to/from the existing output
  convention = 180° about the shaft). `solveStereoRigPose` uses it
  internally; callers and mono are unchanged. Updated the synthetic views in
  `stereoRigPose.test.ts` and `check-stereo-rig-faces.mjs` to the physical
  layout (expected results unchanged).
- Checked: tsc; `src/input`, `src/jaw`, `src/trackingLab` unit tests;
  `check-stereo-rig-faces` passes (twice). Real recordings through the real
  code: at-rest clip 24/24 multi-marker fits, median 0.88 px, frame-to-frame
  turn median 0.5° / max 1.4°.
- Follow-ups: mono still uses the mirrored model (its face-handoff and
  angled-marker alignment workarounds likely compensate for this);
  switching mono to the physical layout would remove those but changes
  orientation conventions and needs recalibration — decide with Lance.
  Stereo-fallback mono views (`stereoMonoViews` in tracking.ts) also still
  use the mirrored model. Prism layout unchanged (no data).
  `check-stereo-motion` still failing from before (see 0.88 entry).
- Lance to test: stereo at rest and moving.

### 2026-11-08 — Claude Code — Continuous stereo single-marker fallback (build 0.88)
- Changed: `solveStereoRigPose`'s 0.85 fallback now picks the single-marker
  fit nearest the previous pose (`chooseFallbackPose`, max 25° turn) instead
  of the lowest error; `tracking.ts` keeps the last accepted stereo pose for
  500 ms through rejected frames as that reference.
- Checked: tsc, stereo unit tests; replay of Lance's 8:58 PM corners: jumps
  >20° 4 → 0, accepted 14 → 12 of 22. `check-stereo-rig-faces` passes.
- **Known failing:** `check-stereo-motion` fails ({"far":-5.1…}) with and
  without this change (tested on `27e6307`), so it broke earlier, most
  likely with the 0.85 12 mm geometry change (its synthetic scene assumed
  the old size). Needs updating or investigation.
- Lance reports jumping continues even with markers 3 and 7 hidden, so this
  is not the whole cause. Next: a compact Lab recording of the instrument
  at rest in stereo.

### 2026-11-08 — Claude Code — Lab scrolling and compact export (build 0.87)
- Changed: `.tracking-lab` scrolls (body is overflow:hidden; at 1536×730
  the Lab content was ~1050 px in a 666 px area, hiding Import/library/
  Export). New `src/trackingLab/compactExport.ts` + "Export compact" per
  recording; replay (`engine.ts`) and Lab display (`ui.ts`) draw images at
  the manifest's recorded size, accepting smaller same-aspect images.
- Checked: tsc, `src/trackingLab` unit tests; browser: Record/Import
  reachable at 1366×650, 1536×730, 1920×1000; Lance's real 17 MB stereo
  recording → compact 5.4 MB, imported without errors.
- Lance to test: Export compact on a longer recording; upload it.
- Open: stereo jumps at rest (Lance). In his 8:58 PM clip the 0.85 stereo
  outlier fallback picks a single marker per frame, alternating 7 and 3,
  whose single-marker poses differ ~20 mm / ~60°. Triangulation shows the
  model 3↔7 relation is right (measured 18.4 mm / 32.8° vs 18.3 / 30°);
  marker 7 corners read ~12.5 mm (steep view). Proposed: keep the previous
  marker set (hysteresis) and reject large jumps unless sustained; later,
  reuse mono's learned angled-marker correction in stereo. Awaiting Lance.

### 2026-11-08 — Claude Code — Jaw setup with angled markers; specific click errors (build 0.86)
- Changed: `markerJawController` uses side faces when visible, otherwise the
  angled faces (previously side faces only, so "only marker 6 visible" gave
  no ring pose and Lance's "Could not find a white ball…" error). On his
  recorded frames, with the corrected geometry: marker 6 alone 0.0–0.5 px;
  side faces ~0.1–1.1 px; mixing 6 with side faces sometimes ~5 px, hence
  the preference. Click failures now state the reason. Build 0.86.
- Files: `src/jaw/markerJawController.ts`, `src/main.ts`, `src/tracking.ts`
  (build label), `CHANGELOG.md`.
- Checked: tsc, `src/jaw` unit tests, `check-marker-jaws` browser check.
- Lance to test: jaw calibration with the real instrument (both balls).

### YYYY-MM-DD — <Agent> — <short title>
- Changed: <what and why>
- Files: <main files touched>
- Checked: <tsc / npm test / build / browser scripts run>
- Lance to test: <hand checks needed, or "nothing">
- Notes for the other agent: <anything surprising, follow-ups>
```

### 2026-11-08 — Codex — Stabilize accepted stereo poses
- Changed: build 0.88 adds a stereo-only continuity gate and fixed temporal
  filter before accepted metric poses reach the virtual instrument. One-off
  position/orientation discontinuities are held; three consistent samples can
  reacquire a sustained new pose. Mono tracking is unchanged.
- Evidence: Lance's 1.9-second recording contained 61 diagnostic frames with
  ACTIVE ID 7 fits around 0.6–1.1 px, while pose samples still had large
  discontinuities. This distinguishes fit acceptance from temporal stability.
- Checked: TypeScript, production build, and 18 focused stereo/filter tests.
- Lance to test: stationary stability and deliberate movement on build 0.88.

### 2026-11-08 — Codex — Save Lance's faster workflow preferences
- Changed: AGENTS.md now requires focused scope, targeted local checks with
  full tests in CI, early updates for investigations exceeding 5–10 minutes,
  and no duplicated Claude work. Deployment is preauthorized; stop when it
  starts. Replaced the conflicting mandatory local full-suite requirement.
- Checked: documentation diff only; no application changes or deployment.
- Lance to test: nothing.

### 2026-11-07 (America/New_York) — Codex — Measured ring geometry and stereo recovery
- Changed: 12 mm black squares (not the 16 mm white label); angled pads
  moved to the physically confirmed marker-top end, using Claude's findings
  in docs/stereo-findings-2026-11-08.md. Shared-ID fallback recovers stereo
  when incompatible extra markers corrupt the joint fit; original 3 px RMS /
  6 px corner rejection limits are unchanged. Small-ring-marker rotation
  stability is retained without weakening the existing noise test.
- Calibration: old ring Near/Far bindings and marker-relative jaw models
  learned with 16 mm need recapturing. Stereo checkerboard calibration and
  legacy prism compatibility are retained. Build 0.85.
- Checked: full 511-test suite, tsc/build and real-image replay passed before
  the final angled-pad correction. After that correction, tsc and all 259
  focused input/jaw/Lab tests passed, including independent STL geometry and
  physical adjacency. Full suite after the final layout change is delegated
  to deployment CI at Lance's explicit request to deploy immediately.
- Real recording evidence before final pad correction: 363/474 nearest-time
  detection pairs accepted vs 0 before; actual 240-image / 6.933 s prefix
  replay became ACTIVE, ending at 1.21 px. Final pad layout also has Claude's
  independent real-image evidence in the findings document. These are not
  ground-truth accuracy measurements.
- Lance to test: refresh build 0.85, keep unused instruments out of view
  initially (IDs 2/3 overlap the needle-driver group), confirm stereo, then
  recapture mono Near/Far and white-ball jaw calibration as needed.
- Notes for Claude: lock cleared; continue validation if needed. Numeric
  real-camera fixture contains no uploaded images, camera IDs or names.

### 2026-11-08 — Claude Code — Stereo rejection reasons (build 0.84)
- Context: Lance's stereo shows "waiting for trackers". Investigated with
  his calibration and performance report: calibration is good (re-solved
  from his captures with the repo solver: 279.6 mm baseline, 0.71 px vs
  his 283.5 mm, 0.69 px); frame ages ~33 ms (limit 180); the joint solver
  with his real calibration accepts simulated views, including model
  errors of 1–3 mm / 10° and a swapped or rotated angled marker. The cause
  must be in real images, so stereo now says why it rejects.
- Changed: `StereoFrames.lastFailure` (no frames / stale / frame gap) and
  an optional `diagnostics` argument to `solveStereoRigPose` (no marker,
  too small, fit error with per-marker errors, per-camera error). Same
  return values as before. `src/tracking.ts` shows reasons in the stereo
  status line (`#stereo-3d-points`), adds them to the Tracking Lab frame
  status and to the performance report (`stereoRejections`, counters
  "Stereo not used: …"). Build label 0.84; CHANGELOG entry.
- Files: `src/input/StereoFrames.ts`, `src/input/stereoRigPose.ts` (+ tests),
  `src/tracking.ts`, `src/main.ts`, `CHANGELOG.md`.
- Checked: tsc, full `npm test`, build (Node 24). Browser: stereo-motion,
  stereo-rig-faces, tracking-motion, driver-depth, ring-handoffs,
  marker-jaws, tracking-lab (mono and stereo) pass; a probe showed the
  expected reasons for consistent, inconsistent and missing camera-2 views.
- Lance to test: see Status.
- Notes for the other agent: the synthetic stereo Lab recording (9/7 FPS)
  never pairs: "camera 1 frame gap 134 ms around the pairing time (limit
  120)". Real stereo replays need recordings above ~10 FPS per camera, or
  StereoFrames' 120 ms interpolation limit would need revisiting for
  replay. Lab check still passes because it does not assert a stereo pose.

### 2026-11-07 (America/New_York) — Codex — Tracking Lab recording and actual pipeline replay
- Changed: dedicated Simulator / Tracking Lab tabs, native-resolution JPEG
  recording to IndexedDB, 30-second auto-stop, a local library and portable
  versioned export/import. Replay runs the existing marker/pose/stereo and
  both Classic and new marker-relative jaw algorithms in isolated contexts;
  it never requests webcams or publishes scene messages. Seek/restart resets
  all workers/state and reconstructs history. Offline worker jobs and search
  clocks use recorded timing for repeatable results. Added current/predicted
  overlays, coverage/loss/reacquisition metrics and stationary-interval jitter.
- Files: `src/trackingLab/`, `tracking-engine.html`, narrow hooks in tracking,
  camera devices/frame clocks/messages, and `src/jaw/markerJawController.ts`;
  existing ArUco 2.0.0 sources bundled under `src/input/arucoLibraries/`.
  Added browser checks and `TRACKING_LAB.md`; updated README/CHANGELOG.
- Checked: Node 24 `npm ci`, tsc, all **504 tests / 117 files**, production
  build; production Lab stereo/striped record/replay, identical reset/preroll
  metrics, frame step/seek, rename/export/import/delete, interrupted recovery,
  cold replay without hardware/CDN access, layout/keyboard isolation;
  existing different-face metric stereo check; existing new white-ball jaw
  calibration check extended to real recorded-image Lab replay (saved
  observations erased). No test thresholds weakened.
- Lance to test: real webcams as in Status. New marker-relative jaws still
  support Camera 1 only; Lab reports Camera 2 ball support as Unavailable.
- Notes for the other agent: preserve `cameraImage` / `videoSnapshot` source
  reads and the `cameraDevices` hooks when extracting code. Replay messages
  are blocked in the shared `publishTrackingMessage`; live dispatch remains
  unchanged. Offline job ordering is deliberate; live workers stay parallel.
  Update Lab snapshots when removing the Classic jaw code. Practical replay
  limits and fresh-history/neutral behavior are documented in TRACKING_LAB.

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
