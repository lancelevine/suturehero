# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** Claude Code — Production mode (polished full-screen presentation view).
- **Needs Lance to test by hand:**
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

### 2026-11-11 — Claude — Tracking Lab live virtual view (build 0.139)

- Lance: in Tracking Lab he can't see the virtual instruments, so it is
  hard to know what he is recording.
- New `src/trackingLab/liveView.ts`: while the Lab is open, the simulator's
  `#viewport` is moved into a "Virtual instruments (live)" panel and put
  back in place on close; `main.ts` keeps rendering while the view is in the
  Lab (it previously paused whenever the Lab was open). Live only: replay
  runs in the hidden engine iframe and does not drive this view.
- Checks: tsc; check-tracking-lab-layout (extended: view moves in, sizes,
  renders, returns) and check-tracking-lab pass; screenshot checked.
- Follow-up idea: show the replayed instrument pose/jaw % during replay.

### 2026-11-11 — Claude — handle-prism jaws: twist wrap bug; face snap 4° (build 0.138)

- Replayed Lance's Tracking Lab recording (0.137, 139 frames, faces 1, 2
  ring + 9 prism, jaws closed, wiggling) offline through solvePrismPose and
  handleHinge with his saved hinge/layout. Ring solve was stable (seeded =
  unseeded). `twistAngle` returned ~346° instead of ~−14° whenever
  closed⁻¹·relative had w < 0 → opening clamped to 1.2 on ~half the frames:
  the 0 ↔ 100% swing. Bug present since 0.109.
- `handleHinge.ts`: `twistAngle` takes w ≥ 0 (range −π…π) + test. Same
  replay: 0% on every frame. Mirrored solutions (41–49° off-hinge) seen in
  the data and rejected by the 0.136 swing check.
- Face 9 (corrected) read −15° ± 5° with jaws closed; the hinge range is
  15.5°. Its correction was snapped exactly to 120°. `FACE_SNAP_RADIANS`
  25° → 4° (the change reverted on 2026-11-11 on synthetic evidence only;
  real data outweighs it). Needs re-alignment to take effect.
- Checks: jaw unit tests, tsc; check-handle-jaws-stereo passes;
  check-handle-jaws now fails at −15,60,0 (0.72 vs 0.5; synthetic alignment
  noise ~5° no longer snapped away) instead of −15,300,0.
- The 0.137 same-image change did not cause or fix this; kept (harmless).

### 2026-11-11 — Claude — handle-prism jaws: same-image ring and prism (build 0.137)

- Lance (0.136): with only face 9 + ring visible, a small wiggle swings the
  opening 0 → 100% → 0. Cause: camera 1 `observations` mixes flow corners
  (newest image) with decoder corners for markers flow is not following
  (image 50–80 ms older; tracking.ts decode `missing` merge), and the
  prism controller combined them.
- tracking.ts keeps `markerImageAt` (capture time of each marker's corner
  image, set on flow results, decode `missing` and drift corrections) and
  passes it as `markerImageAt` to the jaw host. New `src/jaw/sameImage.ts`
  (+ test): ring markers and prism faces from the newest ring image only.
  `handlePrismController.ts` uses it for camera 1 (camera 2 unchanged).
- Also tried and reverted (not shipped): face-correction snap 25° → 4°
  (synthetic −15,60,0 went 0.58 → 0.72; measured corrections carry ~5°
  single-face error). Patch kept in the session scratchpad only.
- Checks: unit tests, tsc; check-handle-jaws same as 0.136 (fails only at
  −15,300,0, 0.23); check-handle-jaws-stereo and check-tracking-motion
  pass. A temporary wiggle test (jaws closed, ±6–8° rocking) read ≤ 9%
  both before and after: the sandbox camera (~15 fps, slow motion) does
  not reproduce the mix, so the fix is untested against the real symptom.

### 2026-11-10 — Claude — handle-prism jaws: hinge-consistency check (build 0.136)

- Lance: jaws read well on one face but open/close when the instrument is
  turned (handle prism, faces aligned, one camera).
- `handleHinge.ts`: `hingeSwing` (rotation off the hinge axis) and
  `bestHingeReading` (pick the candidate closest to a pure hinge turn; none
  if all exceed `MAX_HINGE_SWING_RADIANS` = 15°), with tests.
- `handlePrismController.ts` `cameraRelative`, calibrated + corrected mode
  only: each face is solved seeded from the last reading, seeded from the
  closed pose, and unseeded; fits within 1 px of the best are compared by
  hinge swing. Off-hinge faces are skipped (next face tried; else hold).
- check-handle-jaws, single camera: before, failed at −15,60,0 on 3/3 runs
  (reads 0 or 0.25 vs 0.5: mirror flip). After, that pose reads 0.58 and the
  mirrored solution at −15,280,0 (34° off-hinge, 0.72) is rejected; it now
  fails at −15,300,0 on 4/4 (0.23 vs 0.5). Traced: all three handle
  solutions agree there and the ring (3 faces, unseeded = seeded) is fine;
  face 30 seen obliquely is ~5° off, i.e. precision, not a flip. Threshold
  unchanged. check-handle-jaws-stereo passes.

### 2026-11-10 — Claude — camera frames from the track (build 0.135)

- Why: Lance's 0.134 profile with the OV9281s: cameras presented 119.6
  fps but capture attempts were 30/s, because the browser renders at 30 Hz
  and requestVideoFrameCallback / drawing the <video> only see rendered
  frames.
- New `src/input/trackFrames.ts` (+ test): reads a clone of each camera
  track with MediaStreamTrackProcessor, keeps the newest VideoFrame.
  `observeCameraFrames` (CameraFrameClock.ts) starts it when frame-driven
  capture is on (default for OV9281) and calls back per arriving frame;
  `videoSnapshot` uses that frame; tracking.ts takes a snapshot for flow
  too while it is active. Profile context gets `frameSource`.
- Pairing time with track frames is the read time (no camera capture
  time from this API); frames are read on arrival, so the gap is small.
- Checks: tsc, src/input unit tests; tracking-motion (default and
  ov9281), ring-handoffs, driver-depth (ov9281), profiler pass. Profile
  confirms frameSource "camera track" in ov9281 mode and "display" with
  the setting off. The sandbox camera only delivers ~15 fps, so the 120
  fps gain is untested here. check-stereo-motion with
  SUTURE_CAMERA_PRESET=ov9281 is flaky both before (3/5) and after
  (3/8), with the same failure kinds; not conclusive either way.

### 2026-11-09 — Claude — tracking.ts split continued (timed session)

