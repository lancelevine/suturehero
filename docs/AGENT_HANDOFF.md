# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** Claude — autonomous work while Lance is away (to 2026-11-29): CI browser checks, then splitting src/tracking.ts and src/main.ts (Codex: please avoid those two files), then knot friction and worker engine on branches.
- **Knot engines (for Lance's comparison):** register engines in
  `KNOT_ENGINES` (`src/knot/engines.ts`); each must implement `KnotEngine`.
  Compare with `KNOT_TRIALS=1 npx vitest run src/knot/engineTrials.test.ts`
  (`KNOT_ENGINES=a,b` to pick; `KNOT_TRIALS=quick` for a short run).
  Current (full run 2026-11-26, build 0.219): claude 24/24 (default), codex 24/24, classic 23/24,
  classic-worker (experimental).
- **Needs Lance to test by hand:** start with `docs/HARDWARE_TEST_CHECKLIST.md`
  (everything since build 0.205, in testing order). Older items:
  - **Builds 0.154–0.156:** Set jaw orientation (jaws opening sideways)
    per instrument and check the virtual jaw plane matches while rolling;
    run the 6-touch accuracy check and note the average/worst; read the
    bite feedback in mm after a guided pass (keyboard jaws).
  - **Builds 0.145–0.148 (stereo, tips calibrated):** grasp the needle
    with keyboard jaws (Z / comma) using the measured-tip dots; record 3
    table touches and check tips rest on the skin; follow the "Next:" step
    in the status strip from a fresh setup.
  - **Handle-prism jaws (build 0.138):** Remove calibration → Calibrate
    closed → Align prism faces → Calibrate open (alignment must be redone).
    Then wiggle and roll with the jaws still; open/close on each face.
  - **Handle-prism wiggle (build 0.137):** one camera, jaws closed, only
    face 9 + ring visible, wiggle: the % should stay near 0 (or show
    "Holding last reading · prism and ring not in the same Camera 1
    image"). If it holds most of the time, flow is not following the
    prism face; send a profile.
  - **Handle-prism jaws while turning (build 0.136):** one camera, jaws
    held still, roll the instrument through every prism face. The opening
    should stay put (or say "Holding last reading · … does not fit the
    hinge"). Steeply angled faces can still be off by several percent.
  - **Camera-track frames (build 0.135):** with Camera type OV9281, export
    a profile: `frameSource` should be "camera track", and "Camera 1
    capture attempts" / "flow round trip" rates should rise above 30/s.
    Check tracking still feels right; if worse, set Diagnostics →
    Performance → "Camera frames processed" to "At display refresh" and
    send both profiles.
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
  - `FreeKnotTechniques.test.ts` "retains a double surgeon first throw…"
    passes on Node 24 but fails on Node 22 (thread point moves 0.042 vs a
    0.034 limit). The result sits close to its threshold and is sensitive to
    floating-point differences. Use Node 24; a more robust fix is open.
  - Stereo tracking is unreliable in practice; single camera is used.
  - `scripts/check-depth-stability.mjs` is flaky (passes ~30–50% of runs on
    both the original `7f44662` and current code; A/B tested 10 vs 10). It
    samples depth while it is still settling after unlock. Not a regression.
  - The single-camera pose solvers compute focal length as
    `width/(2·tan(70·π/360/2))` = a **35°** horizontal field of view, though
    comments say 70°. Instrument tracking is self-consistent with it; mm
    distances in mono mode are scaled by this guess. Don't change it without
    re-checking depth calibration; new code must use the same model
    (`defaultIntrinsics` in `src/input/bodyGeometry.ts`).
  - `src/tracking.ts` (~98 KB) and `src/main.ts` (~51 KB) are still large
    (split partly on 2026-11-26) and the most likely place for merge conflicts.
- **Next up (proposed, not started):**
  3. Continue splitting `src/tracking.ts`: a shared tracking-state object, then
     merge the camera 1 / camera 2 detect paths (needs real-camera testing after).
  4. Add a code formatter in one dedicated commit (agree with Lance first).
  5. When the OV9281 cameras arrive: the OV9281 camera type (1280×800 @ 120
     fps) is chosen automatically by name (build 0.216); recalibrate and retest
     stereo with them. Needs real-camera testing by Lance.

## Log

### 2026-11-27 — Claude — Self-review fix: depth range reads the live working depth (no build change)

- Review of the tracking.ts split found one behaviour difference: the depth range used the working depth saved by the module's own field events, while tracking.ts used to read `#working-depth-mm` live every frame (Tracking Lab replay restores that field's value directly, without events). `DepthRange.range(binding, workingMm)` now takes the live value from tracking.ts again. The stereo panel and the other moves were re-checked line by line against the old order of operations: no differences.

### 2026-11-26 — Claude — Knot physics about 8% faster (build 0.223)

- `src/suture/InstrumentThreadContact.ts`: `writeSpan` uses plain comparisons instead of multi-argument `Math.min/max`, and segment boxes are joined from their two point boxes (`joinSpans`). The per-point capsule loop hoists `oldB - oldA`, both axis lengths, and uses scratch vectors. Same arithmetic order.
- Profile of a 3-throw Claude knot (1× 60 fps): contact ≈ 17% + spans 8%, StrandContact ≈ 19%, StrandPairContact ≈ 9%. Whole test 23.3 s → 21.6 s. Checksum of all strand points unchanged (257.8095878645, 3 throws). Tried and reverted: sorting found pairs in StrandContact (no gain; the candidate list is usually cached).
- Checks: suture, gameplay, knot and demo unit tests (258 pass).

Entries up to 2026-11-14 are in `docs/archive/AGENT_HANDOFF-to-2026-11-14.md`.

### 2026-11-26 — Claude — Guided course results export (build 0.222)

- `src/ui/courseExport.ts` (`mountCourseExport`, below `#course-review`; shown while a course is running and has a saved stitch). New `src/ui/traineeExport.ts`: the trainee key, `bindTraineeInput` (keeps every trainee field in step through a window event), `exportFileName`, `downloadText`. `SandboxSummaryPanel` now uses them; `TRAINEE_STORAGE_KEY` is re-exported there. Unit tests in `traineeExport.test.ts`.
- New `scripts/check-course-export.mjs`: records a course stitch through the dev hook and checks the CSV row and trainee. Added to CI. check-sandbox and check-layout pass.
- Hardware checklist updated (results export section).

### 2026-11-26 — Claude — Demo check, hardware checklist, Lab scrolling (no build change)

- `check-demo` after the knot changes of 0.209–0.221: passes (three throws, locked and seated, both tails cut, secure stitch kept; 400 s of demo time, about 6.7 min here).
- New `docs/HARDWARE_TEST_CHECKLIST.md`: everything since 0.205 that needs real hardware, in testing order. AGENTS.md asks agents to add their hand-test items there.
- Tracking Lab scrolling (known issue) was already fixed by an earlier CSS change: the Lab scrolls inside itself with camera setup open. New `check-tracking-lab-scroll` (25 recordings, 1440×700 and 390×844) added to CI; the known issue is removed.

### 2026-11-26 — Claude — Background knot engines apply instrument corrections (build 0.221)

- Display-thread cost per frame while tying (Node, 1× 60 fps surgeon's knot): direct Claude engine 5.75 ms; Claude-in-a-worker 0.015 ms (posting and applying snapshots; the browser's transfer of the point arrays is not included). So the worker engines should remove nearly all knot-related stutter on slow machines.
- `WorkerKnotEngine.applyCorrections` (default true): each snapshot's `corrections` are added to the drawn tools. The old comment's concern (late corrections double-counting with absolute poses) doesn't hold: the next absolute pose replaces the corrected one, and the worker's copies are overwritten from the drawn tools each frame.
- Trials: claude-worker 22/24 (left: surgeon's @ 2× 30 fps jitter, 3-throw @ 2× 30 fps jitter), classic-worker 18/24. Knot and demo unit tests pass.

### 2026-11-26 — Claude — Background knot engine replays missed frames (build 0.220)

- `src/knot/worker/`: an update request can carry `backlog` (`BacklogFrame[]`: dt and tool states per missed frame, oldest first, at most `MAX_BACKLOG` 60, then the oldest two are merged). `KnotHost` replays the backlog, then the current frame. `begin` can name the model (`WorkerModel` 'classic' | 'claude'); the host switches to `ClaudeKnotEngine` for 'claude'. New engine `claude-worker`.
- New `slowKnotPort.ts` (`SlowKnotPort`: answers one update every N frames) and regression tests: a surgeon's knot locks with the worker answering every 2nd/3rd frame. On the old code both formed 0 throws.
- Full trials (worker answering one frame late): classic-worker 14/24, claude-worker 17/24 (direct engines 24/24). The remaining gap: the model's tool corrections (driver kept off skin and thread) stay in the worker's copies and are overwritten by the next frame's poses, while the direct engines keep them on the instruments. The trial hands move tools relative to their current pose, so they penalise this; with camera tracking, poses are absolute either way. Also seen: a 3-throw with a 1-frame lag misses the forceps regrasp by 0.003 (0.088 against 0.085 reach).
- Checks: tsc, knot tests (13), vite build (knotWorker bundle includes ClaudeKnotEngine).

### 2026-11-26 — Claude — Thread keeps real time at 30 fps (knots 24/24) (build 0.219)

- Root cause of the last failing trial (surgeon's @ 2× 30 fps with jitter), found by measuring rather than tuning: `MAX_TIME_STEPS` = 2 steps of 1/120 s per update made physics run at half real time at 30 fps, so the thread lagged the hands and a 1.35-turn wrap wound about 1.8 turns on the shaft (26 points close to the shaft at 30 fps, against 12 at 60 fps). The earlier friction/carry attempts treated a symptom. There was no contact creep: the contact resolve added no winding.
- Fix in `src/gameplay/FreeKnotPractice.ts`: `MAX_TIME_STEPS` = 4 (covers a 30 fps frame). `FreeTyingBudget.test.ts` now expects `MAX_TIME_STEPS` steps per slow frame, still bounded; that limit changed on purpose, not to pass a test.
- Full trials: claude 24/24, codex 24/24, classic 23/24 (only the 3-throw @ 1× 60 fps jitter, its old regrasp problem). Computer time per second of tying rose from about 265 to 375 ms under the same parallel load, because the 30 fps cases now step in real time.
- Checks: suture, gameplay, knot and demo unit tests (255 pass).
- Lance to feel-test: knot tying on the laptop at its normal frame rate; check that it doesn't feel slower or laggier.
- Done on branch `friction-model`, merged; the friction model itself turned out to be unnecessary.

### 2026-11-26 — Claude — Splitting tracking.ts and main.ts: summary of this phase

- Sizes: tracking.ts 121 KB → 98 KB, main.ts 70 KB → 51 KB, no behaviour change (identical markup; differential tests for the message functions; browser checks after each step).
- New modules: `ui/trackingPageMarkup`, `input/WorkerDetector`, `ui/detectionPreviews`, `input/depthRangeControls`, `input/stereoCalibrationImport`, `input/stereoCalibrationPanel`, `ui/practicePageMarkup`, `ui/practiceMessages`.
- What remains is mostly the tracking loop (`detectFrame`/`detectSecondFrame`/`updateLiveTargets`/`animate`) and main.ts's per-frame wiring, which share many module-level variables. The next real step is a shared tracking-state object (and merging the near-duplicate camera 1 / camera 2 detect paths). That should be done with Lance able to test real cameras afterwards, not blind.

### 2026-11-26 — Claude — Split main.ts, step 4: exercise readout (no build change)

- `src/ui/practiceMessages.ts` `exerciseReadout`: the #exercise-readout line (Sandbox, eversion, free tying, guided knot, pull, pass, plus the free-tying wound summary and scissors suffix), with named closure thresholds. Differential test against the old three statements: identical on 20,000 random states. Unit tests added.
- Checks: tsc, unit tests, check-sandbox, check-free-tying, check-knot, check-guided-thread, check-practice-setup.

### 2026-11-26 — Claude — Split main.ts, step 3: progress, knot button, grasp status (no build change)

- `src/ui/practiceMessages.ts`: `exerciseProgress` (progress bar label and value), `knotActionLabel`, `graspStatusText`, with named constants for the eversion lift (0.09), pull-check hold (1.5 s) and holding jaw opening (0.2). Differential test against the old expressions: identical on 20,000 random states. Unit tests added.
- Checks: tsc, unit tests, check-guided-thread, check-knot.

### 2026-11-26 — Claude — Split main.ts, step 2: trainee titles (no build change)

- `src/ui/practiceMessages.ts`: `sandboxTitle` and `exerciseTitle` (the #exercise-title text), rewritten from two long conditional expressions into ordered `if … return` steps. Same text: a temporary differential test matched the old expressions on 20,000 random states. Unit tests in `practiceMessages.test.ts`.
- Checks: tsc, unit tests, check-guided-thread, check-knot, check-sandbox.

### 2026-11-26 — Claude — Split main.ts, step 1: page markup; build number constant (no build change)

- `src/ui/practicePageMarkup.ts` (`practicePageMarkup`): the practice page HTML (byte-identical output, checked by evaluating the old template), with a test of the ids main.ts relies on.
- **The build number is now `APP_BUILD` in `src/main.ts`** (passed into the markup). AGENTS.md → Versioning updated. Bump `APP_BUILD` and `build` in `performanceContext` in tracking.ts.
- Checks: tsc, markup tests, and the full CI browser set (12/12) locally.

### 2026-11-26 — Claude — Split tracking.ts, step 4: stereo calibration panel (no build change)

- `src/input/stereoCalibrationPanel.ts` (`mountStereoCalibrationPanel`): the calibrated-stereo panel markup, calibration and workspace state, saving, import/remove, in-app solve event, workspace capture feed. tracking.ts uses `stereoSetup.calibration`, `.workspace`, `.enabled`, `.geometryStatus`, `.triangulationStatus`, `.feedWorkspace`, and calls `stereoSetup.restoreSaved()` at the same start-up point as before.
- Checks pass: tracking-storage, stereo-motion, stereo-rig-faces, tracking-panels, stereo-shortcut, stereo-capture-quality, status-strip.
- `check-calibration-ui` was stale (failed before the change too): the scene now starts at about 163 px (two header rows and the status chips), so the top limit is 190 px instead of 110; the second-camera chooser is no longer inside a `<details>`. It passes.

### 2026-11-26 — Claude — Split tracking.ts, step 3: depth range controls (no build change)

- `src/input/depthRangeControls.ts`: `DepthRange` (Near/Far size-depth anchors, working depth, saved form, status text, `range(binding)`) and `mountDepthRangeControls` (Near/Far/Reset buttons, working-depth field, saving). Same messages and storage key; tests in `depthRangeControls.test.ts`. tracking.ts keeps `depthBinding`, the capture rules and `resetDepthFilters`.
- `check-driver-depth`'s env modes were already broken by an earlier move: `SUTURE_SIZE_DEPTH`/`SUTURE_DEPTH_NOISE` now patch `src/input/trackerDistance.ts` (with `input.now`), the rest latch still in tracking.ts, and accept "depth from tilt-corrected marker size". All three modes pass, as do check-tracking-storage and check-tracking-panels.

### 2026-11-26 — Claude — Split tracking.ts, step 2: decode previews (no build change)

- `src/ui/detectionPreviews.ts` (`mountDetectionPreviews`): threshold and centre-crop previews, moved from tracking.ts (`needsFrames`, `render`).
- New `scripts/check-detection-previews.mjs` (no check covered them), added to the CI list. Note: previews refresh only on full decodes, which can be seconds apart, so the check waits until each canvas leaves its 300×150 default.

### 2026-11-26 — Claude — Split tracking.ts, step 1: markup and WorkerDetector (no build change)

- `src/ui/trackingPageMarkup.ts`: the tracking page HTML (byte-identical output, checked against the old template), with a test of the ids tracking.ts relies on.
- `src/input/WorkerDetector.ts`: the decode/flow worker wrapper and its replay queue, code unchanged; worker URLs now relative to `src/input/`.
- Browser checks that inject fake markers by patching the served source (`check-ring-handoffs`, `check-stereo-rig-faces`) now patch `src/input/WorkerDetector.ts`. Other checks still patch functions in `src/tracking.ts` (`check-stereo-motion`: `stereoPrismRotation`; `check-driver-depth` with env flags: `poseDepthValid`); keep them pointed at wherever those functions live.
- Checks: tsc, vite build (both workers emitted), tracking-motion, ring-handoffs, stereo-rig-faces, tracking-lab, camera-controls, tracking-storage.

### 2026-11-26 — Claude — Browser checks in CI (no build change)

- New `scripts/ci-browser-checks.mjs`: starts its own Vite server on 5173, runs `DEFAULT_CHECKS` one at a time (6 min limit each, one retry, a pass on retry reported as flaky), and exits non-zero on failure. Eleven checks, about 7.5 min in this sandbox: ov9281-detect, tracking-storage, iphone-start, camera-controls, production-mode, hall-sensor, layout, tracking-lab, free-tying, sandbox, practice-setup.
- `.github/workflows/deploy.yml`: a new `browser-checks` job (Chrome at /usr/bin/google-chrome); `deploy` needs both `build` and `browser-checks`. AGENTS.md updated.

### 2026-11-23 — Claude — Jaw sensor guided calibration, live graph, third slot (build 0.218)

- New `src/input/hallCalibrationSweep.ts` (`sweepCalibration`): closed is the median of the first 15 % of the sweep; open is whichever of the 5th/95th percentiles lies farther from closed; rejected below `MIN_CALIBRATION_SPAN` or under 30 readings. Tests included.
- `HallSensorPanel`: the guided sweep (`CALIBRATION_SWEEP_MS` 5 s, prompts in the calibration note), a per-slot canvas graph (5 s), and the manual buttons moved into a `<details>`. Slots: 2 by default, up to `MAX_HALL_SENSOR_SLOTS` 3 via "Add a third sensor"; `parseAllHallSettings` keeps 2–3 saved slots. The duplicate warning reads "Two sensors are set to…".
- `check-hall-sensor` extended (guided sweep finds about 2000/2800, graph drawn, third slot added and saved) and passes. Panel tests pass. Screenshot checked.
- Lance to test: run Calibrate (guided) on each instrument and see whether the jaws then track well. Watch the graph while moving the magnet.

### 2026-11-23 — Claude — Session results export (trainee, knots, timing, CSV) (build 0.217)

- New `src/gameplay/sessionRecord.ts`: `KnotSummary`/`knotSummary`, `SessionClock` (wall clock, restarted by `PracticeSession.reset`), `StitchMeta`, RFC 4180 CSV helpers, `stitchesCsv` and `sessionsCsv`. Tests in `sessionRecord.test.ts`.
- `StitchCourse.CompletedStitch.meta?` is set by `record` and `recordSandbox` (optional parameter). `PracticeSession` passes `clock.stitchDone(knotSummary(freeKnot.sequence, engine id, security))`; the guided, non-free knot has `knot: null`. The PracticeSession sandbox test asserts timing on kept stitches.
- `SandboxSummaryPanel`: trainee input (`suturehero.trainee.v1`), the two CSV buttons, and trainee/duration in saved progress and the JSON export. `SandboxSource` has `stitchRecords()` and `sessionSeconds()` (wired in `main.ts`).
- `check-sandbox` now fills the trainee, saves, and checks all three downloads; passes. check-layout passes; tsc passes.
- Lance to test: tie a stitch in Sandbox, click Finish stitch, then open Export stitches CSV in Excel. Check the knot type, throws and seconds look right.

### 2026-11-23 — Claude — Stereo calibration import moved out of tracking.ts (no build change)

- New `src/input/stereoCalibrationImport.ts`: `acceptStereoCalibration` (two distinct cameras, same order as the captures, bound to the selected cameras; restore accepts as saved) and `stereoCalibrationSummary`. Moved from `loadStereoCalibration` in `src/tracking.ts`, same behaviour and messages. Tests in `stereoCalibrationImport.test.ts`.
- Checks: tsc, the new unit tests (4), and `check-tracking-storage` and `check-stereo-motion` (real import) pass.
- Next candidates for the split: the status-strip health builder and `performanceContext` near the end of `tracking.ts`.

### 2026-11-23 — Claude — OV9281 recognised automatically (build 0.216)

- `src/input/cameraDevices.ts`: `cameraModeForLabel` (/ov9281|b0332/i). `openCamera`, for non-iPhone modes, reopens with the OV9281 request when the opened track's label matches and the mode differs, and dispatches `suturehero:camera-mode-changed`. `CameraSettingsPanel` follows that event. Unit test added; new `scripts/check-ov9281-detect.mjs` passes.
- OV9281 rehearsal (`SUTURE_CAMERA_PRESET=ov9281`) after the 0.205 jaw removal: tracking-motion, ring-handoffs, driver-depth, calibration-preview and camera-controls pass. check-profiler fails on Camera 2 fps (two synthetic 1280×800 cameras in software rendering; the documented sandbox limit).
- Twelve check scripts defaulted to ports 5174–5176; all now default to 5173, as AGENTS.md says.
- Lance to check when the cameras arrive: the camera's name under Camera settings. If it doesn't contain "OV9281", tell an agent the name so it can be added.

### 2026-11-23 — Claude — Microsurgery heading fix; browser checks pass again (build 0.215)

- App fix in `src/main.ts`: the per-frame heading update (Sandbox vs Simple interrupted suture) now keeps the microsurgery heading. Found by `check-practice-setup`.
- `check-tracking-storage`: waits for the camera controls as attached (collapsed since 0.133); the storage-blocked default is `ring8` (since 0.182).
- `check-practice-setup`: opens the collapsed Practice setup section (`openSetup`) before using its controls; reads `#right-tool-name` with textContent (innerText is empty inside a closed `<details>`); accepts "Tails trimmed" as the cut message.
- With 0.214's Lab fix, all three long-failing checks pass. Also run: check-sandbox and check-layout pass.
- Known issues cleared from Status.

### 2026-11-23 — Claude — Tracking Lab list fix and clean-up (build 0.214)

- `src/trackingLab/ui.ts` `library()`: a generation counter, so overlapping refreshes (start-up plus save) no longer both append rows. That duplication was why `check-tracking-lab` failed with two "Replay" buttons (known issue since 0.204 at least).
- Removed the Balls / Classic jaw pairs / confidence summary text and the now-unused `confidenceLabel`. Recorded sessions keep their ball fields (empty), so old recordings still load.
- Checks: tsc; trackingLab unit tests (29); `check-tracking-lab` passes again.

### 2026-11-23 — Claude — Jaw sensor battery level (build 0.213)

- Firmware: standard Battery Service (0x180F/0x2A19), percent from VDDH/5 read directly with SAADC channel 7 (12 bit, gain 1/6, internal reference; 3.3 V = 0 %, 4.2 V = 100 %, linear, approximate), every 30 s. `READ_BATTERY` turns it off. It also prints `battery_volts` to the Serial Plotter. Not compiled or tested here (no board or arduino-cli). It assumes the battery feeds VDDH as on nice!nano v2-style boards.
- App: `BleHallSensorSource` requests `battery_service` as an optional service and watches `battery_level` (ignored if absent); the panel shows the percentage and a low warning at `LOW_BATTERY_PERCENT` 15.
- `check-hall-sensor` asserts 83 % and 12 % (low) from fake boards, and passes. tsc passes.
- Lance to test: upload the new firmware, click Connect for each board once, and compare the percentage with the `battery_volts` line in the Serial Plotter (a full battery reads about 4.1–4.2 V). If the value is nonsense, or the Hall readings misbehave, set `READ_BATTERY = false`.

### 2026-11-23 — Claude — Jaw sensors reconnect, work without camera (build 0.212)

- `BleHallSensorSource`: `startWith(device)` connects without the chooser; `knownHallDevice(id)` uses `navigator.bluetooth.getDevices()` when the browser has it; `device`/`deviceId` getters added.
- `HallSensorPanel`: per-slot `deviceId` in `suturehero.hallJaw.v2`, `wanted` flag and `lastDevice`. On an unexpected disconnect it retries every `RECONNECT_INTERVAL_MS` (4 s) until connected or the user stops it. On load, saved boards reconnect when `getDevices` exists. Settings test extended.
- `main.ts`: jaw-opening messages and their application are no longer gated on `cameraEnabled`. Camera jaw tracking is gone (0.205), so only the sensors send them.
- `check-hall-sensor` extended (camera off, dropout and reconnect, reload reconnect) and passes. tsc and panel/source tests pass.
- Lance to test: reload the page and watch both sensors reconnect. If they don't, Chrome may not support remembered Bluetooth devices on that PC; Connect still works. Switch one board off and on and watch it come back. Turn camera tracking off and check the jaws still move.

### 2026-11-22 — Claude — Fast pull keeps the tail in the loop (build 0.211)

- Follow-up attempt, not shipped: thread–driver contact changes in `InstrumentThreadContact.resolve` `correct()` to stop the coil creeping round a jittering, pulling driver (surgeon's @ 2× 30 fps jitter).
  (a) Friction around the shaft relative to shaft motion: 0.2 and 0.05 stopped the deliberate double first wrap from forming; 0.02 fixed the case but broke 4 normal tests (demo, FreeKnotTechniques surgeon, FreeSlipSeating, the 3-throw regression).
  (b) Carrying contacting points with the shaft's sideways motion: 1.0 stopped any throw forming; 0.3 fixed the case but broke 5 tests (resting tail, surgeon technique, sliding seating, Claude grasp tests); 0.1 did not fix it.
  Conclusion: any contact change strong enough to stop the creep alters normal tying. Left as a known limit (needs 2× hand speed, 30 fps and jitter together).
- `src/suture/FreeThrow.ts` `resolve`: while 'passed' (pending), the post-in-bight containment correction is exempt from the engagement ramp and the 0.15 pending step budget. It now uses `PENDING_CONTAINMENT_BUDGET` 0.6 rest lengths, `PENDING_POST_CORRECTION` 0.9 and `PENDING_POST_STEP_LIMIT` 0.02. The retained values are unchanged as named constants (0.4, 0.004). Before, the fast pull carried the tail out of the third loop within the 0.4 s ramp and the throw reset.
- New test in `ClaudeKnotEngine.test.ts`: the 3-throw knot at 2× 120 fps keeps 3 throws and locks.
- Full trials: claude 23/24, codex 23/24, classic 21/24. The only remaining failure for claude/codex is surgeon's @ 2× 30 fps with jitter: the simulated thread creeps round the moving driver and forms a real second coil (trimmed coil about 1.95 turns from a 1.35-turn wrap). That needs thread–driver tangential friction work.
- Checks: suture, gameplay, knot and demo unit tests (250 pass).

### 2026-11-22 — Claude — Fast throws at 30 fps recognised correctly (build 0.210)

- `src/suture/TailPassage.ts`: runs of shaft-side material are now collected first, then split by `splitAtExcursions`. Points beyond max(0.25, 3× the run's 25th-percentile radius) that have tight-coil points on both sides are dropped and the run is split there. At 2× 30 fps the coil (0.84 turns) used to merge with the forceps arm passing the shaft and read 1.98 turns. Exit/entry arms and loose loops are unchanged. Test in `TailPassage.test.ts`.
- `src/suture/FreeThrow.ts`: a second taut-seat tier. After `TAUT_SEAT_LONG_HOLD_S` (1 s) fully fed and taut, crossing ends up to `TAUT_SEAT_LONG_ENDS` (0.10) are accepted; at 30 fps the loop held about 0.09 open under the reach-limited tools.
- New test: `ClaudeKnotEngine.test.ts` locks a surgeon's knot at 2× and 30 fps. The classic engine still fails this case (its regrasp problem), so it is not asserted there.
- Checks: suture, gameplay, knot and demo unit tests (249 pass); full trials unchanged: claude 22, codex 22, classic 20.
- Still failing: surgeon's @ 2× 30 fps with jitter (the coil itself measures about 1.8 turns before passage) and 3-throw @ 2× 120 fps (crossing lost during the fast pull).

### 2026-11-22 — Claude — Fast-pulled throws count as tightened (build 0.209)

- Investigated after shipping (no code change): 3-throw @ 2× 120 fps loses the third throw in `FreeThrow` 'passed'. The tail is pulled fast, its crossing coordinate moves about 18 segments/s, `MaterialOpening.crossingCoordinate` stops finding it inside the projected loop polygon, `containsPost` fails within the 0.1 s grace, and on 'clear' it resets ("Loop slipped off the short strand"). A real fix would physically hold the post inside the loop during 'passed' (core physics), not just a longer grace. Paused to ask Lance.
- Surgeon's @ 2× 30 fps with jitter (investigated, no code change): the second throw (forceps 1.35 turns) is counted as 2 wraps. `TailPassage`'s measured winding around the driver rises from about 1.0 to 2.1 turns while the driver pulls the tail (also without jitter: a 1.05→1.98 jump in one 30 fps frame at passage). As a 2-wrap throw it then never seats. A 0.15 s confirmation delay on wrap increases did not help: the over-count persists for over 1 s. Likely cause: the winding is measured in the moving driver's frame while the thread lags it at low frame rates. A fix would measure the wraps when the tail passage starts, or relative to the thread's own motion. Not attempted.
- Cause of square @ 2× 60 fps: the loop was fully fed (6/6 segments) and small (radius 0.065 < 0.08), but with both tools at their reach limit the crossing ends stayed 0.051 apart, over `assessSeating`'s 0.04. It seated only when the next throw's motion relaxed the arms, about 10 s later, after the trial's 8 s wait.
- Fix in `src/suture/FreeThrow.ts`: `tautHoldTime` counts time with the loop fully fed and the arms taut (`separation >= heldMaterial*.97`). After `TAUT_SEAT_HOLD_S` (0.5 s), ends up to `TAUT_SEAT_ENDS` (0.06) are accepted. The slack-free rule (0.04) is unchanged.
- Full trials after: claude 22/24, codex 22/24, classic 20/24. Remaining for claude/codex: surgeon's @ 2× 30 fps jitter (second throw missing) and 3-throw @ 2× 120 fps (third missing).
- Checks: suture, gameplay and knot unit tests (240 pass).

### 2026-11-22 — Claude — Claude knot engine is the default (build 0.208)

- `DEFAULT_KNOT_ENGINE` is now `'claude'` (`src/knot/engines.ts`, test updated).
- Full `KNOT_TRIALS=1` comparison run today: claude 21/24 (278 ms/s), codex 21/24 (280), classic 19/24 (284). Claude and Codex fail the same 3 cases, all at 2× hand speed: surgeon's @ 30 fps with jitter (second throw missing), square @ 60 fps (second throw missing), 3-throw @ 120 fps (third throw missing). Classic also misses the third throw in two more 3-throw cases.
- Checks: tsc; knot, gameplay and demo unit tests (100 pass).
- Next: investigate the 2× fast-hand failures (shared physics, not classification).

### 2026-11-22 — Claude — Production tab restored (build 0.207)

- Regression from 0.201's lazy-loaded Tracking Lab: `mountProductionMode` ran before `.workspace-lab-tabs` existed, so its tab was never added. `src/ui/productionMode.ts` now waits for the bar with a MutationObserver and looks it up when opening.
- Checks: tsc; `check-production-mode` and `check-iphone-start` pass.
- Follow-up idea: other code that expects Lab DOM at start-up may have the same problem; none found so far.

### 2026-11-22 — Claude — Second Bluetooth jaw sensor (forceps) (build 0.206)

- `src/ui/HallSensorPanel.ts` now has two slots (`HALL_SENSOR_SLOTS`), each with its own `BleHallSensorSource` and `HallJawMapper`. Settings key `suturehero.hallJaw.v2` `{sensors:[…]}`; v1 (one sensor) migrates into slot 1 (`parseAllHallSettings`). `duplicateInstruments` drives the warning. Tests updated.
- `scripts/check-hall-sensor.mjs` rewritten for two fake boards: migration, both slots streaming to their own instruments, inverted calibration, duplicate warning, independent disconnect, persistence across reload. It passes. tsc and HallSensorPanel tests pass.
- Firmware now matches Lance's Pro Micro-style board (0.02/1.15, LED 0.15) and has `DEVICE_NAME`.
- Lance to test: flash the second board with `DEVICE_NAME` "SutureHero Jaw 2", connect both and calibrate the forceps.

### 2026-11-22 — Claude — Remove camera jaw tracking (Hall sensor only) (build 0.205)

- At Lance's request, removed all camera jaw tracking. The Hall sensor is the only jaw input.
- Deleted: `src/jaw/` (except `jawGeometry`, moved to `src/input/bodyGeometry.ts` for the ring-axis overlay), `src/input/{BallMotionTracker,JawCalibration,JawViewFusion,ballPairTracking,colorBallSearch,jawCameraMode,jawTrackingStorage,stripedBallSearch,sphereSilhouette,stripedReacquireWorker}`, and `src/trackingLab/markerJawDiagnostics`.
- Deleted checks: ball-pairs, striped-jaws, striped-lifecycle, marker-jaws, handle-jaws, handle-jaws-stereo, tracking-lab-marker-jaws.
- In `tracking.ts`: removed the ball state/UI/scan/overlay block, the markerJaws wiring, handle-prism IDs in decode search and `markerImageAt`. `sendJawOpening` is kept for the Hall sensor. The jaw markup is now `#jaw-sensor-controls`, which TrackingLayout passes to the calibration panel's Jaws tab.
- Storage helpers for the jaw keys were removed. Old saved values are left orphaned and unused.
- Kept: `ballTrackingSlots` (only its `BallInstrumentName` type is used) and `jawRoll` (virtual jaw orientation, not tracking). The `jawInverted` profile field is kept for saved-data compatibility but has no UI.
- The Tracking Lab snapshot keeps its ball fields, empty.
- Checks: tsc; full unit suite 690/690 (Node 24); production build; browser checks hall-sensor, iphone-start, camera-controls and layout pass. tracking-lab fails as on 0.204 (see Known issues).
- Lance to test: camera tracking still follows the instruments as before, and the Jaws tab shows the jaw sensor panel and works.

### 2026-11-21 — Claude — Bluetooth Hall-sensor jaw input (build 0.204)

- Web Bluetooth source `src/input/BleHallSensorSource.ts`, with a packet parser test. It implements Codex's `HallSensorSource`.
- Panel `src/ui/HallSensorPanel.ts`, with a settings test. It is mounted inside the jaw tracking `<details>` (Instrument calibration → Jaws); mounting beside it was lost when the pane re-rendered. Settings are saved in `suturehero.hallJaw.v1`.
- It uses `HallJawMapper` (rebuilt on each connect because board time restarts) and sends through the new `sendJawOpening` in tracking.ts, the same message as camera jaws (`cameras: []`).
- Firmware: `firmware/hall-jaw/hall-jaw.ino` (mbed package + ArduinoBLE; the non-mbed Bluefruit package would not link on Lance's PC). The sensor is powered from D1 only while reading.
- New check `scripts/check-hall-sensor.mjs` (fake Bluetooth device): passes. Also tsc and unit tests.
- Lance to test: Chrome on Windows → Jaws tab → Connect sensor → Set closed / Set open → the jaws in the scene should follow. Note the closed/open values.

### 2026-11-20 — Claude — iPhone mode defaults to the 8-face ring (build 0.203)

- iPhone mode stores its tracker choice under the new key `suturehero.iphoneTrackerType.v1`; unset means `ring8`. Other camera types keep `suturehero.trackerType`. The helper is `trackerTypeStorageKey(mode)` in `src/input/trackingStorage.ts`, used by `src/tracking.ts` and `InstrumentCalibrationPanel` (tips are per tracker type).
- `CameraSettingsPanel` dispatches `suturehero:camera-mode-changed`; tracking.ts then loads that mode's saved tracker.
- `check-iphone-start` now expects `ring8` despite the synthetic camera's saved `prism`. That was the bug scenario, not a weaker limit.
- Checks: tsc; trackingStorage and ui tests; `check-iphone-start` passes.
- Lance to test: on the iPhone, the Marker tracker should read "8-face ring" after loading.

### 2026-11-17 — Claude — Fix Codex lock seating; full search back to 1 s (build 0.202)

- Review of Codex's 0.200/0.201 found `CodexKnotEngine.lockSeated` relied on `CodexEventLedger.isLockThrow`, which exists only for technique "auto". With a chosen technique, `lockSeated` was always false. It now falls back to the classic check (`src/knot/codex/CodexKnotEngine.ts`; new test in `CodexKnotEngine.test.ts`).
- `DISCOVERY_INTERVAL_MS` back to 1000 ms at Lance's request (`src/input/PredictiveDecodeSearch.ts`; test timings restored).
- Other review notes, not changed: the Tracking Lab lazy import has no error handling (the tab silently never appears if the chunk fails), and `check-tracking-lab-layout` may need to wait for the tab. Neither was run.
- Checks: tsc; Codex engine and PredictiveDecodeSearch tests.

### 2026-11-16 — Codex — Tracking performance and fallback batch (build 0.201)

- Periodic tiled ArUco discovery is now one full-frame equivalent per 1.6 s
  instead of 1.0 s; shared search accounting and automatic profiler findings
  identify full-scan pressure, decode age, stale results, and stereo rejection.
- Stereo fallback freezes the exact handoff frame, then follows new mono
  lateral motion without transferring accumulated camera bias. Depth and
  plausible rotation retain the last metric anchor. Added nine transition tests.
- Added the transport-neutral Hall jaw mapper/input and deterministic synthetic
  source. Tracking Lab UI now loads as a separate chunk; initial main JS fell
  from 91.7 to 81.5 kB gzip. No real Hall device transport is implemented yet.
- Checks: 37 focused tests, TypeScript/production build, and Tracking Lab
  browser layout/navigation check. Stereo and Hall behavior need real hardware.

### 2026-11-16 — Codex — Codex knot engine and natural demo (build 0.200)

- Registered `codex`: Claude's reliable needle-driver tail grasp plus a stricter
  physical-event ledger. A same-direction pair needs taut-post evidence to be
  called sliding; a verified opposing throw locks even with an extra detected
  turn. It is selectable independently from Classic and Claude.
- Reworked demo choreography with deterministic minimum-jerk easing, curved
  reaches, varied wrap cadence, and asymmetric releases.
- The first adaptive-solver attempt was rejected after it missed a third throw
  under 2× jitter. With shared optimized physics restored, Codex passed the
  8/8 quick comparison (317 ms CPU per simulated second); type-check and focused
  engine/choreography tests passed. Real interactive knot feel still needs Lance.

### 2026-11-15 — Claude — Claude engine: forceps use classic grasp (build 0.199)

- Lance reported that with the `claude` engine the demo forceps did not regrasp after the first throw. Not reproduced: the demo regrasped in Node at 60, 120 and 144 Hz and in the sandbox browser. Likely cause: the forceps grip was moved to the long strand's far end (index count-1, beside the needle), which the classic grasp never picks.
- Fix: in `src/knot/claude/ClaudeKnotEngine.ts`, only the needle driver gets the free-end redirect.
- Checks: `ClaudeKnotEngine.test.ts`, `freeKnotDemo.test.ts`, tsc.
- Lance to test: run the demo with the Claude knot engine and check that all three throws happen.

### 2026-11-15 — Claude — Knot physics about 30% faster again (build 0.198)

- Behaviour-identical (final thread checksum unchanged on the surgeon's
  double + opposing fixture: 18 s → 12.8 s; 36.2 s before 0.193):
  `StrandContact.ts` box-gap early exit before the exact segment test;
  `InstrumentThreadContact.ts` skin-support footprint early exit, per-call
  point/segment swept boxes kept current by `correct` (writeSpan/spanHits);
  `StrandPairContact.ts` flat-array boxes instead of Box3 per segment.
- Demo tie frame cost (Node): median 6.0 ms, p95 14.2 ms, 2.2% > 16 ms.
- Remaining profile: instrument contact ~18%, self-contact ~10%, strand pair
  ~8%, core solver (bends/distances) ~10%: no single large target left.
- Checked: tsc; gameplay/demo/knot/setup/suture/tissue tests (308).

### 2026-11-15 — Claude — Claude's knot engine (robust free-end regrasp) (build 0.197)

- New `src/knot/claude/ClaudeKnotEngine.ts` (+ test that fails on classic):
  overrides FreeKnotPractice.grasp (made protected; no behaviour change) to
  take the instrument's own free end when within reach. Registered as
  `claude` in engines.ts.
- Engine comparison (`KNOT_TRIALS=1 npx vitest run src/knot/engineTrials.test.ts`,
  4 knots × 6 conditions; harness waits ≤ 8 s for each throw to record):
  classic 19/24, claude 21/24, both ~470–480 ms CPU per second of tying (Node).
  Remaining failures (both): square @ 2× 60fps (throw sits at 'reach limit'
  ~13 s before tightening after a fast full pull), 3-throw @ 2× 120fps (loop
  slips off the short strand on a fast tail pull), surgeon's @ 2× 30fps
  jitter. Classic additionally misses two 3-throw cases (wrong-strand regrasp).
- Checked: tsc; gameplay/demo/knot/setup/suture tests (244).

### 2026-11-15 — Claude — Experimental knot engine in a background thread (build 0.196)

- New `src/knot/worker/`: `protocol.ts`, `KnotHost.ts` (classic model on its own
  instruments; long requests run in 1/60 s slices with instruments
  interpolated), `knotWorker.ts`, `knotWorkerPort.ts` (worker named with the
  page query so PRACTICE_SETUP matches), `WorkerKnotEngine.ts` (stand-in; up to
  MAX_IN_FLIGHT 3 requests, then merges dt; tool corrections not fed back).
- `engines.ts`: KnotEngine is now an explicit interface; `classic-worker`
  registered. `knotTissue.ts`: tissue as data; PracticeSession calls
  `configureTissue` before begin/update. PracticeSetup reads a worker's name.
- `knotTrials.ts`: waits (≤ 4 s) for each throw to be recorded (timing-fair).
  Demo `gripEnd` waits GRIP_CONFIRM_FRAMES before retrying.
- Results: Node stand-in ties/locks (2× speed) and keeps the demo stitch when
  the worker keeps up. With requests merging (worker behind) the demo knot
  does not seat. In this sandbox (software rendering ~200 ms/frame) the
  worker starves: check-knot-worker keeps no stitch; classic does. Frame time
  here is rendering-bound, so the worker's benefit can't be measured here.
- Checked: tsc; gameplay/demo/knot/setup tests (96); production build
  (knotWorker chunk); check-knot-worker (SUTURE_SKIP_STITCH_CHECK=1 here).
- Lance: try Knot engine → background thread on your PC; compare smoothness.

### 2026-11-15 — Claude — Knot physics about twice as fast overall (build 0.195)

- `StrandContact.ts`: candidate pairs found with CANDIDATE_MARGIN (0.02) and
  reused until any point moves half of it (FreeKnotPractice runs up to 16
  contact sweeps per step while a throw is held). Checksum still identical.
- `ThreadStrand.ts`: solverIterations / selfContactEvery / toolContactEvery
  (defaults = classic, identical result). A cheaper-solver 'Claude' engine
  (12/4/2 etc.) saved ~30% time but failed second throws: not kept.
- Shared `test-support/knotTrials.ts` (tieKnot for any engine);
  FreeKnotSpeed uses it.
- Measured: surgeon's knot fixture 36.2 s (0.192) → 17.7 s; demo frame cost
  median 6.6 ms, p95 18 ms, 8% of frames > 16 ms (pull-apart). Next: worker.
- Checked: tsc; gameplay/suture/demo/knot/tissue tests 303 pass.

### 2026-11-15 — Claude — Knot topology shadow project: concluded, code removed (no build change)

- Checked the physics for pass-through: over a full throw (2,043 steps) no
  thread segment passed through another (closest long/short gap 0.0172 vs
  contact distance 0.019). The physics keeps the thread's topology.
- Why the fixture knots read as the unknot: a suture knot with the ends free
  is topologically just the two strands twisted around each other. Crossings
  between the strands seen from above: single throw "+ +" (one full twist);
  square and granny cancel pairwise to nothing. Square vs granny and
  "holds or not" are mechanical (friction, tension), not topological.
- So topology-based recognition cannot work for sutures, whatever the
  physics. Removed `src/knot/` crossingDiagram, gaussCode, jones, threadKnot
  (restore from commit c72476c if ever useful; Jones/crossing code was tested
  on ideal knots).

### 2026-11-15 — Claude — Knot engine switch (build 0.194)

- New `src/knot/engines.ts` (+ test): `KnotEngine` (the FreeKnotPractice
  members the app reads), `KNOT_ENGINES` registry, `createKnotEngine`.
  PracticeSession.freeKnot is a KnotEngine; PracticeSetup.knotEngine from
  ?knot=; selector #knot-engine in Practice setup; FreeKnotView and demo take
  KnotEngine.
- **Codex:** register your engine in `KNOT_ENGINES` (id, label, create).
  It must provide every member listed in `KnotEngine`.
- Checked: tsc; knot/PracticeSession/setup tests; check-layout,
  check-free-tying, check-sandbox.

### 2026-11-15 — Claude — Faster knot physics, same result (build 0.193)

- Behaviour-identical knot physics speed-up (part 1 of Lance's 'fix the lag'):
  `InstrumentThreadContact.ts` box tests without allocating (spanOverlapsBox)
  and whole-thread culling per instrument part; `StrandContact.ts` numeric grid
  keys and a marker table instead of Set + sort. (Reusing the grid map between
  steps was slower; not kept.)
- Measured on a surgeon's double + opposing throw: 36.2 s → 19.6 s; final
  thread checksum identical; gameplay/suture/demo/knot/tissue tests 315 pass.
- Profile now: self-contact candidates ~19%, instrument contact ~30% (runs on
  all 24 solver iterations per step), skin support ~9%.

### 2026-11-15 — Codex — Bind workspace alignment to complete stereo geometry (build 0.192)

- Replaced the camera-ID/baseline workspace key with a stable identity covering
  both cameras' intrinsics, distortion, image sizes, stereo rotation and
  translation, and device IDs. A changed stereo calibration can no longer
  silently reuse stale workspace or table alignment.
- Repaired literal `\\n` text in `src/style.css`; the production CSS syntax
  warning is gone and the branding/Sandbox selectors parse normally.
- The stronger identity invalidates the old workspace/table alignment once;
  Lance must repeat those alignment steps after build 0.192 loads.
- Checked 9 focused tests (calibration identity, workspace, table height) and
  `npm run build`; all passed.

### 2026-11-15 — Claude — Knot topology shadow project, step 4: thread closure, open question (no build change)

- New `src/knot/threadKnot.ts` (+ test): closes the suture (short tail →
  entry → under the skin → exit → long strand → arc far above → tail) and
  names its knot from the Jones polynomial (unknot, trefoil, 5₂, square,
  granny, surgeon's combinations). Only the untied case is tested.
- Finding: on free-tying fixture knots (single, square, granny, surgeon's +
  opposing + third) every result is the unknot, also from three raw views
  without simplification. A synthetic overhand tied in the long strand also
  read as the unknot, so the cause is unresolved: the closure may run back
  through the knot (that test's ends leave near the knot's middle), or the
  long and short strands pass through each other in the physics
  (`StrandPairContact.ts` says "not a knot solver").
- Next step: settle that — validate the closure on a synthetic knot whose
  ends leave outward, and separately watch the long/short strand gap during
  a throw for pass-through events.

### 2026-11-15 — Claude — Knot topology shadow project, step 3: Jones polynomial (no build change)

- New `src/knot/jones.ts` (+ test): Jones polynomial from a Gauss code by the
  Kauffman bracket state sum (≤ 18 crossings). Chosen over the signature
  (planned) because it needs no 2D face structure and still separates square
  (trefoil # mirror) from granny (trefoil # trefoil). Matches the known
  polynomials of the unknot, both trefoils and the figure-eight. Not used by
  the app.

### 2026-11-15 — Claude — Knot topology shadow project, step 2: Gauss code simplification (no build change)

- New `src/knot/gaussCode.ts` (+ test): Gauss code from a crossing diagram;
  `simplify` removes twists (R1) and single overlaps (R2) until none remain.
  Tested: trefoil keeps 3; twists and overlap pairs removed, also inside a
  trefoil; a 3D curled loop goes to 0. Not used by the app.

### 2026-11-15 — Claude — Knot topology shadow project, step 1: crossing diagram (no build change)

- New `src/knot/crossingDiagram.ts` (+ test): crossings of a closed 3D
  polyline seen along a view direction, with over/under and sign. Tested on
  ideal curves: loop 0 crossings, trefoil 3 (writhe ±3, mirrored), figure-eight
  4 (writhe 0), alternating over/under. Not used by the app.
- Plan: 2 simplify (remove crossings undone by a tug), 3 invariants (Seifert
  matrix, signature: square 0 vs granny ±4), 4 run on fixture knots vs current
  recognition, 5 shadow logging in the app (session export).

### 2026-11-15 — Claude — Shape-based knot recognition: experiment, not adopted (no build change)

- Idea: recognise throws from the thread's final shape instead of the event
  sequence (wrap → tail passage → seating), to be robust to speed/frame rate.
- Tried the Gauss linking number between the long and short strands (free
  ends extended) on real free-tying fixture knots:
  surgeon+opposing −0.99 → −0.03; square −1.01 → −0.06; granny −1.01 → 0.00;
  third throw −0.03 → −0.02. It does not separate single vs double wraps,
  square vs granny, or two vs three throws once tightened. Code removed.
- A shape recogniser would need real knot topology (crossing diagram of the
  thread closed through the tissue, then e.g. the signature to tell square
  from granny). Several sessions of research; not started.
- Current approach kept (event-based recognition, hardened for speed in 0.191).

### 2026-11-15 — Claude — Free knots form with fast hands and low frame rates (build 0.191)

- `FreeKnotPractice.ts`: motion sub-stepping (MAX_PIN_MOVE_PER_STEP 0.008,
  MAX_STEPS_PER_UPDATE 8) from each gripping jaw's own movement, only while
  |winding| ≥ WRAPPING_WINDING 0.15; MAX_TIME_STEPS stays 2 (budget test).
  Broader versions (all motion; 4 time steps) broke existing tests and were
  dropped.
- Measurements (fixture motion ÷ speed): before, a wrap formed with the held
  point moving 0.0105/step and failed at 0.0164; 30 fps failed at 1×.
- New `FreeKnotSpeed.test.ts` (lock at 30 fps 1×, 60/120 fps 2×; double
  first throw at 2.5×/4×). Not asserted: second throw at ≥ 2.5×, and at
  30 fps 1.6× (direction read as same as the first).
- Demo SECONDS_PER_WRAP 2.5. Checked: tsc; gameplay/suture/demo tests
  (238); check-demo passes.
- Lance: try free tying by hand/camera, especially the first double throw.

### 2026-11-15 — Claude — Demo: right-to-left pass with forceps eversion, natural speed (build 0.190)

- `physicsDemo.ts`: mirrored needle pose (enters right), DRIVE_AXIS −Z,
  forceps eversion segments (EVERT_Z 0.35, EVERT_LIFT 0.12), shorter
  durations, DRIVE_RATE 1 rad/s, scissors close 0.9 s.
- `freeKnotDemo.ts`: SECONDS_PER_WRAP 3.2 (2.5 failed to lock), shorter
  moves, continuous spread, lowerAndPull with TIGHTEN_PULL_SHARE hold (4.5 s
  for the last throw), `gripEnd` retry after each reach-and-close.
- Test: right-to-left, eversion held, < 110 s; passes (≈ 85 s at 60 fps).
- Checked: tsc; demo tests; check-demo passes (secure knot, tails cut).

### 2026-11-15 — Claude — Demo ends on a measured stitch summary (build 0.189)

- `physicsDemo.ts`: `stitchSummary` closing caption; `choreography.ts`:
  caption may be a function read after start (test added).
- Free-tying demo done (builds 0.186–0.189): pickup, free pass with
  regrasp, three-throw instrument tie by thread physics, release, cut both
  tails, keep stitch. Runs ~3 min on a normal computer (12 min here).
- Checked: tsc; demo tests; check-demo passes (summary shown).
- Lance: run ▶ Demo on the presentation machine; check timing and camera.

### 2026-11-15 — Claude — Demo: natural needle pickup, drive and regrasp; seated knots hold (build 0.188)

- `physicsDemo.ts`: pickup pose from the bite grip relation, drive →
  release → regrasp near tip → drive; PASS_CENTRE 0.18, GRIP_FRACTION 0.1,
  TIP_OUT 0.04; FORCEPS_REST moved; trim segments now release/lift always
  (cutting only with page scissors).
- `PracticeSession.ts`: `freeLockClosure` (closure kept after a seated lock,
  canFinishSandboxStitch latched), `freeSeatedThrows` for the knot grade.
  New PracticeSession test. Release-check semantics unchanged.
- Demo test asserts real grip (jaw within 0.03 of needle), jaws/shaft above
  skin, dermis bite, secure knot, kept after release.
- Checked: tsc; demo + gameplay tests (84); check-demo passes.

### 2026-11-15 — Claude — Demo: third throw and cutting the tails (build 0.187)

- `freeKnotDemo.ts`: third throw; `physicsDemo.ts`: `DemoScissors` + trim
  segments (position scissors, hold Comma); `main.ts` supplies the scissors
  controls. Unit test now expects 'Knot: secure'.
- `check-demo`: also asserts both tails cut and '1 tied (1 secure)';
  timeout 25 min (12 min in this software-rendered sandbox);
  SUTURE_DEMO_TRACE=1 logs captions.
- Checked: tsc; demo unit tests; check-demo passes.

### 2026-11-15 — Claude — Demo by free physics: free pass and real instrument tie (build 0.186)

- New `src/demo/choreography.ts` (timed segments, tested),
  `src/demo/freeKnotDemo.ts` (tie motions from the free-tying unit test
  fixture), `src/demo/physicsDemo.ts` (pass + tie + keep). Test
  `freeKnotDemo.test.ts`: PracticeSession at 1/60 s → surgeon, locked, seated
  (closure ~0.97), stitch kept. Removed the scripted demo (demoRunner,
  interruptedSutureDemo). `demoControl.ts` rewritten; `main.ts` steps the
  demo in 1/60 s slices before session.update.
- Checked: tsc; demo tests; check-demo passes (7¾ min in this software-
  rendered sandbox).

### 2026-11-15 — Claude — iPhone: outlines sit on the markers (build 0.185)

- `src/input/videoSnapshot.ts`: `frameMatchesVideo` (new test); VideoFrame or
  track frames whose size/rotation differ from videoWidth×videoHeight are
  closed and the canvas copy (drawn upright) is used instead.
- Evidence: recording showed outlines ~1/3 size, offset toward the top
  right, every frame; profile snapshot backend VideoFrame, 1080×1920.
- Checked: tsc; videoSnapshot test; check-tracking-motion,
  check-ring-handoffs, check-iphone-start, check-profiler.
- Lance: on the iPhone, Diagnostics should now say snapshot 'canvas
  fallback' if this triggered; outlines should sit on the markers.

### 2026-11-15 — Claude — Move-closer hint uses marker size in pixels (build 0.184)

- `trackerDistance.ts`: exported `markerSidePx`; `trackingHealth.ts`:
  SMALL_MARKER_PX 24 replaces FAR_CAMERA_MM; `tracking.ts` stores the chosen
  marker side per instrument.
- Checked: tsc; trackingHealth + trackerDistance tests; check-status-strip,
  check-tracking-motion.
- Open: Lance reports outlines jumping while still on the iPhone in
  landscape (0.182); needs a landscape profile/recording to diagnose.

### 2026-11-15 — Claude — iPhone: outlines follow markers more closely (build 0.183)

- `captureScheduling.ts`: frame-driven auto only for ov9281 again (test
  updated). 0.182 profile: capture attempts 16.4/s vs 31.6/s in 0.179;
  flow round trip ~20 ms + bitmap wait ~12 ms; applied image age ~70 ms.
  Still 1080×1920 portrait at 30 fps; driver ~34 cm, 'too tilted or small'.
- Checked: tsc; captureScheduling tests.
- Lance: hold the iPhone sideways; send a profile from this build.

### 2026-11-15 — Claude — iPhone opens Production with back camera; 8-face ring default (build 0.182)

- `src/ui/iphoneStart.ts` (new): opens Production, overlay button clicks
  #start-camera; CSS in production.css; `main.ts` mounts it when
  cameraMode() is iphone. `parseTrackerType` default ring8 (test updated);
  `scripts/synthetic-camera.mjs` pins prism for its 2D prism scenes.
- `scripts/check-iphone-start.mjs` (new, iPhone emulation) passes; tsc;
  input/ui tests; check-tracking-motion, check-status-strip,
  check-production-mode, check-ring-handoffs, check-layout pass.
  check-ball-pairs fails on a colour (rgb 225,53,63 vs 225,50,60) with and
  without this change (older).
- Lance: open on the iPhone, tap Start back camera, allow the camera.

### 2026-11-15 — Claude — Hint when markers are too far from the camera (build 0.181)

- `trackingHealth.ts`: FAR_CAMERA_MM 400, `distanceMm` on InstrumentHealth,
  holding reason (single camera only); `tracking.ts` passes rawZ.
- iPhone profile (build 0.179, Chrome on iOS): 1080×1920 portrait, 30 fps,
  needle driver 36 cm, forceps 55 cm ("too tilted or small"); decode runs at
  native pixels (only flow is ≤960 px), so resolution was not cut.
- Checked: tsc; trackingHealth tests; check-status-strip.
- Lance: with 0.180+ hold the iPhone sideways, 25–35 cm away; new profile.

### 2026-11-15 — Claude — iPhone camera mode (build 0.180)

- `src/input/iphoneCamera.ts` (new, tested); `cameraDevices.ts`: `iphone`
  mode, iPhone default, rear facingMode, reopen with Back Camera;
  `captureScheduling.ts` frame-driven auto for iphone; panel note;
  `tracking.ts` resolution line shows lens + portrait warning.
- Checked: tsc; input tests; check-camera-controls; production build.
  check-tracking-storage times out waiting for camera settings controls
  with and without this change (older issue, not investigated).
- Lance: on the iPhone, start the camera; check the resolution line says
  Back Camera and ~1920×1080 · 60 fps; recalibrate the camera; send a
  profile if detection is still poor.

### 2026-11-15 — Claude — Natural-looking knot wraps (build 0.179)

- `LoopTightening.ts`: WRAP_RADIUS 0.095 (was 0.14), WRAP_PITCH 0.05 (was
  0.12). `GuidedKnot.ts`: forcepsWrapOffset / wrapSweepAngle (eased
  ellipse); `knotGeometry.ts` lays the coil behind the forceps.
- Tests: LoopTightening expectations follow WRAP_RADIUS; new wrap-path
  test. Checked: tsc; suture/gameplay/scene tests (244); check-knot,
  check-demo pass.
- Lance: watch the Demo's wraps; say if the loop should be smaller/faster.

### 2026-11-15 — Claude — Demo button: automatic simple interrupted suture (build 0.178)

- `src/demo/demoRunner.ts` (new, tested), `src/demo/interruptedSutureDemo.ts`
  (script, mirrors check-knot), `src/ui/demoControl.ts` (button, captions,
  ?demo=1 auto-start), CSS; mounted in `main.ts`.
- `scripts/check-demo.mjs` (new): full demo to trimmed tails.
- Checked: tsc; demo tests; check-demo, check-layout, check-sandbox pass.
- Lance: try ▶ Demo on the presentation machine (and in Production mode).

### 2026-11-15 — Claude — Sandbox batch finished (builds 0.170–0.177)

- Done: live skin shape and wound gap, skin tears + undo, jitter smoothing,
  entry angle, tissue tear limits, thread grasp, needle loading, tear limits
  in mm, thread drag and cut-through, knot security, edge approximation,
  session summary/spacing/targets/progress/export, replay, forceps
  eversion, `check-sandbox`.
- Not done: legacy ball removal (see Known issues); stereo tracking needs
  OV9281 profiles from Lance.
- Checked: full unit suite 737/737 (Node 24); browser checks check-sandbox
  (3/3), check-layout, check-free-tying, check-guided-thread, check-knot,
  check-status-strip, check-production-mode pass; check-practice-setup
  fails as before the batch.

### 2026-11-15 — Claude — Sandbox browser check (no build change)

- `scripts/check-sandbox.mjs` (new): free pass with feedback and marks,
  forced tear splits the skin, Undo pass, replay, session summary. Drives the
  driver through a dev-only `window.__sutureHeroSandbox` hook in `main.ts`.
- Checked: passed 3/3 in this sandbox; tsc clean. Listed in AGENTS.md.

### 2026-11-15 — Claude — Sandbox: forceps eversion and counter-traction count (build 0.177)

- `FreePassRecord.entryLift`; `describeEversion` in `freePassFeedback.ts`;
  COUNTER_TRACTION_TEAR_FACTOR in `PracticeSession.shapeFreePass`.
- Checked: tsc; tissue + PracticeSession tests.
- Lance: evert the edge with the forceps, then pass; read the feedback.

### 2026-11-15 — Claude — Sandbox: slow-motion replay with tip paths (build 0.176)

- `src/gameplay/replayBuffer.ts` (new, tested), `src/scene/ReplayController.ts`
  (new), `ThreadStrand.snapshot/restore`, `SutureModel.refreshThread`,
  Replay button in `WorkspaceLayout.ts`; loop skips session.update while
  replaying.
- Checked: tsc; replay + suture tests; check-layout; Playwright: move,
  replay, no console errors.
- Lance: do a pass, press Replay ½×, check instruments/needle/thread.

### 2026-11-15 — Claude — Sandbox: session summary, spacing, targets, progress, export (build 0.175)

- `src/gameplay/sandboxSummary.ts` (new, tested): summary, targets,
  storage `suturehero.sandboxTargets.v1` / `suturehero.sandboxProgress.v1`,
  trend. `src/ui/SandboxSummaryPanel.ts` (new), CSS, mount in `main.ts`.
- Checked: tsc; sandboxSummary tests; check-layout, check-production-mode;
  page loads with no console errors (Playwright).
- Lance: do a few passes, tie 3 stitches, Save session, Export JSON.

### 2026-11-15 — Claude — Sandbox: knot security and edge approximation (build 0.174)

- `src/gameplay/stitchOutcome.ts` (new, tested): assessKnot, assessEdges.
- `PracticeSession.sandboxStitchOutcome`; finishSandboxStitch adds review
  lines and applies SLIP_CLOSURE_LOSS; `FreeKnotPractice.seatedThrows`.
- Checked: tsc; gameplay tests (75 pass).
- Lance: tie a granny (same direction twice) and a square knot; compare.

### 2026-11-15 — Claude — Sandbox: thread drag and cut-through (build 0.173)

- `FreeThreadGuide`: drag (MAX_SLIDE_SPEED, DRAG_TRACT_UNITS), `tension`,
  eye-jump guard; `FreeNeedlePass.cutThrough()`; session CUT_TENSION 1.35
  for CUT_SECONDS 0.5; message in `main.ts`.
- Checked: tsc; gameplay/suture/tissue tests (280 pass).
- Lance: after a pass, pull the needle away fast vs slowly.

### 2026-11-15 — Claude — Sandbox: needle loading check, tear limits in mm (build 0.172)

- `src/suture/needleLoading.ts` (new, tested); messages in `main.ts`.
- Checked: tsc, needleLoading test.
- Lance: grip the needle near the swage and near the tip; read the message.

### 2026-11-15 — Claude — Sandbox: hold the suture with either instrument (build 0.171)

- `src/suture/ThreadGrasp.ts` (new, tested); `SutureModel.advanceFreeThread`
  takes held-thread pins; `PracticeSession.threadGrasp`; status message.
- Checked: tsc; gameplay + suture tests (215 pass, new session test).
- Lance: in the Sandbox, grip the thread with the forceps (Z) and pull.

### 2026-11-15 — Claude — Sandbox skin shape, tears, undo, angle, jitter (build 0.170)

- `src/tissue/FreeNeedlePass.ts`: `surfaceAt`/`halfGapAt` (live surface),
  `rents` + no purchase in torn skin, `undoLast()`, `entryAngleDeg`,
  forcing smoothing (FORCING_SMOOTHING_S) and ANGLE_DEADBAND, `tearLimits`.
- `src/tissue/freeSkinSurface.ts` (new): gap, edge roll, eversion/stitch lift.
- `SkinTypes.ts`: tear limits per skin type, new `fragile` type.
- UI: Undo pass button, rent drawing (`freePassMarks.ts`), messages.
- Checked: tsc; gameplay/suture/tissue/setup/scene/environments/ui tests
  (318 pass); check-production-mode, check-layout, check-free-tying.
- Lance: lift an edge with the forceps and pass through it; force a pass
  to tear and try re-entering the tear; Undo pass.

### 2026-11-15 — Claude — Sandbox forcing tears the pass (build 0.169)

- `src/tissue/FreeNeedlePass.ts`: sustained hard forcing (TEAR_DEGREES 35,
  TEAR_UNITS 0.26 for TEAR_SECONDS 0.4) ends the pass as `torn`; tests added.
- `PracticeSession` passes the step as dt; `main.ts` shows a "Tissue torn"
  message; `freePassMarks.ts` marks torn entries red.
- Checked: tsc; gameplay/suture/tissue/setup/scene tests (281 pass).
- Lance: in Sandbox, twist the driver hard across the curve mid-pass; the
  needle should come free with a red mark and the message.

### 2026-11-15 — Claude — fix running-stitch thread jumping (build 0.168)

- Lance: with several passes the suture jumps to the latest one. Cause:
  `FreeThreadGuide` gave the first pass's sliding exterior up to the whole
  strand, so pulling the needle away left no room for older passes and
  they were dropped. Now older passes' thread (path + loose span) is laid
  out first; passes are dropped only if they themselves do not fit; the
  exterior gets the remainder (taut beyond it).
- New test (two passes, needle pulled up to 9 units away: both stay
  pinned) failed before the fix and passes after; all 7 guide tests and
  the 279 gameplay/suture/tissue/setup/scene tests pass.

### 2026-11-15 — Claude — several tied Sandbox stitches (build 0.167)

- `StitchCourse.recordSandbox(site, review, strands)` (+ test): any number
  of records outside a guided course, each at its own `site.siteZ`,
  strands in world coordinates (Sandbox keeps the current site at z 0).
- PracticeSession: `sandboxStitchZ` (pass entry/exit midpoint) set on tie;
  `tissueField` centres the active site there; `fieldInUse` applies the
  field (tissuePoint) in a course or with Sandbox stitches;
  `canFinishSandboxStitch` (knot seated) / `finishSandboxStitch()` record
  the site + strands, resetCurrent, unthread passes, show the thread.
  main.ts: the tying button reads "Finish stitch · next" and retains the
  knot meshes via CompletedStitchesView.retain(…, 0).
- Fixes the 0.166 gap: the live knot closed the wound at z 0, not at the
  pass.
- Session test: two stitches at z ±0.5 (knot seated stubbed), recorded at
  their positions, two field sites, back in the Sandbox. Tests (278) pass;
  check-production-mode, -free-tying, -knot pass.

### 2026-11-15 — Claude — knots on free passes, B3 (build 0.166)

- New `src/tissue/freePassKnot.ts` (+ tests): `freePassBites(tract)` =
  where the tract crosses DERMAL_MIDPOINT (0.31) on each side of the wound
  (right first, as WoundApproximation.setDermalBites wants).
- PracticeSession: `canTieFreePass` / `tieFreePass()` start FreeKnotPractice
  on the latest pass (anchors kept in `freeKnotAnchors`, used each frame
  instead of the guided pass's), set the dermal bites, `freeFromPass`;
  stitchAssessment counts pass + extraction done for a sandbox knot.
  main.ts: the Free tying lab button reads/acts "Tie knot on this stitch"
  when a pass can be tied. Session test: pass 0.18 above the skin, tie,
  2 dermal bites, anchors at entry/exit, assessment past the pass stages.
- check-free-tying had been failing since 0.160 (button renamed to "Start
  guided exercise"); updated (loads ?needle=ps2, new label). It passes.
  check-guided-thread, check-knot, check-layout also used the old label;
  updated in the next commit (load ?needle=ps2, click "Start guided
  exercise"); all three pass.
- Tests: gameplay/suture/tissue/setup/scene (276) pass; tsc;
  check-production-mode passes.

### 2026-11-15 — Claude — running stitch, B2 part 2 (build 0.165)

- `FreeThreadGuide.anchors(strand, eye, passes)` takes a newest-first chain
  (`ThreadedPass`: tract + eyeAngle): first threaded pass has the sliding
  exterior; older passes get exit/tract/entry pins with a loose span
  (×1.05 slack); passes whose eye is not in are skipped; passes that do not
  fit before the tail reserve are dropped (+ 6 tests).
  `FreeNeedlePass.threadedPasses()` / `unthreadAll()` (+ test). Reset
  needle unthreads all passes and resets the guide.
- Session test: two driven passes, the strand lies along both tracts.
  Gameplay/suture/tissue/setup/scene tests (273) pass; tsc;
  check-production-mode passes.
- Next: B3 knots on free passes.

### 2026-11-15 — Claude — thread through free passes, B2 part 1 (build 0.164)

- `FreeNeedlePass`: each record has a `tract` (centre, axis, start =
  centre→tip at entry, exitAngle) + `tractPoint`; `eyeAngle` getter (tip
  angle − arc). New `src/suture/FreeThreadGuide.ts` (+ tests): pins along
  the tract behind the eye; once out, the exit with grow/shrink exterior
  allocation (as TissueThreadGuide) and the whole tract.
  `SutureModel.advanceFreeThread`; PracticeSession uses it in the sandbox
  with the current pass or the last completed one (eyeAngle ∞).
- Session test: after the pass the strand lies along the tract (< 0.05).
  Gameplay/suture/tissue/setup/scene tests (268) pass; check-production-mode.
- Next (B2 part 2): several passes threaded at once (running stitch); then
  B3 knots. Known: Reset needle keeps the thread in the last pass.

### 2026-11-15 — Claude — glide back, Reset needle, trainer needle (build 0.163)

- `heldInstrumentDisplay.ts`: `glideBack(dt)` blends the drawn pose from
  the needle back to the real pose (τ 0.08 s), real pose restored before
  each step (+ test). main.ts calls it when not locked.
- "Reset needle" (`#reset-needle`, WorkspaceLayout view tools; Sandbox
  only): `freePass.abortCurrent()` + `grasp.reset()`.
- PracticeSetup: `trainer` needle (radius 0.3, arc 0.6π) appended;
  `resolveSetup(search, {trainerDefault})` falls back to it in the browser
  on the skin pad only (tests and microsurgery keep NEEDLES[0] = PS-2).
  The guided bite needs ≈ 133° of arc, so `GUIDED_NEEDLES` excludes the
  trainer in the needle-clearance test, and Start guided exercise with the
  trainer reloads with needle=ps2&start=guided. Sandbox session test now
  uses a 96° tissue span (the 108° needle cannot complete 120°).
- Checks: gameplay/suture/tissue/setup/scene tests (264) pass; tsc;
  browser: trainer default, Reset needle, guided reload with PS-2;
  check-production-mode passes.

### 2026-11-15 — Claude — holder drawn on the needle in the skin (build 0.162)

- Lance: the needle driver kept moving without the needle while the needle
  was in the skin. New `src/scene/heldInstrumentDisplay.ts` (+ test):
  after the camera poses are applied, if sandbox && freePass.inTissue &&
  a holder, save its real pose and place it from the needle
  (`NeedleGrasp.placeHeldNeedle`); `restore()` runs before
  `session.update`, so the hand (camera or keyboard) still drives the
  needle and forcing is measured against the real pose.
- Checks: tsc; PracticeSession + scene tests; check-production-mode,
  check-calibration-preview pass.

### 2026-11-15 — Claude — Sandbox Stage B1: free needle passes (build 0.161)

- New `src/tissue/FreeNeedlePass.ts` (+ tests): engages when the
  driver-held tip crosses down through the skin over the pad; fixes arc
  centre and axis (needle local −Y) at entry; reduces the holder's wanted
  pose to a twist about that axis (unwrapped past 180°); before the exit
  the swage stops at the entry, after it the pass completes when the swage
  leaves the exit; backing out abandons; released needle stays put;
  forcing = off-curve rotation > 15° or centre offset > 0.11 units. Records
  entry, exit, depth, deepest layer, crosses-wound.
- `freePassFeedback.ts` (+ test), `scene/freePassMarks.ts`; PracticeSession
  runs it in the sandbox after the grasp update (needle settles only when
  not in tissue); reset clears. main.ts: sandbox messages (in skin /
  forcing / last pass), marks. Session test: driver turning the needle
  completes a pass across the wound.
- Checks: gameplay/suture/tissue/scene tests (260) pass; tsc;
  check-production-mode passes. Not yet tried with tracked instruments.
- Next (B2): thread through free passes; (B3) knots on them.

### 2026-11-15 — Claude — Sandbox default mode, Stage A (build 0.160)

- Lance: the default should be a sandbox where you can do anything. Agreed
  plan: A sandbox UI/state (this), B free needle passes anywhere (new
  needle–tissue model, days), C free knot tying on placed stitches.
- `PracticeSession.sandbox` getter (no guided edge, pass idle, no knot,
  not trimmed/finished); in it, an unheld needle settles onto the pad
  (`src/gameplay/needleRest.ts` + tests). Grasp/hand-off/eversion already
  worked outside the guided flow. main.ts: Sandbox title/heading/toolbar
  label, controls readout, "Start guided exercise" button, guided helpers
  (pass ghost, grip guides) hidden. Session test added.
- check-production-mode: procedure regex now accepts "Sandbox" (title
  changed on purpose). Gameplay + suture tests (198) pass; screenshot and
  a guided-start / reset round trip checked in the browser.

### 2026-11-15 — Claude — forceps jaws stay closed: prefer rotation for small stereo travel (build 0.159)

- Lance's Lab recording (0.158): forceps opening/closing, virtual stays
  closed. Saved forceps calibration: hinge 26.3° closed→open, stereo prism
  centre 3.3 mm closed→open (≈ 7 mm from the hinge pin; frames show the
  prism cube near the box lock). Stereo position reading was always
  preferred and its 3.3 mm range is mostly jitter. Only face 19 was seen.
- `stereoHandle.ts`: USABLE_STEREO_TRAVEL_MM 10, `preferStereoOpening` (+
  test); controller uses rotation when travel < 10 mm and a rotation model
  exists; Calibrate open message explains. Jaw tests (52) and
  check-handle-jaws-stereo pass.
- Lance: no recalibration needed; moving the prism further from the hinge
  would make the stereo reading usable.

### 2026-11-15 — Claude — forceps prism IDs 18, 19, 28 (build 0.158)

- Lance asked for forceps prism IDs 18, 19, 28. `HANDLE_PRISM_IDS`:
  forceps [18, 19, 28]; scissors [28, 29, 32] → [29, 32, 33] to avoid the
  clash. Test: forceps IDs, no shared IDs, none on the 8-face rings.
  Jaw tests (51) pass. A saved forceps prism calibration (face layout by
  index) would need redoing; none existed.
