# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** none
- **Needs Lance to test by hand:**
  - Solid white needle-driver ball mode (commit `7f44662`): not yet tried
    with a real camera.
- **Known issues:**
  - `FreeKnotTechniques.test.ts` "retains a double surgeon first throw…"
    passes on Node 24 but fails on Node 22 (thread point moves 0.042 vs a
    0.034 limit). The result sits close to its threshold and is sensitive to
    floating-point differences. Use Node 24; a more robust fix is open.
  - Stereo tracking is unreliable in practice; single camera is used.
  - `scripts/check-dual-camera-fit.mjs` fails at 1024×768 (camera previews
    not stacked / wrong proportions). Already failing before 2026-11-07
    changes (verified on `7f44662`); not yet investigated.
  - `src/tracking.ts` (~156 KB) and `src/main.ts` (~57 KB) are monolithic and
    are the most likely place for merge conflicts.
- **Next up (proposed, not started):**
  1. Continue splitting `src/tracking.ts` into tested modules. Camera
     devices/controls are done; good next candidates are saved settings
     (localStorage), the stereo calibration import/export, and the jaw-ball
     detection loop.
  2. Add a code formatter in one dedicated commit (agree with Lance first).
  3. Make the needle-driver solid-white path solid once Lance has tested it.
  4. When the OV9281 cameras arrive (monochrome, global shutter, 1280×800 @
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