- Moved out with unit tests, no behaviour change (one commit each):
  `chooseFace`, `rotationFaceMarkers`, `combineRotation`, `restRigidBody`,
  `faceCandidates` (rotationTracking.ts); `depthRange`, `filteredDepthZ`
  (monocularDepthMapping.ts); `flowFrameScale`, `offsetMarkers`,
  `mergeNewMarkers` (new flowScale.ts; the first two were duplicated per
  camera); `captureDue` (captureScheduling.ts; duplicated per camera);
  `drawDetectedMarker`, `cameraStatusText` (new src/ui/markerOverlay.ts).
  In tracking.ts: `recentlyDecodedMarkers` and `ringPoseTracker` helpers.
- Sizes: updateLiveTargets 252 → 138 lines, detectSecondFrame 113 → 95,
  tracking.ts 2069 → 1898.
- Checks after each step (all pass): tracking-motion (also ov9281),
  driver-depth, marker-rest, ring-handoffs, ring-markers, calibration-preview,
  predictive-decode, stereo-motion, stereo-rig-faces, handle-jaws-stereo,
  dual-camera-fit, stereo-shortcut, profiler.
- Next: Camera 1's `detectFrame` mirrors detectSecondFrame; the flow and
  decode result handlers could share one per-camera module.

### 2026-11-09 — Claude — per-instrument distance state grouped; dead maps removed

- Removed five dead maps from `src/tracking.ts` (only ever cleared):
  rotationStates, rotationFaceStates, rotationGeometryStates,
  rotationFilterStates, poseHistory.
- New `src/input/trackerDistance.ts` (+test): `DistanceTracks` (per
  instrument: DistanceHistory, SizeDepthEstimator, last depth; resets match
  the old maps: pose reset → histories + size estimators, depth-filter reset
  → histories only, last depth never cleared) and `measureTrackerDistance`
  (pose vs size distance, one-camera size depth / hold). Replaces
  distanceHistories, sizeDepthEstimators, depthSamples.
- No behaviour change. Pass: tracking-motion, driver-depth, marker-rest,
  calibration-preview, ring-handoffs, stereo-motion, status-strip;
  depth-stability 2/5 (same as before).
- `updateLiveTargets`: 252 → 154 lines. Remaining: face choice + rest latch,
  rest hold (DOM status), stereo/mono rotation source switch, depth filter.

### 2026-11-09 — Claude — updateLiveTargets split, steps 3–4

- New `src/input/rotationTracking.ts` (+test): `predictRotation`,
  `startRigidBody`, `rotationVerdict` (the single-face credibility gate and
  its special cases; same thresholds and status labels), `acceptRotation`,
  `stallRotation`, `updateFaceTransition`, `largestFaceId`; shared
  `RigidBodyState` / `FaceTransitionState` types.
- `sizeDepthCandidate` in `src/input/sizeDepthEstimator.ts` (+test).
- No behaviour change. Pass: tracking-motion, ring-handoffs, marker-rest,
  stereo-motion, stereo-rig-faces, calibration-preview, handle-jaws-stereo,
  marker-jaws, driver-depth.
- `updateLiveTargets`: 252 → 187 lines. Remaining inside: face choice + rest
  latch, distance source choice, rest hold (DOM status writes), stereo/mono
  source switch. Next: group the per-instrument maps into one state object.

### 2026-11-09 — Claude — updateLiveTargets split (2 steps); depth-drift claim corrected

- Moved out of `updateLiveTargets`, no behaviour change:
  `desiredDepthZ` / `smoothDepthZ` / `cameraPlaneXY` / `LOCKED_DEPTH_Z`
  (`src/input/monocularDepthMapping.ts`) and `DistanceHistory`
  (`src/input/distanceHistory.ts`), with unit tests. tracking-motion,
  driver-depth, marker-rest, calibration-preview pass.
- **Correction:** `check-depth-stability` passes only ~40–60% in this
  sandbox, including on build 0.132 itself (5 runs: 2 pass). The 6/6 right
  after the sub-pixel corner fix did not hold up, so 0.132 did not
  demonstrably fix the drift. The sub-pixel fix itself is correct (whole-pixel
  corners were a real bug) and stays. Back on the flaky list in AGENTS.md.
- Next steps for the split: rest hold, then the rotation solve; group the
  per-instrument maps into one state object first.

### 2026-11-09 — Claude — 0.134 camera labels; more out of tracking.ts

- 0.134: camera view labels (`.tracking-video:after` in workspace.css) on a
  solid background; the blurred-shadow text looked like a glitch.
- Moved out of `src/tracking.ts`, no behaviour change (2069 → ~2030 lines):
  `src/ui/frameDiagnostics.ts` (adaptive/Otsu preview filters; tests prove
  identical output to the old inline code), `src/scene/
  trackingInstrumentModels.ts` (virtual-view instruments + scissors
  opening), `steadyCaptureFrame` in `src/input/sizeDepthEstimator.ts`
  (Near/Far capture choice). All with unit tests.
- Pass: tracking-panels, tracking-motion, marker-jaws, calibration-preview,
  driver-depth, depth-stability, dual-camera-fit; previews probed (binary).
- Next candidates: the big `updateLiveTargets` (≈260 lines) and
  `detectSecondFrame` (≈110) need their shared state grouped into objects
  first; worth doing in small steps.

### 2026-11-09 — Claude — 0.133 layout tidy-up

- `src/ui/workspace.css`: container query on `#viewport` (≤ 560 px) wraps
  the title, hides `.camera-hint` / `.scene-label`; drawer hides the panel's
  `.calibration-heading`; neutral action and select sizing.
- `src/ui/InstrumentCalibrationPanel.ts`: Set neutral + status moved to
  `.calibration-neutral-action` under the instrument buttons; tabs before
  the live preview. `WorkspaceLayout.ts`: drawer bar "INSTRUMENT
  CALIBRATION". `TrackingLayout.ts`: camera controls collapsed by default;
  second-camera row moved under camera 1's row.
- `scripts/check-camera-controls.mjs` opens the (now collapsed) controls
  first. Pass: tracking-panels, dual-camera-fit, calibration-ui,
  calibration-preview, camera-controls, status-strip, stereo-shortcut.

### 2026-11-09 — Claude — 0.132 sub-pixel corners fix depth drift; size-depth module

- `src/input/sizeDepthEstimator.ts` (+test): the single-camera size-depth
  logic moved out of `tracking.ts` (face choice, rest hold, median window).
  No behaviour change (separate commit).
