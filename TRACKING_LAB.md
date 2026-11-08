# Tracking Lab

Open **Tracking Lab** beside **Simulator** in the main header.

1. Click **Record**, move the instruments, then **Stop** (or wait for the default
   30-second automatic stop). Existing selected live cameras and tracking settings
   are reused. In two-camera mode an available second camera is selected if needed.
2. Click **Replay**, or use a recording's library Replay button.
3. Pause, drag the timeline, step backward/forward, change speed, or toggle overlays.
   A step advances one camera-frame event; the two cameras retain independent timing.
4. Rename recordings in the library. **Export** downloads one `.suturetrack` file;
   **Import recording** restores that file in another browser/profile/computer.
5. For jitter, pause and mark **stationary start**, advance to the end of a period
   when the physical instrument was stationary, then mark **stationary end**.

The existing Simulator tab, camera setup, calibration and instrument controls remain
available. Practice physics/rendering pause while the Lab is visible; live tracking
continues. Replay owns a separate tracker context and cannot move simulator tools,
change live calibration, or request webcam access. No backend, account or recording
service is used. Browser data can be evicted/cleared: export important sessions.

## Recording and storage

`src/trackingLab/recorder.ts` captures newly presented images at each camera's actual
resolution and cadence. Each camera has at most one asynchronous bitmap/worker JPEG
encode/IndexedDB write in flight. JPEG quality is 0.94; there is no resize or fixed
camera FPS. Backpressure drops, rather than queues, extra frames and counts them.
The existing live video stream is mirrored; another hardware stream is not opened
for recording. OffscreenCanvas workers perform compression off the tracking thread.

Recordings default to 30 seconds, with 5/60-second options and manual stopping.
Images are written immediately to IndexedDB (`suturehero-tracking-lab`, schema 1),
with separate session metadata. Recording stops at 256 MiB of compressed images,
20,000 frames, or 80% of estimated remaining browser storage, whichever comes first.
Quota/encoder failures and disconnection of all sources produce a partial session;
other connected cameras can continue when one camera disconnects. An interrupted
session is recovered from its saved image records when the Lab next loads.

Frames contain camera index, global sequence index, independent fractional
millisecond timestamp, dimensions, compressed image and available live diagnostics.
Frame `at` is relative to session `monotonicStartMs`, measured using
`performance.now()`. `timeOrigin` preserves that clock's epoch relationship. Session
metadata includes device identity/settings, start-time controls, active instrument,
current instrument profiles (including unsaved changes), mono depth settings,
stereo calibration/enablement, jaw assignments and capture algorithm revision.

Configuration is a snapshot at recording start: do not change camera calibration,
mode or assignments during a capture if you want a single consistent replay setup.

## Replay and isolation

`runtime.ts` supplies an optional image/device/frame-clock interface. With no
injection, live behavior uses the same video elements and real media devices as
before. `tracking.ts` exposes a narrow `trackingLabBridge`; both paths call the
same marker decoder/flow workers, pose and prism solvers, ball trackers, stereo
fusion/fallback, smoothing, prediction and calibration code. The pinned existing
js-aruco2 2.0.0 files are bundled with the app, so detectors need no external CDN.

`RecordedFrameProcessor` creates `tracking-engine.html`, an isolated same-origin
browsing context. Its own workers, filters, calibration singleton and private
in-memory settings are initialized from the recording. Canvas-backed virtual
camera inputs provide recorded pixels and dimensions directly to shared detector
and jaw image reads. The input clock is advanced to each original frame timestamp;
flow and decoder search-state clocks receive the same source timestamps. Offline
flow/decode jobs run in dispatch order so worker speed cannot change replay state. Processing waits for pending marker,
flow and striped-reacquisition jobs before advancing. Recorded observations are
never used as replay results. Simulator pose/status/jaw publication is disabled.

Replay sorts by timestamp, original sequence and camera index. Backward seeking/restarting
recreates the whole context, including workers, and processes preceding images;
forward seeking processes all intervening images. Stop cancels at a frame boundary.
Only the two displayed images and the current source/worker images are decoded;
recording image Blobs remain compressed and disk-backed where supported by the
browser. Replay result maps are separate from the recorded observations, providing
a place for future algorithm-run comparisons without changing the file format.