- Drift root cause: `refineCorners` in `src/input/arucoWorker.ts` only
  snapped corners to the best whole pixel (Harris argmax). Integer corners
  made a 33 px marker read 33×34 at some sizes; `tiltCorrectedSize` takes
  the larger principal scale, so it read ~3% large. Raw side lengths from
  decode and flow were unbiased (traced). Fix: parabola peak fit
  (`src/input/subpixelPeak.ts` + test; inline copy in the classic worker,
  keep in sync).
- check-depth-stability 6/6 (removed from flaky list). Pass: ring-markers
  (local js-aruco2), tracking-motion, driver-depth, marker-rest,
  ring-handoffs, calibration-preview, stereo-motion, stereo-rig-faces,
  handle-jaws-stereo, predictive-decode, marker-jaws.
- **Lance to test:** all marker tracking (the change affects every decoded
  corner); single-camera depth while holding still.

### 2026-11-09 — Claude — 0.131 main-screen status strip

- New `src/ui/trackingHealth.ts` (+test): `setupChecklist`,
  `holdingReasons`, `CameraMovedMonitor` (stereo fit > 3 px for ≥ 75% of
  ≥ 12 fits in 4 s → warning; clears below 40%), `fitErrorFromReason`.
- New `src/ui/StatusStrip.ts` + `statusStrip.css`: renders it above the
  practice view (or top of tracking.html). Items open: start camera(s),
  Tracking setup, Calibrate → Pose / Jaws.
- `src/tracking.ts`: feeds fits (accepted `rigid.errorPx`, rejected "fit
  error X px") and `latestPairingFailure`; updates the strip every 500 ms.
  Jaw controllers gain `calibrated(name)`.
- New `scripts/check-status-strip.mjs` passes; check-tracking-panels,
  check-dual-camera-fit, check-stereo-shortcut, check-calibration-ui,
  check-tracking-motion, check-stereo-motion, check-handle-jaws-stereo pass.
  (A stale dev server made check-stereo-motion fail until restarted.)
- **Lance to test:** the strip with real cameras; nudge a camera after
  stereo calibration and see whether the warning appears within ~4 s.

### 2026-11-09 — Claude — 0.130 stereo start shortcut on the main bar

- `src/ui/TrackingLayout.ts`: `#start-stereo-shortcut` in the header clicks
  `#start-stereo-all`; `#stereo-quick-status` and the disabled state are
  mirrored (MutationObserver) to `#start-stereo-shortcut-status` under the
  camera views.
- New `scripts/check-stereo-shortcut.mjs` passes; check-tracking-panels,
  check-dual-camera-fit, check-camera-controls pass.

### 2026-11-09 — Claude — 0.129 neutral pose survives reload

- `src/input/InstrumentCalibration.ts`: `captureNeutral` saves the raw
  neutral position + rotation under `suturehero.instrument-neutral.v1`
  (per instrument; slots `relative` / `metric` by depth kind). A new session
  (after reload or camera restart) starts from the saved neutral, as if it
  were the first pose seen. Unit tests: reload round-trip, slot separation,
  corrupt data. check-calibration-ui, check-calibration-preview,
  check-tracking-storage, check-tracking-motion pass.
- **Lance to test:** set neutral, reload, check the instrument sits where it
  did. The saved neutral is in camera coordinates, so moving the camera
  needs a new Set neutral.

### 2026-11-09 — Claude — 0.128 flow back-off; investigations

- **0.128:** `src/input/flowBudget.ts` (+test): per-camera optical-flow
  back-off. Measures the main-thread cost of each flow request and spaces
  requests to use ≤ 15% of the main thread, never below ~30 Hz. Profile
  exports gain `flowBackoff` and the correct `build` (was stuck at 0.124;
  AGENTS.md now says to bump it). check-profiler, check-tracking-motion
  (also at ov9281 preset), check-stereo-motion pass.
- `markerReadoutText` moved from `tracking.ts` to `src/input/markerReadout.ts`
  (+test). No behaviour change.
- `check-handle-jaws-stereo` renders natively at the preset size. At 1280×800
  in this sandbox, frames arrive 150–240 ms apart (software rendering), over
  the 120 ms stereo pairing limit, so stereo drops out: sandbox limit.
- Depth drift (`check-depth-stability`), not fixed. Findings: at exactly
  scale 1.0 the synthetic marker is drawn pixel-aligned and reads ~3% smaller
  than at any resampled scale; during the wobble the instrument is not
  "stationary", so the rest-freeze is not involved; raw size readings are
  biased by sub-pixel corner noise. Tried median-at-rest variants and a
  1.0005 rest scale: no improvement; reverted.
- Single-camera prism flips, not fixed. Tried rejecting readings that are not
  a pure hinge turn (`offHingeAngle`): the bad readings are on-hinge, ±10°
  rotation error of one 12 mm face from one camera, against a 20° full
  range. A physical limit; stereo is the answer. Reverted.
- **Lance to test:** OV9281 profile → check `flowBackoff` in the export.

### 2026-11-08 — Claude — 0.127 header fix; check fixes; depth drift traced

- **0.127:** `src/ui/workspace.css` header is `height:auto;min-height:64px`.
  Between ~760 and ~1100 px wide the header buttons wrapped into a second row
  that overflowed the fixed 64 px header and sat under the camera panel /
  calibration drawer (unclickable). Found by `check-tracking-panels`, which
  now passes.
- `check-predictive-decode` updated: periodic coverage counts discovery tiles
  (since 0.124) as well as full scans. Passes.
- `check-dual-camera-fit` passes now; removed from known-failing.
- `check-depth-stability` (flaky ~50%): not a filter bug. Logged the
  filter's input: after the ±1% size wobble starts, the tilt-corrected size
  depth moves from 4.32 to ~4.10 and stays there while the scene alternates
  evenly, and the filter correctly follows. Suspect flow-carried corners
  shrinking the measured size. Not fixed (needs work in the corner/size
  pipeline); next step: log the marker side length per decode vs flow frame.
- Performance: synthetic profile (OV9281 preset, swiftshader) is limited by
  the test browser (13 fps delivered; main thread ~0.5 ms/frame). The one
  risk for two 120 fps cameras is `flow bitmap request` (5 ms/frame here on
  the main thread). Needs a real OV9281 profile before deciding whether to
  cap flow (FLOW_MIN_INTERVAL_MS.frameDriven = 4 ms allows 120 Hz).

### 2026-11-08 — Claude — 0.126 marker list shows only decoded markers

- Lance spotted that ring ID 3 isn't on the angled face. Correct: at
  −15,300,0 the synthetic scene draws ring faces 4, 5, 0 and 6 (6 is the
  angled one); 3 and 2 are hidden. The previous entry's "face 3 is really
  visible" was wrong. The list showed 2 and 3 for 3–6 s because optical flow
  kept their old outlines alive. Pose paths already require a decode within
  250–650 ms, so poses were not affected.
- `src/tracking.ts`: `#marker-readout` lists only IDs decoded within
  `MARKER_READOUT_DECODED_MS` (650, same as the overlay). Probe: ghosts clear
  within ~1.5 s. check-tracking-motion and check-marker-rest pass.
- Follow-ups (fail at HEAD before this change too): `check-predictive-decode`
  asserts `Camera 1 search full` > 0, likely out of date since the 0.124
  discovery tiles; `check-tracking-panels` times out. Not investigated.

### 2026-11-08 — Claude — 0.125 stereo prism axis fix; OV9281 two-camera rehearsal

- **Bug fixed (0.125):** `prismAxisPoint` (`src/jaw/stereoHandle.ts`) moved
  each face centre outward, so each prism face gave a different axis point
  and the stereo opening jumped when the visible face changed. The unit test
  built mirrored faces; it now also checks the real `localCorners('prism')`
  layout. `check-handle-jaws-stereo` now asserts pose −15,300,0 (reads 0.44,
  was 0.89). The "phantom ID 3" lead from the previous entry was wrong: face
  3 is really visible there.
- `check-handle-jaws` (single camera) is flaky, not regressed: the same code
  passes or fails −15,60,0 / −15,300,0 between runs (single-face mirror
  flips). Listed as flaky in AGENTS.md.
- Two-camera checks accept `SUTURE_CAMERA_PRESET=ov9281` (`presetCalibration`
  in `scripts/synthetic-camera.mjs`). check-stereo-motion passes;
  check-stereo-rig-faces fails its 3 px fit limit (3.9 px, from upscaling the
  2D scene); check-handle-jaws-stereo reads 0.61–0.74 at −15,205,0 (0.48 at
  960×540), possibly load from 120 fps synthetic cameras in software
  rendering. Not investigated further.
- New unit tests: 1280×800 tile coverage, frame-driven setting storage.
- Not done: removing the legacy ball code in `tracking.ts` would drop the
  coloured/striped (classic) jaw modes AGENTS.md says stay supported. Waiting
  for Lance's decision.
- **Lance to test:** stereo handle-prism jaws while rolling the instrument
  (needs a stereo recalibration of the prism's closed/open after 0.125).

### 2026-11-08 — Claude — Handle-prism pose (−15, 300, 0): narrowed, not fixed

- Fails in check-handle-jaws (0.17) and check-handle-jaws-stereo (0.89,
  reported not asserted). Not the ring pose itself: solving the synthetic
  ring at that pose from its truly visible side faces (0, 4, 5) gives 0.00°
  error exactly and 0.30° with 0.8 px corner noise.
- Clues: (1) prism face 30 faces camera 1 exactly head-on (0°) there, while
  every passing pose uses a face 10–19° off-axis; (2) camera 1's decoder
  lists ring ID 3 at 280° and 300°, but face 3 points away from the camera
  and the synthetic renderer never draws it — a phantom detection that
  would corrupt the ring pose if used. Next: log ID 3's corners at that
  pose and find what is decoded as 3.

### 2026-11-08 — Claude — Fix flaky stereo depth checks (test realism)

- Traced check-stereo-motion: when it worked, the pose settled ~1.6–2 s
  after a depth step (still moving at the old fixed 1 s read); when it
  failed, the pose froze after a brief spike. Cause: the checks teleported
  the marker 270–470 mm (and the rig check 80 mm + 8.6°) in one frame —
  with unsynchronised cameras an old and a new view get paired, and the
  stereo continuity limits (10°, 15 mm per update once locked) correctly
  refuse the impossible jump.
- `check-stereo-motion.mjs`: `ramp()` moves scale over ~1 s, `settled()`
  waits for ≤ 0.02 change per 250 ms (≤ 4 s). `check-stereo-rig-faces.mjs`:
  10-step ramp + settle. Thresholds unchanged. Both 5/5 passes (were ~1/3
  and ~2/3).

### 2026-11-08 — Claude — Build 0.124: tiled discovery scans

- `src/input/PredictiveDecodeSearch.ts`: region kind `discovery`; 2×2 tiles
  with overlap max(120 px, 10% of min dimension), one per 250 ms; first
  scan and recovery stay full; discovery results never count as misses.
  Tests updated/added (coverage, edge-straddling marker, no miss).
  Profiler classifies `discovery decode worker`.
- Checked: PredictiveDecodeSearch tests, tsc; tracking-motion,
  ring-handoffs, driver-depth, tracking-lab, marker-jaws, handle-jaws-stereo,
  calibration-preview, profiler, tracking-storage pass; stereo-rig-faces
  passed 2 reruns. check-stereo-motion: 1/3 pass both before (0.123) and
  with tiles — same flakiness (near step 0.6–1.0 vs > 1).

### 2026-11-08 — Claude — Build 0.123: frame-driven capture

- New `src/input/captureScheduling.ts` (+ test): `FrameDrivenSetting`
  auto/on/off (`suturehero.frameDrivenCapture.v1`), auto = on for camera
  type ov9281; `FLOW_MIN_INTERVAL_MS` display 20 / frameDriven 4.
- `src/tracking.ts`: `frameDriven()`; rVFC callbacks call
  detectFrame/detectSecondFrame when on; animate() skips them then; flow
  gate uses `flowMinIntervalMs()`. Profiler panel select + report option.
- `scripts/synthetic-camera.mjs`: `SUTURE_FRAME_DRIVEN=on|off`.
- Checked with frame-driven on: tracking-motion, ring-handoffs,
  stereo-rig-faces, driver-depth, calibration-preview, tracking-storage;
  OV9281 preset: tracking-motion, driver-depth; default: tracking-motion,
  tracking-lab — all pass. Benefit needs > display-rate cameras to measure.

### 2026-11-08 — Claude — Build 0.122: stereo pairing by camera capture time

- `CameraFrameClock` keeps rVFC `captureTime` (validated); new
  `pairingTime(clock, readAt)` (+ tests): capture time if ≤ readAt and
  within `MAX_CAPTURE_TO_READ_MS` (200), else readAt. tracking.ts: all six
  `stereoFrames.push` calls use `framePairAt` / `secondaryPairAt`; staleness
  and frame-age checks still use the read time. Profiler row
  `Camera N capture to read`.
- Headless Chromium reports no captureTime for canvas streams, so checks
  exercise the fallback: stereo-rig-faces, handle-jaws-stereo,
  tracking-motion, tracking-lab, profiler pass; stereo-motion borderline as
  before (0.87 vs > 1). Real path: Lance's profiles showed captureTime 14–19 ms.

### 2026-11-08 — Claude — Two-camera browser check for stereo handle-prism jaws

- New `scripts/check-handle-jaws-stereo.mjs`: synthetic ring + 3-face prism
  in two cameras (camera 2 at T = (−60, 0, 0) mm), stereo calibration
  imported, closed/open captured; passes at calibration, half/closed/open
  and a rolled pose (0.49/0.01/1.00/0.50), all "stereo 3D". Travel 12.0 mm.
- Finding: the **Prism face width** setting matters. With 19 mm on this
  12 mm synthetic prism, face 30 read 1.00 instead of 0.50 (each face's
  inward shift to the centre line is wrong by the width error). Lance must
  enter his prism's real face width.
- Known issue, printed not asserted: euler (−15, 300, 0) reads 0.89 —
  the same pose fails the single-camera check; likely the ring pose at that
  angle (near edge-on faces 3/6). To investigate with the failing checks.

### 2026-11-08 — Claude — OV9281 rehearsal preset for synthetic checks

- `scripts/synthetic-camera.mjs`: `SUTURE_CAMERA_PRESET=ov9281` (1280×800,
  greyscale, 120 fps, `suturehero.cameraMode.v1` = ov9281).
- With it: check-tracking-motion, driver-depth, tracking-storage,
  calibration-preview, ring-handoffs pass; confirmed video 1280×800 →
  flow/overlay 960×600, marker detected. check-profiler fails only its
  frame-rate separation (software rendering of 1280×800 greyscale at 120
  fps saturates the headless machine: ~6 fps).

### 2026-11-08 — Claude — Build 0.121: optional worker-side ArUco readback

- `arucoWorker.ts`: accepts a transferred cropped bitmap (`readCropBitmap`,
  `worker readback` timing). `flowFrames.ts`: `requestCropBitmap`,
  `useDecodeBitmaps` switch (`suturehero.decodeBitmaps.v1`, default off).
  `tracking.ts`: `decodeViaBitmap` for both cameras when the switch is on
  (not with threshold/crop debug views, Lab replay, or after errors);
  `WorkerDetector.detectBitmap` takes an origin. Profiler rows + switch.
- Synthetic (software GL) with it on: main-thread tracking frame 5.2 → 5.9
  ms, decode worker readback 11 ms, decode age 22.5 → 36.8 ms — hence off by
  default. Real-GPU A/B needed.
- Checked: tsc, build; check-tracking-motion, ring-handoffs, stereo-rig-
  faces, stereo-motion, tracking-lab, driver-depth, marker-jaws,
  calibration-preview, tracking-storage, profiler pass (switch on and off);
  handle-jaws known pose only.
- Note: `check-stereo-rig-faces` is intermittent (depth step
  `moved.position[2] < handoff.position[2] − 0.3`): failed 1 of 3 runs both
  on 0.121 and on 0.119 (59ee929), so pre-existing flakiness, not from this
  change. Same family as `check-stereo-motion`'s borderline depth step.
- Follow-up for 120 fps cameras: capture is driven by the tracking loop
  (requestAnimationFrame; 30 Hz in Lance's profiles), and flow is capped at
  50 Hz (20 ms gate). To use 120 fps, drive capture from each camera's
  requestVideoFrameCallback.

### 2026-11-08 — Claude — Build 0.120: camera type, half-scale flow bitmaps

- `src/input/cameraDevices.ts` (+ test): `CAMERA_MODES` (webcam1080,
  ov9281 1280×800@120 mono), `cameraMode`/`setCameraMode`/`cameraRequest`,
  `suturehero.cameraMode.v1`; `cameraConstraints` uses the selected mode.
  Selector at the top of `CameraSettingsPanel`. Profiler reports it.
- `src/input/markerFlow.ts` `halfScalePyramid` (+ test vs framePyramid
  on a 2×2-averaged frame, ≤ 1 grey level); flow worker uses it for all
  bitmap frames; `postFlowBitmap` requests ceil(w/2)×ceil(h/2).
- Checked: unit tests, tsc; check-tracking-motion, ring-handoffs,
  stereo-rig-faces, tracking-lab, camera-controls, marker-jaws, profiler
  pass; handle-jaws known pose only. Synthetic flow worker 8.0 → 3.1 ms.

### 2026-11-08 — Claude — Build 0.119: in-app stereo calibration, stereo handle prism

- Replay of Lance's 11:21 AM roll recording: single-camera 12 mm prism-face
  rotation flips 40–160° even on the reference face; single-camera depth is
  off by hundreds of mm. Alignment learned from bad data (face 8's correction
  matched no physical layout).
- New `src/input/stereoCalibrationSolver.ts` (+ tests): Zhang + LM intrinsics
  (k1,k2,p1,p2; k3 = 0), camera-2 corner-order disambiguation (Python's
  seed/cost), joint LM of extrinsics + board poses, Python's gates. Pure TS
  (opencv.js is CI-built only and lacks stereoCalibrate). Synthetic: noise-
  floor RMS, rotation < 0.5°, translation < 3 mm.
- `checkerboardWorker.ts`: `refine` (≤960 px search + full-res cornerSubPix).
  `stereoAutoCapture.ts`: Solve and use calibration → event
  `suturehero:stereo-calibration-solved` → `loadStereoCalibration` in
  tracking.ts. Overlay states ready/waiting/problem with reason text; check
  interval 300 ms. `check-stereo-capture-quality` extended with a solve step
  (mocked refine corners from a known rig; baseline 284.1 mm).
- New `src/jaw/stereoHandle.ts` (+ tests): triangulated prism corners →
  axis point (apothem from face width) → ring frame → opening by projection
  between closed/open; robust capture mean; `suturehero.handleStereo.v1`,
  `suturehero.handlePrismFaceWidth.v1`. Controller prefers stereo; ring pose
  from `stereoPoseCache.lastGood` (≤ 2 s).
- Checked: unit tests (jaw, solver), tsc, build; check-stereo-capture-quality,
  check-marker-jaws, check-tracking-motion, check-stereo-rig-faces,
  check-tracking-storage pass; check-handle-jaws known pose only;
  check-stereo-motion borderline as before (0.98 vs > 1).
- Not tested: OpenCV `refine` in the real worker (opencv.js not available
  locally); stereo handle path in a browser. Lance: stereo capture → Solve;
  then handle prism Remove → Calibrate closed → Calibrate open with stereo on.

### 2026-11-08 — Claude — Build 0.118: learned prism face layout

- Lance: overlay showed face 8 used closed, face 9 open; rolling with jaws
  still opened/closed the reading → face layout mismatch.
- `src/jaw/handleHinge.ts` (+ tests): `FaceLayout`, `newFaceLayout`,
  `faceCorrection`, `correctedRelative`, `snapFaceCorrection` (nearest of
  3 positions × 4 quarter-turns for face and reference, ≤ 25°),
  (de)serialize. `handlePrismController.ts`: reference face set at the
  first closed capture; Align prism faces collects raw per-face readings
  from both cameras (12 each), unaligned faces skipped in live readings;
  `suturehero.handlePrismFaces.v1`; Remove calibration clears it.
- `scripts/check-handle-jaws.mjs`: alignment pass; `SUTURE_SWAP_FACES=1`
  renders 9/30 swapped. Both layouts give identical readings; known pose
  (euler -15,300,0) still fails in both.
- Lance: Remove calibration, then Calibrate closed → Align prism faces →
  Calibrate open; roll test with jaws still should no longer move the %.

### 2026-11-08 — Claude — Build 0.117: draw handle axis and hinge estimate

- Lance on 0.116: tracking feels good; handle-prism jaws calibrate but don't
  follow the real opening. Asked for a line on the arm and a triangle at
  the crossing.
- `handlePrismController.ts` keeps the last per-camera handle body pose
  (`handlePose`), exposed via `markerJaws.handlePose`. `ringAxisOverlay.ts`:
  `handleAxisSegment` (prism local ±Y 50 mm), `lineIntersection` (+ test),
  `drawHandleAxis` (orange line + triangle). Drawn in `drawRingAxes`.
- Checked: unit tests, tsc, synthetic screenshot (line along prism,
  triangle at crossing).

### 2026-11-08 — Claude — Build 0.116: faster optical flow, identical output

- Measured first (Node CPU profile of trackMarker/framePyramid): `score`
  (coarse block search, 2 × 625 offsets × 81 bilinear samples) = 73%,
  grayFrame 9%. A narrow-window-first search was tried and reverted: it
  barely helped and changed results (a markerFlow test failed).
- `src/input/markerFlow.ts`: `integerOffsetScorer` precomputes per-sample
  bilinear weights/index for integer offsets (same values; test compares
  with the reference); `grayFrame` interior fast path (bit-identical test,
  odd sizes included).
- Per marker 1.65 → ~0.7 ms; framePyramid ~2.4 → ~1.6 ms (Node). Synthetic
  check-profiler: flow worker 22.6 → 8.0 ms, Camera 1 flow 17.5/s →
  21.8/s (= arrival 21.7), flow frame age 45.6 → 25.1 ms.
- Checked: markerFlow tests, tsc; check-tracking-motion, ring-handoffs,
  stereo-rig-faces, stereo-motion, tracking-lab, driver-depth, marker-jaws,
  profiler pass; handle-jaws known pose only.
- Not done: 640×360 flow (kept 960×540 for corner precision), worker
  allocation reuse. Lance: new profile (stereo, bitmaps on/off).

### 2026-11-08 — Claude — Build 0.115: lazy kept frames in the flow worker

- Lance's 0.112 profile vs 0.110: main-thread tracking frame 13.2 → 6.4 ms;
  flow worker 20–22 → 28–29.5 ms (5 ms readback moved in + store pyramids);
  Camera 1 flow 21.3 → 15.2/s; flow frame age 27 → 40.5 ms; bitmap wait
  4–6 ms median (p95 ~22). Handle-prism jaw tracking 0.33 ms/frame.
- `arucoFlowWorker.ts`: `store` keeps the unread ImageBitmap; read +
  pyramid only on `seed`; `KeptFrames` release callback closes evicted ones.
- Checked: flowFrames/markerFlow tests, tsc; check-tracking-motion,
  check-ring-handoffs, check-stereo-rig-faces, check-tracking-lab,
  check-profiler pass.
- Next (agreed with Lance/ChatGPT): make optical flow cheaper — flow
  resolution 640×360, predicted windows around corners instead of
  full-frame pyramids, fewer worker allocations; keep full-res ArUco and
  recovery; benchmark each with jitter/loss/reacquisition; A/B the bitmap
  path's latency under identical conditions.

### 2026-11-08 — Claude — Build 0.114: Camera 2 in handle-prism jaws

- Lance: Camera 2 should verify Camera 1 or stand in when it's blocked.
- `handlePrismController.ts`: `cameraRelative()` per camera (ring pose
  cache per camera), `relativeRotation()` combines: agree ≤ 8°
  (`CAMERAS_AGREE_RADIANS`) → slerp average; disagree → nearer last good;
  one camera → that one. Readout names the source.
- Host: `second.handleMarkers` (markerJawController → tracking.ts, from
  `secondaryObservations` + `confirmed2`).
- Checked: jaw tests, tsc, check-handle-jaws (single camera; asserts
  "Camera 1 only"; known pose still fails). Two-camera path untested
  synthetically — Lance to test.

### 2026-11-08 — Claude — Build 0.113: filter the handle-prism opening

- Lance: calibration now works, but the reading jumps a lot.
- `OpeningFilter` in `src/jaw/handleHinge.ts` (+ tests): median of 5,
  `OPENING_JUMP` 0.3 must repeat, `OPENING_SMOOTHING` 0.35; used per
  instrument in `handlePrismController.ts` (reset on recalibration).
- Checked: handleHinge tests, tsc, check-handle-jaws (known pose only).
- Next if still noisy: a Lab recording to measure raw noise; then stereo
  (Camera 2) ring/prism poses or averaging several prism faces.

### 2026-11-08 — Claude — Build 0.112: robust handle-prism captures

- First real-hardware try (Lance): closed capture always failed the 3°
  all-samples rule with the instrument still. `averageRotation`
  (`src/jaw/handleHinge.ts`) is now robust: seed = sample with most
  neighbours, inliers within 5°, ≥ 60% required; returns spread/inliers.
  Limit loosened deliberately: real mono pose noise, not a test target.
- `handlePrismController.ts`: 20 samples; failure message shows the spread;
  warns when Jaw tracking is off (`running` host callback from tracking.ts).
- Checked: handleHinge tests (new noise/flip and moving cases), tsc,
  check-handle-jaws (unchanged: known pose only).
- Expect a noisy live reading for the same reason; next step if so is
  steadying the opening (or using Camera 2).

### 2026-11-08 — Claude — Build 0.111: flow frames as transferred bitmaps (stage 1)

- Plan agreed with Lance: stage 1 frames to workers / shared buffers;
  stage 2 predicted-region optical flow; stage 3 stereo pairing by
  captureTime. Keep the 65 ms ArUco interval for now. Milestone: flow on
  every delivered frame with ~15 Hz ArUco correction.
- New `src/input/flowFrames.ts` (+ test): `requestFlowBitmap` (VideoFrame
  cloned so the snapshot can close), `KeptFrames`, `FlowSeedRef`, live
  switch `flowFrameSettings` / `suturehero.flowBitmaps.v1`.
- `src/input/arucoFlowWorker.ts`: reads transferred bitmaps
  (`worker readback` timing), `keep` on detect, `store`, seed by `key`.
- `src/tracking.ts`: `postFlowBitmap`; both cameras skip the flow canvas
  draw/readback/seed copy on the bitmap path; `WorkerDetector.seed` accepts
  a `FlowSeedRef`. Previous path kept for Lab replay/unsupported/errors.
- Profiler: new rows `flow bitmap request` (main), `flow bitmap wait`
  (latency), `flow worker readback` (worker); A/B switch in the panel.
- Tests adapted (fixture patching only): `check-ring-handoffs`,
  `check-stereo-rig-faces` now patch both detect paths (`replaceAll`).
- Checked: unit tests, tsc, build; check-profiler, check-tracking-motion,
  check-tracking-lab (replay), check-ring-handoffs, check-stereo-rig-faces,
  check-marker-jaws, check-driver-depth pass; check-stereo-motion passed
  2 of 3 runs (same borderline depth step as before); check-handle-jaws
  known pose only. Synthetic A/B (software GL): main-thread tracking frame
  11.2 → 6.6 ms; createImageBitmap 3.3 ms sync here (GPU-emulated).
- Lance: Performance panel, profile with the switch on and off (single and
  stereo); compare Tracking CPU frame, flow bitmap request, flow/s.

### 2026-11-08 — Claude — Build 0.110: live performance profiler

- Measurement only; no thresholds, algorithms, smoothing, calibration,
  mappings, camera selection or rendering changed.
- `src/diagnostics/profilerStats.ts` (+ tests): 120-sample rolling stats
  (mean/median/p95/max/rate/busy ms per s), `classifyStage` (camera 1/2/
  shared, category, main/worker/latency, nesting) for the existing
  TrackingPerformance row names, `breakdown` (top-level main-thread shares;
  nested rows, loop totals and latency excluded; workers separate).
- `src/diagnostics/frameCadence.ts` (+ tests): per-camera delivered-frame
  cadence, presentedFrames gaps, captureTime age.
- `src/diagnostics/LiveProfiler.ts`: enables `TrackingPerformance.listener`
  (new; null when off) and its own rVFC (or currentTime polling) loop per
  camera only while enabled; sanitized track settings (no deviceId/label).
- `src/ui/ProfilerPanel.ts`: Diagnostics → Performance, collapsed and off by
  default, UI refresh ≤ 2 Hz, Copy/Download JSON.
- New timing points: `Camera N jaw frame copy`, `Jaw ball detection`,
  `Jaw stereo ball detection` (markerJawController), `Stereo fusion (render
  loop)` (tracking.ts animate). `performanceContext` extracted in tracking.ts.
- New `scripts/check-profiler.mjs`: off by default/no hook, single camera
  (no Camera 2 rows), stereo mode with Camera 2 at 6 fps vs Camera 1 (not
  mixed), stereo stages present, JSON export without device IDs/labels.
- Checked: full unit suite (548 passed), tsc, vite build; check-profiler,
  check-tracking-motion, check-marker-jaws, check-tracking-storage,
  check-calibration-preview, check-ring-handoffs, check-stereo-motion pass;
  check-handle-jaws still fails only its known pose (euler -15,300,0).
- Lance: Diagnostics → Performance → Enable, run 10–20 s per mode (single,
  stereo; current webcams, later OV9281s), Download JSON.

### 2026-11-08 — Claude — Build 0.109: handle prism jaw tracking

- IDs per Lance: needle driver 8, 9, 30; forceps 18, 19, 31; scissors 28,
  29, 32 (`HANDLE_PRISM_IDS`, `src/jaw/handleHinge.ts`). Legacy 'prism'
  tracker's scissors group also uses 8 — that tracker is not in use.
- New `src/jaw/handlePrismController.ts`: engine `'handle'` in the Jaws
  section (`markerJawController.ts`). Ring rotation: mono `solvePrismPose`
  (side faces, edge-on faces < 35% of largest dropped). Handle: largest face
  solved alone as the legacy 3-face 'prism' type, seeded by ring × last
  relative rotation to avoid the single-marker mirror ambiguity. Closed/open
  captures (15 samples, ≤ 3° spread) → `solveHinge`; saved in
  `suturehero.handleHinge.v1`.
- `src/tracking.ts`: `handleMarkers` host callback; decode region search
  groups include handle IDs (`decodeSearchGroups`) so a hidden handle face
  doesn't force whole-frame scans; Lab storage records `markerJaws.engine()`.
- New `scripts/check-handle-jaws.mjs`. **Known failing:** pose euler
  [-15,300,0] reads 0 (expected 0.5); the other 6 poses pass within 0.11.
  Not yet diagnosed (ring pose vs face-30 ambiguity).
- Checked: jaw + PredictiveDecodeSearch unit tests, tsc, check-marker-jaws,
  check-tracking-motion, check-ring-handoffs.
- Lance: build the prism to the layout above; test closed/open calibration.

### 2026-11-08 — Claude — Build 0.108: draw ring shaft axis

- New `src/ui/ringAxisOverlay.ts` (+ test): projects ring local ±Y (60 mm)
  with the mono ring solve; `drawRingAxes()` in `src/tracking.ts` draws a
  black line per instrument on the Camera 1 overlay.
- Checked: tsc, unit test, check-tracking-motion, screenshot of the
  synthetic ring (line along the shaft).

### 2026-11-08 — Claude — Handle-prism jaw tracking: core module (not wired in)

- Lance chose a triangular marker prism on the one moving handle (option A).
- New `src/jaw/handleHinge.ts` (+ tests): IDs 30–32 needle driver, 33–35
  forceps, 36–38 scissors; prism body from any face; hinge axis learned from
  closed/open captures; opening = twist about that axis (off-axis noise ignored).
- Next: detect IDs 30–38 in the decoders, wire into the Jaws tab with
  closed/open capture, synthetic 3D browser check, then Lance builds the prism.

### 2026-11-08 — Claude — Build 0.107: Jaw tracking switch in Jaws tab

- `src/ui/InstrumentCalibrationPanel.ts`: `data-jaw-enable` checkbox in the
  Jaws pane mirrors/drives the hidden `#ball-enable` in `src/tracking.ts`
  (label now `hidden`; tracking logic unchanged).
- Checked: tsc, check-marker-jaws, check-calibration-preview, and a
  one-off headless click test (switch toggles `#ball-enable`; old label hidden).

### 2026-11-08 — Claude — Build 0.106: revert jaw region reads to 0.98 cache

- `src/jaw/markerJawController.ts`: `cameraGray` frame cache restored
  (0.99 and 0.103 per-region reads measured slower on Lance's PC: 45 ms and
  28 ms vs ~8 ms).
- Checked: tsc, check-marker-jaws.

### 2026-11-08 — Claude — Build 0.105: no mono deltas between stereo samples

- `src/input/StereoFallback.ts`: when the stereo sample is unchanged, return
  the held stereo output (previously anchor + mono delta). The test that
  expected mono movement between samples now expects the hold (behaviour
  change, not a loosened limit).
- Evidence: Lance's 1:03 AM recording (0.101) replayed: stereo + RestLock
  under 0.1°/0.03 mm per frame, yet Lance saw definite jumping.
- Checked: StereoFallback tests, tsc. check-stereo-motion still fails as
  before (near step 0.93 vs >1).

### 2026-11-08 — Claude — Build 0.104: jaw tracking can be turned off

- `src/tracking.ts`: `markerJaws.update` runs only when `#ball-enable` is
  ticked; label now "Enable jaw tracking". `scripts/check-marker-jaws.mjs`
  ticks it.
- Checked: tsc, check-marker-jaws.

### 2026-11-08 — Claude — Build 0.103: GPU canvas for jaw region reads

- `src/jaw/markerJawController.ts`: crop canvas no longer uses
  `willReadFrequently`. 0.100 report: Jaw tracking 45 ms mean, loop 13 fps.
- Checked: tsc, check-marker-jaws (timing not measurable headless).
- Lance: new report; Jaw tracking row should be a few ms. If not, revert to
  the 0.98 full-frame cache (~9 ms) as the fallback.

### 2026-11-08 — Claude — Build 0.102: hold jaw opening during fast moves

- `src/jaw/stereoBallDistance.ts`: `ringSpeedSidesPerSecond`,
  `MAX_JAW_MOTION_SIDES_PER_S = 3` (+ test). `markerJawController.ts` skips
  jaw updates (holds last opening) above that ring speed.
- Checked: jaw tests, tsc, check-marker-jaws.
- Lance: fast closed-jaw moves should no longer flash open. If opening the
  jaws while moving feels delayed, the 3 sides/s limit can be raised.

### 2026-11-08 — Claude — Build 0.101: stereo rest lock

- New `src/input/RestLock.ts` (+ test): holds pose within 3° / 2.5 mm,
  blending 5% per update; applied to stereo poses only in `src/tracking.ts`.
- `src/input/StereoFallback.ts`: mono backup keeps the anchor position for
  jitter under 6 mm sideways / 40 mm depth (rotation still via `monoRotation`).
- Evidence: Lance's 0.100 rest recording replayed through
  `solveStereoRigPose`: 0.5–3.4° per-frame rotation wobble, corners 0.3–0.9 px sd.
- Checked: unit tests, tsc, check-tracking-motion. `check-stereo-motion`
  still fails as since 0.98 (near step 0.86 vs >1 required).
- Lance: is it steady at rest now? Does starting a move feel sticky?

### 2026-11-08 — Claude — Build 0.100: hold stereo rotation against mono noise

- `src/input/StereoFallback.ts`: `monoRotation` ignores single-camera
  rotation changes < 4° (noise) or > 30° (ambiguity flips). Test added.
- Checked: StereoFallback tests, tsc.
- **Known issue:** `check-stereo-motion` fails since 0.98 (near/far depth
  step under camera-1 fallback not reached within 1 s); 0.97 passed. Likely
  the 1 s discovery interval (`PredictiveDecodeSearch`). Not yet fixed.
- Lance: does the instrument still jump at rest in stereo?

### 2026-11-08 — Claude — Build 0.99: jaw reads only its search regions

- `src/jaw/markerJawController.ts`: `sample()` copies just the region from
  the video instead of caching a full-frame grayscale copy per camera (0.97
  report: Jaw tracking 9 ms mean, 30 ms p95).
- Checked: jaw unit tests, tsc, check-marker-jaws.
- Lance: new report; Jaw tracking row should drop to a few ms.

### 2026-11-08 — Claude — Build 0.98: discovery scans every 1 s while tracking

- `src/input/PredictiveDecodeSearch.ts`: `DISCOVERY_INTERVAL_MS=1000` (was
  350) when hints exist; test updated. `src/tracking.ts`: report shows the
  real jaw pattern and the new interval.
- Checked: PredictiveDecodeSearch test, tsc, check-tracking-motion,
  check-stereo-motion.
- Lance: new performance report; "Stereo pose/synchronization" rate should
  rise well above ~2/s. Follow-up not done: ease toward late stereo poses
  instead of snapping.

### 2026-11-08 — Claude — Build 0.97: keep stereo while tracking, throttle jaw

- `src/input/stereoRigPose.ts`: with a previous pose, accept a joint fit up
  to 5 px RMS / 10 px corner if within 10° and 15 mm of it; the per-face
  outlier cutoff now scales with the limit (unchanged 3.5 px when starting).
  New test in `stereoRigPose.test.ts`.
- `src/jaw/markerJawController.ts`: updates at most every 66 ms except while
  calibrating. `src/tracking.ts`: "Jaw tracking" perf row.
- Checked: stereo + jaw unit tests, tsc, check-marker-jaws, check-stereo-motion.
- Lance: export a new performance report; compare "fit error" dropouts and
  the Jaw tracking row. Next proposed: rest lock for rotation jitter.

Newest first. Template:

```
### 2026-11-08 — Claude Code — Jaw performance; workspace capture waits for the move (build 0.96)
- Changed: `findBrightBalls` takes a precomputed `mask` and `sizeFactors`
  (one pass), no per-pixel allocation; `maskFromQuads` rasterizes marker
  outlines per region; `JawFrame.ignoreQuads`; controller caches one gray
  frame per camera per frame and throttles stereo ball search (66 ms).
  `StereoWorkspacePanel`: steps wait for ≥ 50 mm from neutral, then 15
  samples within 3 mm.
- Checked: jaw tests (30); benchmark masked 3-size search 20 → 1.7 ms;
  marker-jaws (setting 7 mm) and Lab jaw checks pass; panel exercised in
  the browser with simulated positions (1 cm move not accepted).
- Lance to test: page responsiveness with jaw tracking on; workspace steps.

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