## Overlays and measurements

Green indicates a current detection. Gray dashed outlines indicate held/predicted
positions or searching, never a valid current ball lock. Marker corners/IDs,
orientation axes and ball identity/state are shown when available. Source frame
IDs prevent an old ball detection from becoming green on a new unexamined image.
Missing confidence is explicitly **Unavailable**, not an inferred probability.
The new jaw tracker exposes its actual share of measurable moving balls seen as
**jaw visibility confidence**; this is distinct from ArUco confidence. Its existing
camera-1-only limitation is reported as Unavailable for Camera 2 ball tracking.
Classic and marker-relative white-ball jaw algorithms and saved models are reused;
the Lab adds no new ball-detection algorithm.

Diagnostics report measured recorded camera FPS, reprocessed frame coverage,
marker/ball detection counts and percentages, marker loss/reacquisition, and jaw
pair coverage/loss/reacquisition. Frame coverage includes source frames where a
throttled detector did not run; skipped jaw scans do not create pair-loss events.
Reacquisition is measured from the first failed observation to the next success.
Stationary position jitter is RMS distance from the mean in **practice units**;
orientation jitter is RMS angular displacement from the interval's first pose.
No absolute accuracy or ground-truth error is claimed.

## Limits

- Fresh replay starts with empty tracking history. Initial acquisition and neutral
  reference are established from the beginning of the recording; pre-recording
  smoothing/neutral session history and original worker latency are not restored.
- Original image timing/gaps are retained, but offline jobs are serialized for
  repeatability. Playback can run slower than selected speed on expensive frames.
  Backward seeks can take time because they replay all preceding images.
- Results can change with future algorithms and browser numerical/encoding details.
  JPEG is high quality, not lossless. Dropped capture frames cannot be recovered.
- IndexedDB quota/retention is browser-specific. Import validates version, sizes,
  dimensions, frame IDs and timestamps. The version-1 manifest is bounded at 32 MiB.
- Camera permissions are needed for recording live webcams, never for replay.
  Modern browser Worker, ImageBitmap, OffscreenCanvas and IndexedDB support is needed.

## Verification

- `npm test`: existing full suite plus Lab tests.
- `npx vitest run src/trackingLab src/input`: focused recording, format, timeline,
  timestamp, frame ordering, cancellation/reset, missing frames, quota handling,
  current-frame isolation, shared source and existing tracking regression tests.
- `npm run build`: TypeScript check and all production entry points, including engine.
- `node scripts/check-tracking-lab-layout.mjs`: full-sized side-by-side workspace,
  keyboard isolation and tab switching without camera permission requests.
- `node scripts/check-tracking-lab.mjs`: synthetic webcam → real JPEG/IndexedDB →
  actual marker detector replay, no hardware access, isolated settings/poses,
  deterministic metrics, seek/step, rename, UI export/import/delete, tab restoration.
- `SUTURE_LAB_STEREO=1 SUTURE_LAB_BALLS=1 node scripts/check-tracking-lab.mjs`:
  independently timed 9/7 FPS sources, metric-stereo configuration, striped-ball
  identification, occlusion and reacquisition through the actual pipeline.
- `SUTURE_TEST_URL=http://127.0.0.1:5174/ SUTURE_MARKER_JAW_LAB=1 node scripts/check-marker-jaws.mjs`:
  reuses the existing calibrated 3D white-ball fixture to check live behavior and
  recorded-image replay through the new controller with saved detections erased.
- Set `SUTURE_TEST_URL` (or `SUTURE_LAB_URL`) to test a production preview URL instead of the default Vite
  URL. Existing `check-stereo-rig-faces.mjs` and `check-striped-lifecycle.mjs` check
  calibrated different-face stereo and existing live jaw behavior separately.

Synthetic fixtures use the existing OpenCV-generated marker image and need no
physical webcams. Browser scripts use system Chromium through Playwright.
