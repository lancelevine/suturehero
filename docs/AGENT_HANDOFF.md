# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** Claude — autonomous work while Lance is away (to 2026-11-29 20:00 UTC):
  shrinking src/tracking.ts and src/main.ts into tested modules, efficiency, graphics
  (Codex: please avoid those two files until then).
- **Knot engines (for Lance's comparison):** register engines in
  `KNOT_ENGINES` (`src/knot/engines.ts`); each must implement `KnotEngine`.
  Compare with `KNOT_TRIALS=1 npx vitest run src/knot/engineTrials.test.ts`
  (`KNOT_ENGINES=a,b` to pick; `KNOT_TRIALS=quick` for a short run).
  Current (full run 2026-11-26, build 0.219): claude 24/24 (default), codex 24/24, classic 23/24,
  claude-worker 22/24 and classic-worker 18/24 (experimental; neither seats the knot in the Demo,
  see 2026-11-27 log).
- **Needs Lance to test by hand:** `docs/HARDWARE_TEST_CHECKLIST.md` (everything since build
  0.205, in testing order). Older items were moved to `docs/archive/AGENT_HANDOFF-to-2026-11-14.md`
  on 2026-11-27 (several concern camera jaw tracking, removed in 0.205).
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
  - `src/tracking.ts` (~840 lines) and `src/main.ts` (~500 lines) are still the largest files
    (split further on 2026-11-27) and the most likely place for merge conflicts.
  - Stereo rest locks are not cleared by `resetTrackerPose` (kept as before in
    `RenderedPoseState`); camera 1 does not clear `decodeBusy` on stop, camera 2 does. Both
    unchanged; check with real cameras before changing.
  - The Demo fails below about 20 fps (a wrap is lost at 15 fps), on every engine.
- **Lance's decisions (2026-11-28):** see the log entry of that date (build order, forehand = right-to-left, landmark as a separate centred exercise, body-site sliders with presets that look like the body part, vessel count by circumference + spacing, phone camera below the scene).
- **Next up (proposed, not started):**
  3. Continue splitting `src/tracking.ts`: capture pipeline, rotation, camera 2 marker state,
     stereo pairing step, render-loop pose state and the 3D preview are done (2026-11-27); left
     are camera 1's frame handler (`detectFrame`), the depth step in `updateLiveTargets` and the
     rest of the render loop, which hold most of the live state (needs real-camera testing after).
  4. Add a code formatter in one dedicated commit (agree with Lance first).
  5. When the OV9281 cameras arrive: the OV9281 camera type (1280×800 @ 120
     fps) is chosen automatically by name (build 0.216); recalibrate and retest
     stereo with them. Needs real-camera testing by Lance.

## Log

### 2026-11-28 — Claude — Running stitch tie-off (build 0.266)

- New `src/gameplay/runningTieOff.ts` (+ test). `tieOffNote` in `src/main.ts` captures the running line's loop slack (from `lockNote`) and grades it when `session.freeKnot` becomes active. Note: `session.sandbox` reads false while a free knot is active, so these notes guard on the skin environment plus `sandbox || freeKnot.active`.
- `check-running-lock` now also ties off and expects the tie-off line (2/2 after the fix).
- Checked: unit tests, tsc, check-running-lock ×2, check-sandbox, check-free-tying, check-layout.
- Item 2 (locked running + tie-off) first versions done; continuing down the roadmap.

### 2026-11-28 — Claude — Lock loops drawn (build 0.265)

- New `src/scene/LockMarks.ts` (+ test): torus marker at each locked exit; `check-running-lock` asserts it.
- Checked: unit test, tsc, check-running-lock, check-sandbox, check-layout.

### 2026-11-28 — Claude — Locked running stitch (build 0.264)

- Lance chose item 2 (locked running stitch, running tie-off), then the rest of the roadmap.
- New `src/gameplay/runningLock.ts` (+ test): `RunningLockTracker` locks the newest pass when the needle tip, out of tissue with the thread through that pass, drops from >0.12 to <0.04 units above its exit within 0.15 units; `describeLocks` uses `FreeThreadGuide.loopSlackUnits()` for even/strangling locks. Wired as `lockNote` in `src/main.ts`.
- New browser check `scripts/check-running-lock.mjs` (locked and unlocked cases, 3/3), added to CI.
- Next: draw the thread through the loop at a lock; running tie-off.

### 2026-11-28 — Claude — Lance's answers; throws needed (build 0.263)

- Lance's answers: leave the knot worker as is (experimental); Microscope ×4 is enough; three good square throws are enough, flawed ones should require 4–5.
- `assessKnot` (`src/gameplay/stitchOutcome.ts`): needed throws = 3 + min(2, grannies + unseated); a flawed knot with enough throws is now secure. Tests added.
- Checked: gameplay + demo tests (173, Node 24), tsc, check-sandbox, check-free-tying, check-guided-thread.

### 2026-11-28 — Claude — Knot worker investigation (partial fix)

- Lance asked to fix `check-knot-worker` (fails 3/3: knot tied and locked, never seated, seat load 0).
- Fixed: `KnotHost` gave the model more time per call than it can simulate (it advances at most `MAX_TIME_STEPS`/120 s per call) for replayed backlog frames and long requests (old 8-slice cap), silently dropping physics time when the worker fell behind. Now every call is sliced to ≤1/60 s (`slicesFor`, test in `KnotHost.test.ts`). Did not by itself make the check pass.
- Findings: with identical instrument poses each frame, the worker host and the direct model never diverge and both tie 3/3 throws (probe, not committed). The main-thread `classic` engine passes the same browser check at the same 150 ms frames. So the worker failure comes from the main side seeing the knot state and corrections a frame late while the scripted hands work at the thread's reach limit (the existing note in `WorkerKnotEngine.test.ts` already says one frame decides whether a throw tightens there). Not resolved; options for Lance in the chat reply.

### 2026-11-28 — Claude — Browser check sweep (CI list)

- Added to `DEFAULT_CHECKS` in `scripts/ci-browser-checks.mjs`: `check-guided-thread`, `check-stereo-capture-quality` (3/3, ~45 s), `check-calibration-ui` (3/3 after fix, ~70 s). Through the CI runner locally: 3/3 passed.
- `check-calibration-ui` was failing at 390 px: the phone layout puts the camera panel below the scene (Lance's choice), so the check now scrolls to the feed on phones before requiring it to fit on screen. The fit limit itself is unchanged.
- Left out: `check-knot` (passes 3/3 but ~4 min each), `check-knot-worker` (fails 3/3; the worker engines are experimental and do not seat the knot, see 2026-11-27), `check-demo` (~12 min), `check-depth-stability` (flaky).

### 2026-11-28 — Claude — Moist tissue look (build 0.262)

- `src/tissue/TissuePatch.ts`: layer materials are now `MeshPhysicalMaterial` (clear coat 0.55 on dermis/fat, sheen 0.35 reddish on epidermis).
- Checked: tissue/scene/environment tests (110, Node 24), tsc, screenshot, check-layout, check-sandbox, check-guided-thread, check-profiler.
- Lance: check frame rate on your machine; revert to MeshStandardMaterial if it costs too much.

### 2026-11-28 — Claude — Loupe and microscope view (build 0.261)

- New `src/scene/magnification.ts` (+ test): zoom steps 1 / 2.5 / 4 applied to `view.camera.zoom`; `.eyepiece-view` vignette in `src/ui/theme.css`. Button in `.workspace-view-tools` (`src/main.ts`). Also hid Fresh needle / wear note outside skin.
- Checked: unit test, tsc, browser screenshot (vignette visible), check-layout, check-sandbox, check-practice-setup, check-guided-thread.
- Lance: is ×4 enough for the microscope, and is the vignette helpful?

### 2026-11-28 — Claude — Highlight clips (build 0.260)

- New `src/ui/clipRecorder.ts` (+ test): `canvas.captureStream(30)` + `MediaRecorder` for 15 s, downloaded as WebM; button disabled where unsupported. Mounted in `.workspace-view-tools` from `src/main.ts`.
- Checked: unit test, tsc, browser (clip downloaded, 280 KB), check-layout, check-sandbox, check-practice-setup.

### 2026-11-28 — Claude — Site-tuned bite targets (build 0.259)

- New `src/gameplay/siteTargets.ts` (+ test): scales default bite targets by `SITE_BITE_SCALE`; applied in `SandboxSummaryPanel` target checks and export only, so the editable target inputs keep their stored values.
- Checked: unit + ui tests, tsc, check-sandbox, check-practice-setup, browser `?site=face` → "Bite 2.5–5 mm".
- Lance: please check the per-site bite ranges.

### 2026-11-28 — Claude — Tissue crush score (build 0.258)

- New `src/gameplay/crushScore.ts` (+ test): hold time with forceps openness ≤0.05 while `eversion.held`. Row in `src/ui/SkillAnalysisPanel.ts`; `crushShare` on `SkillReport`; sampled in `sampleSkill`.
- Checked: unit tests, tsc, check-sandbox, check-layout, check-hall-sensor.
- Lance: with the Hall-sensor forceps, hold the edge gently vs squeeze fully shut; the row should rise only for the squeeze. The 5% openness limit may need tuning to the sensor.

### 2026-11-28 — Claude — Bleeder complication (build 0.257)

- New `src/gameplay/bleeder.ts` (+ test). `#complications` toggle (`?complications=1`) in setup; `bleederNote` in `src/main.ts` starts the bleeder at the third pass's exit, grows a `bleeder-pool` mesh, stops after 3 s of closed forceps within reach.
- Checked: unit test, tsc, check-sandbox (also with `?complications=1`), check-practice-setup, check-layout, check-free-tying. The pool and pressure were not seen with real passes in the browser (faking passes breaks other readers).
- Lance: turn Complications on, make three passes, then press the bleeding exit with closed forceps.

### 2026-11-28 — Claude — Supermicrosurgery target (build 0.256)

- `MICRO_TARGETS.supermicro` in `src/environments/MicroTargets.ts` (outer .12 / inner .095 units = 0.6 mm at 2.5 mm/unit, top at the same height as the others, gap .2).
- Checked: environments/tissue/gameplay tests (237, Node 24), tsc, guided BV-1 microsurgery flow on `target=supermicro` (temporary copy of check-guided-thread), check-practice-setup, check-layout.

### 2026-11-28 — Claude — Exam mode (build 0.255)

- New `src/gameplay/examMode.ts` (+ test). `#exam-mode` button reloads with `?exercise=exam`; in exam the readout is only `examReadout(...)` and `idealPath` is hidden; Finish exam (or 10 min) shows `describeRubric`.
- Checked: unit + ui tests, tsc, browser (9:53 left → Finish → result), check-practice-setup, check-layout, check-sandbox, check-guided-thread.
- Not hidden yet: Sandbox summary panel, pass marks and Skill Analysis.

### 2026-11-28 — Claude — OSATS-style rubric (build 0.254)

- New `src/gameplay/osatsRubric.ts` (+ test): respect for tissue, time and motion, instrument handling, flow, each 1–5 from `SkillReport`. Shown as `<li class="osats-rubric">` in the Sandbox targets after the first pass. `exportSkillReport` in `src/main.ts` now carries the optional counts too.
- Checked: unit + ui tests, tsc, check-sandbox, check-layout, browser.
- Lance: please check the mapping against how you'd rate OSATS; the thresholds are my guesses.

### 2026-11-28 — Claude — Daily challenge (build 0.253)

- New `src/gameplay/dailyChallenge.ts` (+ test): FNV hash of the UTC day picks a `BODY_SITES` entry and 3–6 stitches; best seconds per day in `suturehero.dailyChallenge.v1`. `#daily-challenge` button (`src/ui/practicePageMarkup.ts`) reloads with `?site=…&exercise=daily&day=…`; `dailyNote` in `src/main.ts` shows progress (tied = `session.course.completed` outside the guided course).
- Checked: unit tests, ui tests, tsc, browser (button → Face, 3 stitches today), check-practice-setup, check-layout, check-sandbox.
- Lance: a shared leaderboard would need a server; say if you want one.

### 2026-11-28 — Claude — Next drill suggestion (build 0.252)

- New `src/gameplay/nextDrill.ts` (+ test): maps the first missed `checkTargets` result to a drill. Appended as an `<li class="next-drill">` after the targets in `src/ui/SandboxSummaryPanel.ts`.
- Checked: unit test, ui tests, tsc, check-sandbox, check-layout.

### 2026-11-28 — Claude — Braided silk suture (build 0.251)

- `SUTURES` in `src/setup/PracticeSetup.ts`: added `silk` (drag .972, bend .7, friction 1.45). Test now requires distinct colour/drag per material instead of exactly 3.
- Did not make secure-throw counts material-specific: it would regrade the default Prolene 3-throw knot (Demo and checks expect secure). Ask Lance whether monofilaments should need 4–5 throws.
- Checked: setup tests, tsc, `?suture=silk` loads without errors, check-practice-setup, check-free-tying, check-sandbox.

### 2026-11-28 — Claude — Edges that slide sideways (build 0.250)

- New `src/gameplay/edgeShear.ts` (+ test): shift = (entryEdge − exitEdge)/2 mm, flagged above 0.75 mm. Joined onto the `.sandbox-bites` line in `src/ui/SandboxSummaryPanel.ts`.
- Checked: unit test, tsc, check-sandbox, check-layout.
- Lance: take a bite much wider on one side in Sandbox; the summary should name it.

### 2026-11-28 — Claude — First throws that slip back (build 0.249)

- `assessKnot` (`src/gameplay/stitchOutcome.ts`) takes `woundTension`; at ≥1.2 a single first throw (not a held-post sliding start) adds a note and caps security at "may slip". `PracticeSession` passes the body-site tension for skin. Test added.
- Also: `check-demo` passed on build 0.248 (needle skid) locally.
- Checked: gameplay + demo tests (162, Node 24), tsc, check-sandbox, check-free-tying, check-guided-thread, check-practice-setup.
- Lance: on Back, tie with a single first throw (flagged) and with a surgeon's start (secure).

### 2026-11-28 — Claude — Needles that skid (build 0.248)

- New `src/tissue/needleSkid.ts` (+ test). `FreeNeedlePass.engage` refuses entries under 20° (sets `rejection = SKID_MESSAGE`, counts `skidCount`); `sandboxTitle` in `src/ui/practiceMessages.ts` shows it (previously every rejection read as torn skin).
- Checked: tissue + gameplay + demo unit tests (227, Node 24), practiceMessages test, tsc, check-sandbox, check-free-tying, check-guided-thread, check-layout. `check-demo` (12 min) not run; CI runs the fast set.
- Lance: try a very flat entry; it should skid, then a steeper one should bite.

### 2026-11-28 — Claude — Needle holes that last (build 0.247)

- New `src/tissue/punctureHoles.ts` (+ test). `FreeNeedlePass.holes()` (passes, torn, and new `undoneHoles` kept through undo). `PracticeSession.nearbyHoles`/`holeStrength` scale `CUT_TENSION` in the cut-through rule; `src/main.ts` shows the count with the needle-wear note.
- Checked: tissue + gameplay tests (221, Node 24), demo unit test, tsc, check-sandbox, check-free-tying, check-layout.
- Lance: undo and redo a bite in the same place a few times, then pull: it should cut through sooner.

### 2026-11-28 — Claude — Wrap placement (build 0.246)

- New `src/gameplay/wrapPlacement.ts` (+ test): wraps from `freeKnot.winding`, far wraps by driver-tip distance to the stitch midpoint, slips when winding drops ≥0.5 turn below 1 without the driver holding the short tail. Wired as `wrapNote` in `src/main.ts` (skin, knot active; reset per seated throw).
- Checked: unit test, tsc, check-free-tying, check-guided-thread, check-sandbox, check-layout, browser with stubbed winding.
- Lance: make a wrap close to the wound and one far away; let one slide off the driver tip.

### 2026-11-28 — Claude — Pull direction when tying (build 0.245)

- New `src/gameplay/pullDirection.ts` (+ test): tip-to-tip line classed across / along the wound (>35° off x) / upward (>45° rise). `src/main.ts` samples it when `freeKnot.seatedThrows` rises (skin only) and shows it while the knot is active.
- Checked: unit test, tsc, check-free-tying, check-guided-thread, check-sandbox, check-layout, browser (stubbed seated throw → "Throw pull: 1/1 straight across").
- Lance: tie a knot pulling along the wound on one throw; that throw should be flagged.

### 2026-11-28 — Claude — Stitch density by tension (build 0.244)

- New `src/gameplay/stitchDensity.ts` (+ test): pull = site tension × (1 + 0.5 mid-wound falloff); suggested spacing 7 mm / pull, ±35%. `stitchZ` added to the Sandbox summary (optional field); line appended to the spacing line in `src/ui/SandboxSummaryPanel.ts`.
- Checked: gameplay + ui tests (244, Node 24), tsc, check-sandbox, check-layout, check-practice-setup.
- Lance: on the Back preset, tie evenly spaced stitches; the middle gaps should read too wide.

### 2026-11-28 — Claude — Rotate, don't push (build 0.243)

- New `src/gameplay/rotationScore.ts` (+ test): in-tissue time with vs without `freePass.forcingWarning`. Row in `src/ui/SkillAnalysisPanel.ts`, `rotatingShare` on `SkillReport`, sampled in `sampleSkill` (`src/main.ts`).
- Checked: unit tests, tsc, check-sandbox, check-layout.
- Lance: with the camera driver, compare a smooth wrist turn to a straight push; the row should drop for the push.

### 2026-11-28 — Claude — Dead space check (build 0.242)

- New `src/gameplay/deadSpace.ts` (+ test): a pass whose deepest point stays more than 35% of the dermis thickness above the dermis floor is flagged. Appended to the Sandbox bite-depth line (`src/ui/SandboxSummaryPanel.ts`).
- Checked: unit test, tsc, check-sandbox, check-layout.
- Lance: make one shallow and one deep pass in Sandbox; only the shallow one should be named.

### 2026-11-28 — Claude — Needle dulling (build 0.241)

- New `src/gameplay/needleWear.ts` (+ test). `PracticeSession.needleWear` multiplies the free-pass tear limits by `tearFactor`; `src/main.ts` adds wear per new free pass and a "Fresh needle" button (Sandbox only).
- Checked: gameplay + demo + practicePanels tests (157, Node 24), tsc, check-sandbox, check-layout, check-free-tying, browser run of readout and button.
- Lance: do 8+ passes in Sandbox; the needle should read dull and tear out a bit sooner; Fresh needle should clear it.

### 2026-11-28 — Claude — Wound ends check (build 0.240)

- `src/gameplay/gapScan.ts`: `woundEndOpenings` / `describeWoundEnds` (+ tests) report open spans that reach either end of `WOUND_ENDS`. Added to `StitchCourse.closureReview`.
- Checked: gameplay unit tests (149, Node 24), tsc, check-guided-thread, check-sandbox.
- Lance: finish a closure leaving one end unstitched and check the review names that end.

### 2026-11-28 — Claude — Sawing pulls in Skill Analysis (build 0.239)

- New `src/gameplay/sawingPulls.ts` (+ test): counts episodes with free-thread tension above 1.35 (same as `PracticeSession.CUT_TENSION`) for ≥0.1 s while threaded. Row added in `src/ui/SkillAnalysisPanel.ts`; `sawingPulls` on `SkillReport`; sampled in `src/main.ts` `sampleSkill`.
- Checked: unit tests, tsc, check-sandbox, check-free-tying, check-layout.
- Lance: in Sandbox, yank the thread through a pass and check the count rises; gentle pulls should not count.

### 2026-11-28 — Claude — Safe vessel flip (build 0.238)

- New `src/gameplay/flipCheck.ts` (+ test): `flipBlocker` refuses a vessel turn while the needle is in the wall (pass phase `passing`), thread is through an untied bite (`complete`) or the forceps hold the wall. Wired into the Turn/Flip buttons in `src/main.ts`; "Save stitch & turn" is unchanged.
- Checked: unit test, tsc, browser (idle flip turns; flip mid-pass refused with warning), check-practice-setup, check-guided-thread, check-layout.
- Lance: try Flip mid-bite and after saving a stitch.

### 2026-11-28 — Claude — Vessel grasp check (build 0.237)

- New `src/gameplay/vesselGrasp.ts` (+ test): forceps close on the vessel classed as adventitia / lumen counterpressure / full-wall pinch by the jaw tip's distance from the vessel axis. Wired in `src/main.ts` (per frame in microsurgery, not nerve; shown first in the instruction line).
- Checked: unit test, tsc, browser run (jaw in wall → pinch flagged; jaw on adventitia → good), check-practice-setup, check-guided-thread, check-layout.
- Lance: grab the vessel wall with the forceps on purpose, then the adventitia, and see whether the readout agrees.

### 2026-11-28 — Claude — Microsurgical bite geometry (build 0.236)

- New `src/gameplay/vesselBite.ts` (+ test): bite distance from the edge as a multiple of wall thickness, good at 1.5–2.5× with sides within 20%. Wired in `src/main.ts` (saved on "Save stitch & turn", shown in the vessel instruction line).
- Checked: unit test, tsc, browser run ("Bites: 1/1 at ~2× wall"), check-practice-setup, check-guided-thread, check-layout, check-sandbox.
- Lance: on the microsurgery target, save a few stitches and see if the bite readout matches what you'd judge by eye.

### 2026-11-28 — Claude: lumen narrowing score (roadmap)
- New `src/gameplay/lumenNarrowing.ts` (+test): 5% base + 60 × dilation shortfall below 110% + 3 per extra stitch + 8 per inverted stitch, capped 90; ≤ 20% "patent". Weights are my practice estimates (Lance to adjust). Shown at the start of the vessel line once the suggested count is saved. Checked: tsc, test, check-practice-setup.

### 2026-11-28 — Claude: vessel dilation step (roadmap)
- New `src/gameplay/vesselDilation.ts` (+test): 5% steps, good 110–130%, intima torn past 135% (sticky until the target is switched). `ArteryTissue.setDilation` scales both lumens (capped inside the outer wall). `src/main.ts`: "Dilate ends" button (vessels only), reset on environment switch, line in the readout.
- Checked: tsc, test, browser (120% ✓ after 4 presses, screenshot), check-practice-setup, check-guided-thread, check-layout.

### 2026-11-28 — Claude: vessel twist check (roadmap)
- `ArteryTissue`: dark stripe along the top of each vessel end (not nerves); `setFascicleTwist` also turns the right stripe. `src/main.ts`: starting twist for every microsurgery target, buttons renamed "Turn right end ±10°", `describeVesselTwist` (+test) for vessels. "Plan stitches" hidden in microsurgery (also at load).
- Checked: tsc, test, screenshot, check-practice-setup, check-guided-thread, check-layout.

### 2026-11-28 — Claude: pulley stitch recognition
- `stitchPatterns.ts`: same-side pass pair within 10 mm with asymmetric bites (far ≥ 1.5× near) → pulley, graded on far-near then near-far order (+test); checked before figure-of-eight. Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: figure-of-eight recognition
- `stitchPatterns.ts`: pairs of same-side crossing passes 3–10 mm apart (not part of a ≥ 3 running run) → figure-of-eight, graded on matching bites (+test). Purse-string not started (needs a round defect). Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: taper vs cutting point in skin (roadmap needle type)
- `PracticeSession`: `TAPER_IN_SKIN_TEAR_FACTOR` 0.85 on the free-pass tear limits for taper needles in skin; the readout's tear text uses the same factor. Checked: tsc, PracticeSession tests (Node 24), check-sandbox. Default trainer needle (cutting) unchanged.

### 2026-11-28 — Claude: endurance run (roadmap)
- New `src/gameplay/endurance.ts` (+test): passes toward 20; after 10, mean symmetry of the first vs last five (±0.2 mm = steady). Setup button `#endurance-exercise` (`?exercise=endurance`), line leads the instruction readout. Checked: tsc, test, browser (line, no console errors), check-practice-setup, check-sandbox, check-layout.

### 2026-11-28 — Claude: replay timeline with mistakes (roadmap self-review replay)
- New `src/ui/replayTimeline.ts` (+test): `MistakeLog` (30 s) and a timeline bar (cursor + red ticks). `ReplayBuffer.window` / `ReplayController.window` expose the recorded window. `src/main.ts` logs tears, tip collisions, blind exits, tip regrasps, air knots and snapped sutures on the replay clock (`time/1000`) and updates the bar each frame.
- Checked: tsc, replayTimeline + ReplayController tests, browser (bar visible during replay, cursor moves, no console errors), check-sandbox, check-layout.

### 2026-11-28 — Claude: blanching over tight stitches
- `TissueTensionView`: stitches at or above HIGH_TENSION also get a pale radial patch (test updated). Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: blood at punctures (roadmap lifelike rendering)
- `src/scene/freePassMarks.ts`: a flattened glossy dark-red bead at each entry/exit (shared geometry/material). Test updated for the extra children (count and finding the entry marker by name). Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: skills in the session export (roadmap)
- `SandboxSource.skillReport` (optional); `src/main.ts` passes the Skill Analysis report (without path/speed arrays) via `exportSkillReport`. `scripts/check-sandbox.mjs` now asserts `json.skills.seconds`. Checked: tsc, check-sandbox, no console errors on load.

### 2026-11-28 — Claude: guided first run (roadmap)
- New `src/ui/firstRun.ts` (+test): four-step card in `#viewport` (camera → calibrate → `#begin-pass` → analysis), `suturehero.firstRun.v1`; skipped when `navigator.webdriver` (so browser checks are unaffected). Styles in theme.css.
- Checked: tsc, test, screenshot with webdriver overridden (card, Next advances), check-sandbox, check-layout, check-practice-setup.

### 2026-11-28 — Claude: skill tiers (roadmap)
- New `src/gameplay/skillTiers.ts` (+test): gold/silver/bronze cut-offs for Smoothness (0.9/0.8/0.6), Accuracy (0.5/1/1.5 mm), Jaws control (0.9/0.8/0.6), Tremor (0.05/0.1/0.2 mm); badges in the Skill Analysis rows, styled in `theme.css`. Unlocks deliberately not added. Checked: tsc, tests, check-sandbox.

### 2026-11-28 — Claude: plan vs actual (roadmap)
- New `src/gameplay/planVsActual.ts` (+test) and `src/scene/PlanMarks.ts`: planned spots along the wound (click on the skin while "Plan stitches" is on; raycast on the tissue, |x| < 0.8), matched greedily to completed passes within 1 mm. "Clear plan" button. Line leads the instruction readout. Plan is per page load (not saved).
- Checked: tsc, test, browser (click adds a ring and the line, no console errors), check-sandbox, check-layout. Full CI browser set also passed locally (41/41) before this item.

### 2026-11-28 — Claude: personal bests (roadmap "Timed challenges")
- New `src/gameplay/personalBest.ts` (+test), `suturehero.personalBests.v1`; `practiceHud` takes `bestSeconds` for the card title. `src/main.ts` records once per completion (sandbox / course / micro-<target>). Note: the block must sit above `mountPracticeHud` (the HUD renders on mount; placed after, it threw and the page's catch hid it — caught in a browser check of the card title).
- Checked: tsc, personalBest + practiceHud tests, browser (card title, no console errors), check-sandbox, check-layout, check-practice-setup.

### 2026-11-28 — Claude: fading guide (roadmap "Needle arc guide")
- `guideConsistency` + `IdealSuturePath.setConsistency` (+test): share of the last 5 passes within 90 ± 10° entry and ≤ 10° off square; the line's opacity scales down to 20%. Checked: tsc, test, check-sandbox, check-layout.

### 2026-11-28 — Claude: suture cutting check (roadmap)
- New `src/gameplay/tailLength.ts` (+test): tail = (cut − (minimumCut − 3)) × rest length, graded 3–10 mm. `src/main.ts` appends it to the cut message (messages still start with the engine's text, which check-guided-thread waits for). Checked: tsc, test, check-free-tying, check-knot, check-guided-thread.

### 2026-11-28 — Claude: sound cues (roadmap)
- New `src/ui/sound.ts` (+test): WebAudio-synthesized pop / chime / tug, rate-limited, on by default, `suturehero.sound.v1`. `src/main.ts`: "Sound on/off" view button; cues on new passes, kept stitches (course or vessel), and the first frame a strand goes "excessive". Timer tick deliberately left out.
- Checked: tsc, test, check-sandbox, check-layout. Not heard (sandbox has no audio output); Lance to listen.

### 2026-11-28 — Claude: economy of motion, idle time (roadmap)
- `idleSeconds` in `src/gameplay/skillAnalysis.ts` (+test): time below `MOVING_SPEED_MM_S`; Skill Analysis "Idle time" (green under 30% of the session). Checked: tsc, tests, check-sandbox.

### 2026-11-28 — Claude: live tremor meter (roadmap)
- `tremorMm` in `src/gameplay/skillAnalysis.ts` (+test): RMS of each tip sample from the midpoint of its neighbours over the last 5 s; Skill Analysis "Tremor" (green ≤ 0.1 mm, `TREMOR_GOOD_MM`). Checked: tsc, tests, check-sandbox. Needs camera tracking to mean much (Lance).

### 2026-11-28 — Claude: needle loading check (roadmap)
- `LoadingCheck` in `src/suture/gripPosition.ts` (+test): new driver grips outside the tissue, good within 2/3 ± 0.12 of the needle from the tip. Skill Analysis "Needle loading". Checked: tsc, tests, check-sandbox.

### 2026-11-28 — Claude: fix CI failure from the phone layout
- Deploy runs failed `check-tracking-lab-scroll` (Lab must scroll inside one screen at 390×844); the phone "page scrolls" override now skips `.tracking-lab-active`. Checked: check-tracking-lab-scroll, check-layout, phone layout still camera-below-scene.

### 2026-11-28 — Claude: unequal edges exercise (big build #4, part)
- New `src/gameplay/unequalEdges.ts` (+test): per gap, long-edge (right) step / short-edge step vs 1.25 ± 0.15. `src/scene/UnequalEdgeMarks.ts`: guide dots. Setup button `#unequal-exercise` (`?exercise=unequal`), line leads the instruction readout. Wound geometry not changed (approach avoids the per-side tissue refactor).
- Checked: tsc, test, screenshot, check-practice-setup, check-sandbox, check-layout.

### 2026-11-28 — Claude: vein and diseased-artery targets (big build #7)
- `src/environments/MicroTargets.ts`: `vein` (thin wall 0.42/0.38) and `diseased-artery` (inner radius 0.3, plaque colours) targets. `ArteryTissue`: plaque nodules on the diseased lumen; the vein root flattens to 62% height unless `eversion.held` (scale about the vessel-frame pivot). `src/main.ts`: coaching line per target.
- Limitations: needle-pass physics use the round profile (a flattened vein is visual only); separated intima not detected.
- Checked: tsc, MicroTargets + practiceMessages tests, screenshots (vein, diseased artery), browser (vein scale 0.62 when not held), check-practice-setup, check-guided-thread, check-layout.
- Big-build list status: 1 running loops (tension hold done; locked/tie-off need loop topology), 2 breaking strength done, 3 tissue heatmap done, 4–5 edges thickness/length + corner stitch need the per-side tissue refactor (flagged), 6 nerve done, 7 vein/diseased done.

### 2026-11-28 — Claude: nerve repair (big build #6; #4–5 flagged above)
- New `src/gameplay/nerveAlignment.ts` (+test): random starting twist 12–30° either way, aligned within 5°. `ArteryTissue.setFascicleTwist` rotates the right end's fascicle meshes; `src/main.ts` sets a new twist on each switch to the nerve target, adds ±10° view buttons and leads the instruction line with the alignment; clamp hidden for nerves.
- Checked: tsc, test, browser (18° → 48° after +30°, screenshot, no errors), check-practice-setup, check-guided-thread, check-layout.
- Next: vein and diseased-artery modes.

### 2026-11-28 — Claude: flag — edges of different thickness / unequal length need a tissue-model refactor
- The skin surface and layer heights are global constants (`TISSUE_LAYERS`, used in ~23 places: pass physics, thread surface, eversion, cross-section, scoring). A thick flap against thin skin needs per-side layer bounds (functions of x), and unequal edge length needs a non-straight wound. Multi-hour, high-risk; postponed until after nerve repair and vessel modes unless Lance wants it first.

### 2026-11-28 — Claude: tissue tension heatmap (big build #3)
- New `src/scene/TissueTensionView.ts` (+test): per tied skin stitch a radial glow on the skin; tension = (initialGap / standard gap) × closure, green ≤ 0.8, red ≥ 1.3. Shown in skin practice for `course.tissueSites` (course and Sandbox). Normal blending (additive washed out on light skin).
- Checked: tsc, test, screenshot with three forced sites (green/amber/red), check-sandbox, check-guided-thread, check-layout.
- Next big build: edges of different thickness / unequal length.

### 2026-11-28 — Claude: suture breaking strength (big build #2); locked/tie-off deferred
- New `src/gameplay/sutureStrength.ts` (+test): sizes 3-0/4-0/5-0/6-0 with relative breaking points on the thread model's pull demand (1.01/0.85/0.7/0.55), snap after 0.15 s over. Default 3-0 (never snaps), so existing exercises and the Demo are unchanged. `src/main.ts`: Setup "Size" (`?size=`), per-strand `BreakMonitor`, snap = `freeKnot.cut` at 60% along the strand, peak-pull gauge in the instruction line while tying.
- Locked running stitch and running tie-off not started: they need loop topology in the thread model (noted in ROADMAP).
- Checked: tsc, test, page load with `?size=6-0` (no errors), check-free-tying, check-knot, check-sandbox. Snapping not seen in a browser yet (needs a hard pull with a fine size).

### 2026-11-28 — Claude: tension hold on running stitches (big build #1, step 1)
- `src/suture/FreeThreadGuide.ts`: per-loop extra slack (segments) for every pass but the newest; with a time step it grows 0.6/s (max 3) while the thread is not taut and shrinks 3/s when tension ≥ 0.97; loose-span cost includes it. `loopSlackUnits()` exposes it (+test). Calls without `dt` are unchanged.
- New `src/gameplay/tensionHold.ts` (+test): slack loops over 2 mm named in the Sandbox instruction line.
- Checked: tsc, FreeThreadGuide + tensionHold tests (Node 24), check-sandbox, check-free-tying, check-guided-thread, freeKnotDemo unit test.
- Next: locked running stitch and running tie-off.

### 2026-11-28 — Claude: body sites with sliders and presets (Lance #4)
- New `src/environments/bodySites.ts` (+tests): presets (forearm, face, scalp, back of hand, back) → thickness / toughness / tension sliders (0.5–2×) → dermalBottom, tear limits, wound gap; plus a skin look. `PracticeSetup.resolveSetup` uses `?site=…&thick=&tough=&tension=` over the skin type (`SkinProfile` type). `PracticeSession` uses `skin.gap`. `skinSurface(look)` (cached per look; the default look is unchanged) adds tone, pores, creases, freckles and hair stubs. Setup select `#body-site` + sliders; changes reload the practice like other setup choices.
- Checked: tsc, bodySites + PracticeSetup tests, screenshots (scalp, face, hand; gaps 0.11 / 0.07 / 0.09), check-practice-setup, check-sandbox, check-layout, check-guided-thread.

### 2026-11-28 — Claude: landmark alignment exercise (Lance #3)
- New `src/gameplay/landmark.ts` (+test) and `src/scene/LandmarkLine.ts`: centred red landmark line; first stitch (first course stitch, else first completed Sandbox pass) graded on mm off it, aligned within 1 mm. Setup button `#landmark-exercise` (skin only), kept in the URL as `?exercise=landmark`; result leads the instruction line.
- Checked: tsc, test, screenshot, check-practice-setup, check-sandbox, check-layout.

### 2026-11-28 — Claude: vessel stitch count by circumference (Lance #6)
- New `src/gameplay/vesselStitchCount.ts` (+tests): suggested = round(8 × diameter mm), min 4; spacing from the vessel turn angle at each save (even within 25% of the even gap). `src/main.ts`: saved angles, turn step 360°/suggested, HUD micro goal, instruction line. `practiceHud` takes `micro.goal`.
- Note: with MICRO_MM_PER_UNIT 2.5 the default artery is 2.0 mm (16 stitches), the small artery 1.25 mm (10).
- Checked: tsc, tests, browser (HUD 1/16, line text), check-practice-setup, check-guided-thread, check-layout.

### 2026-11-28 — Claude: forehand/backhand (Lance #2) and softer bite label (#5)
- New `src/gameplay/biteHand.ts` (+test): right-to-left crossing = forehand (Lance). Sandbox summary "Bites" line.
- `CrossSectionView`: shallow planned bite now reads "shallow (widest at the surface) · a deeper bite gives a flask shape that everts the edges" (my call on #5; the default plan was not changed).
- Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: phone layout, camera below the scene (Lance #12)
- `src/ui/theme.css` (≤ 760 px): `.workspace-visuals` one column (scene ≥ 300 px / 48vh, camera dock ≥ 340 px below), stage rows auto (including the `:has(drawer open)` rule), and the app/workspace no longer pinned to one screen height, so the page scrolls. Checked: 390 px full-page screenshot, check-layout, check-iphone-start, check-status-strip.

### 2026-11-28 — Lance's answers (decisions)
1. Big builds in this order: looped running stitches (locked, tie-off, tension hold) → suture breaking strength → tissue tension heatmap → edges of different thickness/length → corner stitch → nerve repair → vein and diseased-artery modes.
2. Forehand = right-to-left for a right-handed needle driver.
3. Landmark alignment: a separate exercise, landmark at the centre.
4. Body sites: sliders with presets, and make the pad look like that part of the body.
5. Default bite label: Claude's call.
6. Vessel stitch count: scale by circumference (8 for a 1 mm artery); spacing evenness also matters.
7–11. Thresholds, thread budget (~100 mm strand), MICRO_MM_PER_UNIT 2.5, HUD challenges and stat definitions: OK as they are.
12. Phone: camera panel below the 3D scene.

### 2026-11-28 — Claude: thread budget (roadmap)
- Finding: a continuous running thread already exists (Stage B2, `FreeThreadGuide`: untied Sandbox passes share one strand).
- New `src/gameplay/threadBudget.ts` (+test): per pass arc (|start| × exitAngle) + loose span × 1.05 to the previous pass, against the 3.8-unit strand (~103 mm); warns below 25% left. Sandbox summary "Thread" line. Counts all Sandbox passes (not reset per tied stitch yet).
- Checked: tsc, test, check-sandbox.

### 2026-11-28 — Claude: roadmap items needing a decision or deeper work
- Tail control on pull-through: tail length lives inside `FreeThreadGuide`'s thread layout (tail reserve, older-pass costs); exposing "tail left outside the entry" is a thread-model change. Not started.
- Forehand/backhand bites: needs Lance's definition for the sim (which bite direction counts as forehand for a right-handed driver).
- Remaining physics items (continuous running thread, suture breaking strength with real loads, tissue tension heatmap, edges of different thickness/length, corner stitch, nerve repair, vein and diseased artery modes) are each multi-session builds; waiting for Lance to order them.

### 2026-11-28 — Claude: live tension heatmap on the strands
- New `src/scene/tensionTint.ts` (+test): emissive glow from `StrandTensionView` (none when released/slack, green × tautness when gentle, red when excessive). `FreeKnotView` applies it to the long and short strands each frame. Checked: tsc, test, check-free-tying, check-knot, check-sandbox. Not seen in a screenshot (needs a held, taut strand).

### 2026-11-27 — Claude: knot placement check (roadmap #3)
- New `src/gameplay/knotPlacement.ts` (+test): knot = midpoint of the closest long/short strand points; side left/right, or "on the incision" within 1.5 mm of x = 0. `src/main.ts` records it when a Sandbox stitch is kept or a course stitch advances, and appends the summary to the spacing line (reset on course start).
- Checked: tsc, test, check-sandbox, check-guided-thread, check-free-tying. Knot location is approximate (closest strand approach); Lance to try.

### 2026-11-27 — Claude: air knot detection (roadmap #3, knot signals)
- Finding: no engine change needed; `KnotEngine` already exposes `sequence.throws`, `seatedThrows`, `knotAtTissue`, strands, entry/exit.
- New `src/gameplay/airKnot.ts` (+test): flags a second throw started while no throw is seated (sliding knots excluded). `src/main.ts` prefixes the instruction line with the warning while free tying.
- Checked: tsc, test, check-free-tying, check-sandbox, check-knot, and a full Demo run watching the instruction line: no false "Air knot" on the correctly tied Demo knot.
- Next: knot placement (approximate the knot from where the long and short strands cross).

### 2026-11-27 — Claude: vessel eversion per saved stitch
- `PracticeSession.vesselEversions` records `tissueResponse.eversion` per saved vessel stitch; `describeVesselEversion` (`src/gameplay/stitchOutcome.ts`, shares `EVERTED_ABOVE` with `assessEdges`, +test) shown at the start of the microsurgery instruction line. Checked: tsc, stitchOutcome + PracticeSession tests (Node 24), check-practice-setup, check-guided-thread, check-sandbox.

### 2026-11-27 — Claude: back-wall catch alert (anastomosis)
- New `src/gameplay/backWallCatch.ts` (+test): the guided arc's lowest point at or below vessel centre − inner radius catches the back wall. `src/main.ts` prefixes the exercise readout with a warning while passing in microsurgery. The default guided vessel pass does not trigger it. Checked: tsc, test, check-practice-setup, check-guided-thread.

### 2026-11-27 — Claude: save vessel stitches around the vessel (anastomosis plan step 2)
- `PracticeSession`: `vesselStitches`, `canSaveVesselStitch` (microsurgery + stitch complete), `saveVesselStitch()` (count, `resetCurrent()`, clock keeps running); reset on environment switch (+test, Node 24).
- `src/main.ts`: "Save stitch & turn" view button freezes the knot geometry into a `CompletedStitchesView` inside the vessel frame (compensated so it turns with the vessel), then turns 45° (360°/8). HUD microsurgery progress counts `vesselStitches`.
- Checked: tsc, PracticeSession test, browser with "complete" forced through the dev hook (1 stitch, turned 0.785 rad, frozen group, HUD 1/8, no page errors), check-practice-setup, check-layout, check-sandbox, check-guided-thread. **Not tested with a real tied vessel stitch** (Lance).
- Next: stitch count / stay fill scoring, back-wall catch, per-stitch vessel eversion.

### 2026-11-27 — Claude: vessel turn / flip (anastomosis plan step 1)
- New `src/scene/VesselFrame.ts` (+test): group pivoting on the vessel axis; `src/main.ts` puts the artery, clamp and stay marks in it and adds "Turn vessel 45°" / "Flip vessel" view buttons (microsurgery only); switching environment resets the turn. The vessel is a cylinder, so pass physics are unchanged.
- Checked: tsc, test, screenshot after a 45° turn, check-practice-setup, check-layout, check-sandbox. Next: plan step 2 (retain vessel stitches and turn them with the vessel).

### 2026-11-27 — Claude: plan for the multi-stitch anastomosis (roadmap #2, next step)
- Finding: the microsurgery stitch reuses the skin pass mechanics on the vessel's top (anterior) wall; `NeedlePass`, `purchaseY`, `surfaceAt` and `loadBearing` all assume the stitch site faces up.
- Plan (rotate the vessel, not the pass, as surgeons do with the clamp):
  1. A vessel turn angle about its axis (x) applied to `ArteryTissue.root`, the clamp, stay marks and retained stitches; the pass stays at the top.
  2. A vessel stitch course: after each tied stitch, retain it (as `CompletedStitchesView` does for skin) and turn the vessel by 360°/N (N from the stay plan / count), so the next site comes to the top.
  3. "Flip the vessel" = a 180° turn after the front wall; back wall continues the same way.
  4. Then: stitch count vs suggested, stay fill evenness, back-wall catch (a bite whose tract reaches the opposite wall), vessel eversion per stitch.
- Risks: thread and knot physics hold world positions; retained knots must be frozen and turned with the vessel. Needs the free-tying and demo checks after each step.

### 2026-11-27 — Claude: stay suture planning marks (roadmap #2, step 2)
- New `src/scene/StaySutureMarks.ts` (+test): marks at 0/180° or 0/120/240° (0 = top) on both cut faces. Practice setup select `#stay-plan` (microsurgery only). Clamp plates made thinner (0.06) at 2.3× vessel radius after a too-small size hid them.
- Checked: tsc, tests, screenshots, check-practice-setup, check-layout. Next: multiple vessel stitches (full anastomosis), which unlocks stay fill scoring, stitch count, flip and back wall.

### 2026-11-27 — Claude: Acland double clamp (roadmap #2, full anastomosis, step 1)
- `src/environments/MicroTargets.ts`: clamp spread 0.5–1.5 (default 1) and `microProfile(target)` with the clamped gap (+test); ArteryTissue, PracticeSession (wound.initialGap) and createMicroEnvironment read the gap through it. ArteryTissue rebuilds when the gap changes.
- New `src/scene/AclandClamp.ts` (+test): green clamp head on each end and a joining bar. Practice setup slider "Acland clamp" (`#clamp-spread`, microsurgery only); changing it re-runs `switchEnvironment('microsurgery')`, which restarts the stitch.
- Checked: tsc, tests, screenshots at 100% and 60% (gap 0.3 → 0.18, alignment 0.75 → 0.45 mm), check-practice-setup, check-layout, check-sandbox.
- Not yet: moving the ends live mid-stitch, clamp collision with instruments, clamp setting in the URL.

### 2026-11-27 — Claude: running and running subcuticular recognition (stitch patterns step 2)
- `src/gameplay/stitchPatterns.ts`: runs of ≥ 3 same-side crossing passes advancing 3–10 mm one way = running (even advance within 2 mm, even bites); ≥ 2 alternating non-crossing passes = running subcuticular (dermis, alternating, even advance). +2 tests. Checked: tsc, tests, check-sandbox.
- Not done: the sim still ties each pass separately; a single continuous thread through a running closure needs thread physics work (later step).

### 2026-11-27 — Claude: mattress stitch recognition (roadmap "More stitch patterns", step 1)
- Lance: "start with them in order" (1 stitch patterns, 2 full anastomosis, 3 knot-engine signals, 4 body sites).
- New `src/gameplay/stitchPatterns.ts` (+3 tests): pairs consecutive opposite-direction crossing passes into vertical mattress (in line ≤ 2 mm, far ≥ 1.5× near to recognise; graded near 1–3 mm, far ≥ 2×, far deeper) or horizontal mattress (3–10 mm apart, bites within 1.5 mm). Sandbox summary "Stitch patterns" line. Thresholds are teaching guidance; Lance to confirm.
- Checked: tsc, test, check-sandbox. Next: running and running subcuticular.

### 2026-11-27 — Claude: planned bite shape in the cross-section view
- `src/scene/CrossSectionView.ts`: readout adds "Planned bite: flask / straight / V-shaped" from the planned arc (depth below the skin vs half the surface chord). Checked: tsc, browser (readout shows), check-knot.
- **Question for Lance:** the default guided plan classifies as V-shaped (needle centre 0.55 above the 0.41 skin surface; depth 0.16 vs half-width 0.27). Geometrically right (a flask bite needs the curve's centre at or below the skin), but showing "tends to invert the edges" on the default exercise may confuse. Keep, soften, or deepen the default plan?

### 2026-11-27 — Claude: bite shape (roadmap, build 0.235); vessel needle direction deferred
- New `src/gameplay/biteShape.ts` (+test): depth / half surface width ≥ 1.1 flask, ≥ 0.8 straight, else V-shaped. Sandbox summary line "Bite shape". Checked: tsc, test, check-sandbox.
- Needle direction check (vessel) not started: the microsurgery stitch is a single guided pass with a fixed direction (noted in ROADMAP).

### 2026-11-27 — Claude: needle pickup and transfer (roadmap, build 0.235)
- New `src/gameplay/needleHandling.ts` (+test): from `grasp.holder` each skill sample, counts drops (released outside tissue), re-grabs, and forceps→driver load times. Skill Analysis row "Needle handling" (`needleHandlingText`, +test). Checked: tsc, tests, check-sandbox, check-guided-thread.

### 2026-11-27 — Claude: bite ruler overlay (roadmap item now done)
- `src/scene/freePassMarks.ts`: one merged "bite-ruler" mesh with a tick every 1 mm (longer every 5 mm) along each completed stitch line, out from where it crosses the wound centre (+test). ROADMAP "Bite consistency score" marked done. Checked: tsc, test, check-sandbox, check-layout.

### 2026-11-27 — Claude: edge presentation (roadmap, build 0.235)
- New `src/gameplay/edgePresentation.ts` (+test): at each needle entry, grade the eversion hold (everted / flat / over-pulled / not held) with `EdgeEversion.ready`. Skill Analysis row "Edge presented". Checked: tsc, tests, check-sandbox, check-guided-thread.

### 2026-11-27 — Claude: step-off check (roadmap, build 0.235)
- New `src/gameplay/stepOff.ts` (+test): |site.mismatch| in mm per tied stitch, flagged above 0.5 mm. Appended to `StitchCourse.closureReview` and the Sandbox `#spacing-review` line. Checked: tsc, stepOff + StitchCourse tests, check-sandbox, check-guided-thread.

### 2026-11-27 — Claude: bite depth gauge (roadmap, build 0.235)
- New `src/gameplay/biteDepth.ts` (+test): verdict per pass from its deepest layer (epidermis too shallow, dermis good, fat too deep). Sandbox summary line "Bite depth". Checked: tsc, test, check-sandbox.

### 2026-11-27 — Claude: blind bite flag (roadmap, build 0.235)
- New `src/scene/blindBite.ts` (+tests): raycast from the view camera to each new pass exit against the instruments (clearance 0.03 near the exit). `src/main.ts` feeds it from the skill sampler; Skill Analysis row "Blind exits" (+test). Uses the 3D view, not the trainee's real line of sight.
- Checked: tsc, blindBite + SkillAnalysisPanel tests, check-sandbox, check-free-tying (after a Vite restart; the dev server had stopped).

### 2026-11-27 — Claude: Sandbox gap scan
- `src/main.ts`: the gap-scan bars also show in Sandbox once two stitches are tied (same `course.tissueSites`). Checked: tsc, check-sandbox, check-guided-thread.

### 2026-11-27 — Claude: needle regrasp check (roadmap, build 0.235)
- New `src/suture/gripPosition.ts` (+tests): grip position from tip (needle points run eye → tip), `RegraspCheck` counts new grips (new `NeedleGrasp.heldPoint` object) while `freePass.inTissue`, and those within 10% of the tip. `src/main.ts` feeds it from the skill sampler; Skill Analysis row "Regrasp on tip" (+test).
- Checked: tsc, gripPosition + SkillAnalysisPanel tests, browser (row shows –, no page errors), check-sandbox, check-free-tying.

### 2026-11-27 — Claude: roadmap triage notes
- Looked at "Needle regrasp check": `NeedleGrasp.heldPoint` (needle-local) gives where the needle is gripped, but which end of `needle.points` is the tip needs tracing through the needle model; a longer job, not started.
- Remaining roadmap items mostly need new physics or knot-engine signals (knot position, air knot, tension along the wound, running stitches, vessel clamp/dilation/flip). Good next candidates that are mostly UI/scoring: needle regrasp check (above), Sandbox gap scan, bite ruler overlay.

### 2026-11-27 — Claude: gap scan drawn on the wound
- New `src/scene/GapScanView.ts` (+test): red bars over open spans, following the course site like the other stitch views. `src/main.ts` shows it for a finished skin 3-stitch session; the scan reruns only when `course.tissueSites` changes.
- Checked: tsc, GapScanView test, check-guided-thread, check-sandbox, check-layout.

### 2026-11-27 — Claude: gap scan for skin (roadmap, build 0.235); two roadmap items deferred
- New `src/gameplay/gapScan.ts` (+test): sweeps z = −1.1…1.1 with the retained-stitch field (`fieldShift`) and returns stretches with gap > 0.045 (the closure review's "visible opening"). `StitchCourse.closureReview` ends with "Gap scan: …"; StitchCourse test asserts it.
- Deferred (noted in ROADMAP.md): knot placement check and air-knot detection need new signals from every knot engine (`KnotEngine`); not a quick UI change.
- Checked: tsc, gapScan + StitchCourse tests, check-guided-thread, check-sandbox.

### 2026-11-27 — Claude: 5-minute warm-up drill (roadmap, build 0.235)
- New `src/gameplay/warmupLog.ts` (+tests): log in `suturehero.warmupLog.v1` (day, passes, mean bite; last 100), daily streak, summary line. `src/ui/SandboxSummaryPanel.ts`: Start/Stop warm-up button and countdown; a finished warm-up logs the passes made during it (stopping early does not log). Styles in `src/ui/theme.css`.
- Checked: tsc, warmupLog test, browser (start → countdown → stop), check-sandbox, check-layout. CHANGELOG 0.235, ROADMAP note, checklist item.

### 2026-11-27 — Claude: instrument tip collisions (roadmap, build 0.235)
- New `src/gameplay/tipCollisions.ts` (+test): contact below 3 mm, released above 5 mm, not counted when the needle is within 15 mm of both tips (handoff). `src/main.ts` feeds it from the skill sampler and adds `tipCollisions` to the Skill Analysis report; `skillRows` shows it when present (+test).
- Checked: tsc, SkillAnalysisPanel/skillAnalysis/tipCollisions tests, browser (row shows 0, no page errors), check-sandbox. The handoff test is approximate (needle root position); Lance to try with real instruments.

### 2026-11-27 — Claude: outlier bites ringed on the skin
- `src/scene/freePassMarks.ts`: a red ring (shared geometry/material) on each completed pass's entry/exit bite that `biteConsistency` flags as an outlier (+test). Checked: tsc, freePassMarks test, check-sandbox, check-layout.

### 2026-11-27 — Claude: bite consistency (roadmap, build 0.235)
- New `src/gameplay/biteConsistency.ts` (+tests): every entry/exit bite vs the median bite, outliers beyond `BITE_OUTLIER_MM` = 1.5 mm. `summarizeSandbox` adds optional `biteConsistency`; Sandbox summary panel shows a "Bite consistency" line. The roadmap's ruler overlay is not done yet.
- Checked: tsc, sandboxSummary/biteConsistency/stitchOrder tests, check-sandbox. CHANGELOG 0.235, ROADMAP note, checklist item.

### 2026-11-27 — Claude: stitch order coaching (roadmap, build 0.235)
- New `src/gameplay/stitchOrder.ts` (+4 tests): checks each tied stitch against the largest open gap (within 20% of its middle, gap ≥ 80% of the largest); wound ends ±1.1 as `StitchCourse`. `summarizeSandbox` adds `stitchOrder` (optional for older saves); the Sandbox summary's spacing line shows it. The panel's re-render key now includes the new fields.
- Checked: tsc, sandboxSummary + stitchOrder tests, check-sandbox, check-free-tying. CHANGELOG 0.235, ROADMAP note, checklist item.

### 2026-11-27 — Claude: build 0.235, stitch angle across the wound (roadmap)
- `src/gameplay/sandboxSummary.ts`: `stitchSquareOffDeg` (entry→exit line vs square to the wound, which runs along z), summary `worstSquareOffDeg` (optional, older saved summaries lack it), target `maxSquareOffDeg` = 10° (editable in `SandboxSummaryPanel`). Tests added; the trend test's "targets met" counts rose by one (new target met in both sessions), thresholds unchanged.
- `src/scene/freePassMarks.ts`: a flat line per completed pass, green when square, amber when off (+test).
- Build 0.235, CHANGELOG, ROADMAP note, hardware checklist item.
- Checked: tsc, sandboxSummary + freePassMarks tests, check-sandbox, check-free-tying, check-layout. Not seen in a screenshot (needs a real pass); Lance to look.
- 10° is my reading of "a few degrees"; change `DEFAULT_TARGETS.maxSquareOffDeg` if you want it stricter.

### 2026-11-27 — Claude: fewer per-frame allocations in main.ts
- `src/main.ts`: camera-pose clamp bounds (`CAMERA_POSE_MIN/MAX`) and the skill sampler's driver-tip vector are allocated once instead of every frame. Checked: tsc, check-sandbox, check-camera-controls. Also passed today: check-iphone-start, check-hall-sensor, check-ov9281-detect.

### 2026-11-27 — Claude: GPU memory leaks in pass marks and replay paths
- New `src/scene/disposeChildren.ts` (+test): empties a group and frees child geometry/materials (shared ones kept). Used by `FreePassMarks` (skin-tear geometry was never freed on rebuild) and `ReplayController` (replay path lines and materials were never freed on stop). Regression tests added for both (they failed before the fix).
- Also new: `src/scene/freePassMarks.test.ts`.
- Checked: tsc, the three tests, check-sandbox, check-layout; full check-demo passed on the code just before this commit (all of today's DOM-write changes).

### 2026-11-27 — Claude: motion metrics panel guarded writes
- `src/ui/MotionMetricsPanel.ts`: toggle label, sample count and summary table written only on change. Idle standalone tracking page: 9 mutation records per 3 s before, the remaining ones are the 1 s FPS tooltip. Checked: tsc, check-tracking-panels, manual Start/Stop recording in the browser (no unit test or browser check covers this panel).

### 2026-11-27 — Claude: idle DOM mutations several hundred → 15 per 3 s
- Measured with a MutationObserver on the idle practice page (1440×900, camera off): several hundred mutation records in 3 s before this series, 15 after.
- `src/ui/setText.ts`: `setAttr`, `setMarkup` (remembers what it last wrote per element), plus tests. Used in `InstrumentCalibrationPanel.ts` (100 ms refresh: buttons, guide text, SVG transforms), `CalibrationPreview.ts` (per-frame SVG, values table, data attributes), `TrackingStatusBadge.ts`, `StatusStrip.ts`, `courseExport.ts`, `MotionMetricsPanel.ts`, and the stitch-position slider / placement progress in `src/main.ts`.
- Checked: tsc, setText test, check-status-strip, check-calibration-preview, check-tracking-panels, check-sandbox, check-camera-controls. In CHANGELOG 0.234.

### 2026-11-27 — Claude: practicePanels guarded writes
- `src/ui/practicePanels.ts`: tension panel, course buttons and sandbox view tools use `setHidden`/`setDisabled`/`setText` (several unguarded per-frame writes). Checked: tsc, practicePanels test, check-sandbox, check-guided-thread, check-free-tying.

### 2026-11-27 — Claude: HUD and stereo dot writes
- `src/ui/practiceHud.ts`: elements looked up once per HUD; bar widths written only on change. `src/tracking.ts`: the stereo view dot colour is written only when it changes (remembered in `data-color`, since `style.background` reads back normalised).
- Checked: tsc, practiceHud test, check-layout, check-status-strip, check-stereo-motion, check-sandbox.

### 2026-11-27 — Claude: setData for per-frame data attributes
- `setData` (`src/ui/setText.ts`); the knot-state phase, stitch-complete and pass-support `data-*` writes in the `src/main.ts` render loop now skip unchanged values. Checked: tsc, check-free-tying, check-guided-thread, check-sandbox.

### 2026-11-27 — Claude: setHidden / setDisabled in the practice render loop
- Measured in Chromium (MutationObserver): assigning `hidden`, `disabled` or a meter `value` to its current value still records an attribute mutation. New `setHidden`/`setDisabled` (`src/ui/setText.ts`, +test) skip same-value writes; the 19 per-frame `.hidden=`/`.disabled=` assignments in the `src/main.ts` render loop use them.
- Checked: tsc, setText test, check-sandbox, check-guided-thread, check-free-tying, check-practice-setup, check-layout.

### 2026-11-27 — Claude: fewer per-frame DOM writes
- `src/main.ts`: the stitch-step list (`[data-stitch-step]`) is queried once and re-marked only when the step changes (was `querySelectorAll` + marking every frame).
- `src/tracking.ts` (previous commit d66333f): decode diagnostics lines written with `setText`.
- Checked: tsc, check-guided-thread, check-sandbox, check-tracking-motion.

### 2026-11-27 — Claude: cached diagnostics lookups
- `src/tracking.ts`: `diag(name)` (the `#diag-*` lines, written several times per decoded frame) now goes through `cachedQuery` instead of `document.querySelector` each call.
- Checked: tsc, check-tracking-motion, check-profiler, check-full-scan.

### 2026-11-27 — Claude: rotation solver status cached
- `src/tracking.ts`: `#rotation-solver-status` is looked up once and written with `setText` (both writers: rotation context and the still-instrument branch of `updateLiveTargets`); it was a `querySelector` plus DOM write per instrument per frame.
- Checked: tsc, check-marker-rest, check-ring-handoffs, check-tracking-motion, check-driver-depth.

### 2026-11-27 — Claude: RenderedPoseState for the render loop
- `src/input/RenderedPoseState.ts` (+2 tests) owns each instrument's stereo fallback, rest lock and rendered-pose filter (three maps and the scale vector left `src/tracking.ts`). `reset()` keeps the old behaviour: filters and fallbacks cleared, rest locks kept.
- Finding (not changed): `resetTrackerPose` never cleared the stereo rest locks, so a reset can briefly hold the pre-reset still pose. Worth a look with real stereo.
- Checked: tsc, unit test, check-stereo-motion, check-stereo-rig-faces, check-tracking-motion, check-driver-depth, check-ring-handoffs.

### 2026-11-27 — Claude: render-loop pose block tidy; follow-up noted
- `src/tracking.ts` render loop: rest lock and stereo fallback use `getOrCreate` (three statements removed). No behaviour change. Checked: tsc, check-stereo-motion, check-tracking-motion.
- Follow-up: the per-instrument rendered-pose block in `animate` (~40 lines: fallback fusion, rest lock, calibration transform, stereo tip frame, publish) is the largest piece left in tracking.ts. Moving it out needs ~10 dependencies passed in; worth doing as a class owning `rawRenderedPoses`/`restLocks`/`stereoFallbacks`, with a test, in its own commit.

### 2026-11-27 — Claude: jaw meters written only on change
- `src/main.ts` render loop: the two jaw `<meter>` values are set only when they change (were set every frame). Checked: tsc, check-sandbox.

### 2026-11-27 — Claude: environment wording as environmentTexts
- `environmentTexts` (`src/ui/practiceMessages.ts`, +2 tests) builds the skin/microsurgery page texts (switch button, heading, tag, scene label, first step, lesson, eversion and free notes); `switchEnvironment` in `src/main.ts` only writes them. Same texts.
- Checked: tsc, practiceMessages test, check-practice-setup, check-guided-thread, check-layout.
- Note: deploy run for "Roadmap: add bite shape view" failed with a GitHub Pages 502 (server error, not our code); later runs redeploy.

### 2026-11-27 — Claude: tracking preview scene as a module
- `src/scene/trackingPreviewScene.ts` (+test): the tracking page's 3D preview (scene, camera, renderer, orbit, grid, instrument models, resize observer, reset view, render) moved out of `src/tracking.ts`; named constants for the pixel caps. No visible change.
- Checked: tsc, unit test, check-tracking-motion, check-tracking-panels, check-performance, check-stereo-motion, standalone page screenshot with Reset view (no page errors).

### 2026-11-27 — Claude: ideal path merged into two meshes
- `src/scene/IdealSuturePath.ts`: dash and chevron ribbons merged (`mergeGeometries`) into one glow and one core mesh (≈60 → 2 draw calls); chevrons drop the additive glow that blew out to white where arms overlapped. Test updated.
- Checked: tsc, unit test, `npm run build`, close-up screenshot, check-layout, check-performance. In CHANGELOG 0.234.

### 2026-11-27 — Claude: stereo pairing step as a module
- `src/input/stereoPairingStep.ts` (+2 tests): the render loop's pair → solve → accept-once-per-pair → status-line step, moved out of `animate` in `src/tracking.ts` (dependencies passed in; `stereoPrismRotation` unchanged so check-stereo-motion's patch still matches). Same status text.
- Checked: tsc, unit test, check-stereo-motion, check-stereo-rig-faces, check-status-strip.

### 2026-11-27 — Claude: simulator FPS counter and scissors button writes
- `src/main.ts`: simulator FPS readout uses `FpsCounter`; the scissors button's `aria-pressed` is written only when it changes (was every frame).
- Checked: tsc, check-sandbox, check-free-tying, check-camera-controls.

### 2026-11-27 — Claude: FpsCounter for render and embedded FPS
- `FpsCounter` (`src/diagnostics/FrameRates.ts`, +test) replaces two hand-rolled per-second counters in the `src/tracking.ts` render loop (diagnostics "Virtual FPS" tooltip and the embedded fps message). The embedded fps message now first arrives after 1 s instead of on the first frame.
- Checked: tsc, FrameRates test, check-tracking-motion, check-performance, check-camera-controls.

### 2026-11-27 — Claude: glossier vessel wall
- `src/tissue/ArteryTissue.ts`: wall roughness .72 → .48, lumen .82 → .6 (named constants). Visual only. Checked: tsc, screenshot. In CHANGELOG 0.234.

### 2026-11-27 — Claude: Skill Analysis empty state
- `src/ui/SkillAnalysisPanel.ts`: below 0.5 cm path length (`EMPTY_PATH_CM`) the path chart shows a hint and hides its lines; the stat list is rebuilt only when its HTML changes. `src/ui/theme.css`: dashed Ideal legend swatch drawn with a gradient (the 2 px dashed border looked solid).
- Checked: tsc, SkillAnalysisPanel test, screenshots. In CHANGELOG 0.234.

### 2026-11-27 — Claude: standalone tracking page polish
- `src/ui/theme.css`: calibration tab/neutral rules now also apply on `#tracking-app`; status strip inset 14 px; "Return to practice" styled as a header button. Checked: screenshot, check-status-strip, check-tracking-panels. In CHANGELOG 0.234.

### 2026-11-27 — Claude: sandbox strip and camera chip polish
- `src/main.ts`: the `.hold-progress` bar is hidden in Sandbox (it only repeated "Sandbox" at 0; the HUD stat card has progress). Written only when the value changes.
- `src/ui/theme.css`: camera name chip (`.tracking-video:after`) in theme colours (previous commit c355d44).
- Checked: tsc, screenshot, check-sandbox, check-free-tying, check-layout. In CHANGELOG 0.234.

### 2026-11-27 — Claude: calibration panel tabs in the theme
- `src/ui/theme.css`: the generic button theme had boxed the calibration Pose/Jaws/Axis tabs (1 px side padding); they are underline tabs with a cyan active line again, and the neutral-pose block is inset 12 px. Added to the 0.234 CHANGELOG entry. Checked: screenshot, check-calibration-preview.

### 2026-11-27 — Claude: build 0.234, narrow-scene overlays
- `src/ui/theme.css`: `#viewport` is a size container; below 520 px scene width the HUD stat/challenge cards, legend, tracking pill and Close-up/Undo/Replay buttons are hidden and the timer and remaining buttons shrink (they overlapped on a 390 px phone). Desktop unchanged.
- Build 0.234 (`APP_BUILD`, tracking `performanceContext`), CHANGELOG entry (also lists the Skill Analysis ideal path).
- Checked: screenshots at 390 and 1440 px, check-layout, check-sandbox, check-status-strip. Lance: look at the practice page on your phone.

### 2026-11-27 — Claude: shared FrameRates counter
- `src/diagnostics/FrameRates.ts` (+test) counts flow/decode frames per 1 s window; used by camera 1's "#diag-detection-fps" (replaces three loose variables in `src/tracking.ts`) and by `CameraMarkerState` (camera 2). Same numbers and text.
- Checked: tsc, FrameRates + CameraMarkerState tests, check-tracking-motion, check-stereo-motion, check-profiler.

### 2026-11-27 — Claude: clearLivePoses in tracking.ts
- One `clearLivePoses()` replaces four copies of "clear live targets, stillness and depth filters" in `src/tracking.ts`. No behaviour change. Checked: tsc, check-camera-controls, check-tracking-motion.

### 2026-11-27 — Claude: camera 1 decode merge helpers
- `missingMarkers`, `replaceMarkers`, `confirmMarkers` (`src/input/driftCorrection.ts`, +test) replace inline loops in `detectFrame` (`src/tracking.ts`). Same steps and same `drawDetections()` calls in the same order, so pose-filter timing is unchanged.
- Checked: tsc, driftCorrection test, check-tracking-motion, check-driver-depth, check-ring-handoffs, check-tracking-storage.

### 2026-11-27 — Claude: one stereo fallback scale vector
- `src/tracking.ts` render loop reused a new `Vector3(200,-200,-200)` per instrument per frame; now the named constant `STEREO_FALLBACK_SCALE`. Checked: tsc, check-stereo-motion.
- Looked at extracting camera 1's decode merge (`detectFrame`) as a pure function: not done yet, because it calls `drawDetections()` (which also updates poses) between steps and a one-step version would change pose-filter timing. Needs a careful split; next candidate.

### 2026-11-27 — Claude: camera 2 marker state as CameraMarkerState
- New `src/input/CameraMarkerState.ts` (+3 tests) holds camera 2's observations, confirm/decode times, live filter (140 ms) and status-line counts; `src/tracking.ts` drops eight loose variables and the inline flow/decode bookkeeping in `detectSecondFrame`. No behaviour change intended.
- Checked: tsc, unit test, check-stereo-motion, check-stereo-rig-faces, check-camera-controls, check-tracking-motion. Lance: two-camera mode should behave as before (hardware item already on the checklist).

### 2026-11-27 — Claude: CameraCapture.stopRequests
- `CameraCapture.stopRequests()` (+test) replaces the per-field resets in `stopCamera`/`stopSecondCamera` (`src/tracking.ts`). Camera 1 still leaves `decodeBusy` as before; camera 2 still clears it. No behaviour change.
- Checked: tsc, CameraCapture test, check-camera-controls, check-stereo-motion.
- Follow-up to look at: camera 1 does not clear `decodeBusy` on stop, camera 2 does; confirm which is intended.

### 2026-11-27 — Claude: stereo match line via stereoIndicator
- `stereoMatchText` (`src/input/stereoIndicator.ts`, +test, `STEREO_SYNC_WARNING_MS=250`) builds the "#stereo-match-status" line; `src/tracking.ts` now writes it with `setText` (skips same-text DOM writes each frame). Same text as before.
- Checked: tsc, stereoIndicator test, check-stereo-motion.

### 2026-11-27 — Claude: stereo tip dots via ringAxisOverlay
- The tip-dot loop in `drawTipDots` (`src/tracking.ts`) moved to `drawStereoTipDots` (`src/ui/ringAxisOverlay.ts`, projection passed in). Test added. No visible change.
- Checked: tsc, ringAxisOverlay test, check-stereo-motion, check-tracking-motion.

### 2026-11-27 — Claude: tracking status resend throttle as a module
- `src/util/changeThrottle.ts` (+test) replaces the hand-rolled "resend on change or every 500 ms" state in `updateStereoViewIndicator` (`src/tracking.ts`); `TRACKING_STATUS_REPEAT_MS=500`. No behaviour change.
- Checked: tsc, unit test, check-status-strip, check-tracking-panels.

### 2026-11-27 — Claude: corner-debug drawing via markerOverlay
- Corner-debug drawing moved from `src/tracking.ts` to `drawCornerDebug` (`src/ui/markerOverlay.ts`), named constants for colours and the 650 ms keep time. Test added. No visible change.
- Checked: tsc, markerOverlay test, check-tracking-motion.

### 2026-11-27 — Claude: camera 1 marker outlines via markerOverlay
- Camera 1's outline/"OVERLAP ID" drawing moved from `src/tracking.ts` to `drawDecodedMarkers` (`src/ui/markerOverlay.ts`, new `overlapping` argument; verified IDs computed once per frame instead of per marker). Test added.
- Checked: tsc, markerOverlay test, check-tracking-motion, check-ring-handoffs. No visible change.

### 2026-11-27 — Claude: Skill Analysis ideal path follows the needle entries
- `src/gameplay/skillAnalysis.ts`: `report()` takes the free-pass entry points (mm, seen from above) and the ideal route runs start → each entry → end instead of a straight line. Test added.
- `src/main.ts` passes `session.freePass.passes` entries; panel tooltip/aria text updated.
- Checked: tsc, skillAnalysis + SkillAnalysisPanel tests. Lance: open Analysis after a few passes and check the dashed route looks sensible.

### 2026-11-27 — Claude — standalone tracking page polish

- Status strip now sits below the page header on tracking.html (it was inserted before it;
  `trackingStatusStrip.ts`); header buttons normal size; preview container navy.
- Checked: status-strip, tracking-panels, tracking-storage, tracking-motion, camera-controls.

### 2026-11-27 — Claude — Build 0.233: overhaul polish

- Floor grid (createScene.ts, follows the floor in microsurgery); meters/progress styled; glass
  instruction strip; Production mode palette mapped to the shared tokens; side-panel height fix.
- Checked: render-recovery, practice-setup, layout, production-mode, iphone-start, guided-thread,
  sandbox, free-tying; screenshots.

### 2026-11-27 — Claude — overhaul polish: Tracking Lab and phone

- The blur fix deployed (CI green), so builds 0.229–0.232 are live.
- Tracking Lab's small live view hides the HUD and view buttons (they crowded it).
- Phone width: the HUD stat card sits under the timer (it covered the view buttons).
- Checked: tracking-lab, tracking-lab-layout, production-mode, layout, iphone-start; screenshots.
- Side panel sections were clipped to 28dvh with an inner scrollbar (old camera-setup rule)
  and had nested glass outlines; fixed in theme.css. Checked: sandbox, course-export,
  practice-setup, layout.

### 2026-11-27 — Claude — fix: deploys 0.229–0.230 failed check-rotation-frame (theme blur)

- CI failed check-rotation-frame from the theme commit on (tilt direction flipped on random faces).
  Bisected theme.css: the `backdrop-filter` blur on the side panels (section 5). It cost a blur
  pass every frame and slowed the calibration preview enough that its drawing lagged the samples.
  Those panels and the header sit over the plain page, so the blur showed nothing: removed there;
  overlays on the 3D view (HUD, view buttons) keep it.
- Checked: rotation-frame 3/3 (0/3 before), calibration-preview, calibration-ui,
  calibration-rotation, tracking-panels, layout, practice-setup.
- Also a performance note: backdrop blur over the live 3D view is GPU work every frame; it is
  limited to the small HUD cards and buttons.

### 2026-11-27 — Claude — Build 0.232: visual overhaul step 4 (microsurgery HUD)

- `practiceHud.ts`: with `micro` input the stat card shows Alignment ((initialGap·(1−closure) +
  |edgeMismatch|) in mm), Score (closure %) and Progress n/8; challenge "Anastomosis".
- `MICRO_MM_PER_UNIT = 2.5` (sceneScale.ts): the vessel scene is magnified and had no mm scale;
  assumed 2 mm artery ↔ 0.8 units. Shown with "≈". Lance to confirm.
- Checked: practice-setup, layout, sandbox, production-mode; screenshot.
- The four requested parts of the overhaul are now in (theme, HUD, Skill Analysis, microsurgery).

### 2026-11-27 — Claude — Build 0.231: visual overhaul step 3 (Skill Analysis)

- `src/gameplay/skillAnalysis.ts` (+test): `SkillRecorder` samples the needle-driver tip (20 Hz,
  last 120 s) and forceps hold state; report gives path length, smoothness (share of moving
  samples without a >60 mm/s speed jump), accuracy (mean pass entry/exit symmetry), jaws control
  (share of hold samples not stretching/slipping), path + straight ideal, speed series.
- `src/ui/SkillAnalysisPanel.ts` (+test): stat list and SVG charts; new header button
  "Analysis" opens it in the side panel (WorkspaceLayout); redraws only while open.
- View tools moved to the bottom right of the scene (theme.css).
- Checked: sandbox, layout, practice-setup, production-mode, free-tying, guided-thread,
  course-export; screenshot with movement.

### 2026-11-27 — Claude — Build 0.230: visual overhaul step 2 (in-scene HUD)

- `src/ui/practiceHud.ts` (+test): timer pill, stat card (Precision, Tension, Progress with
  segments), challenge card; refreshed every 250 ms from values the session already computes
  (Precision = last completed pass's |entry − exit| edge distance in mm; Tension = held strand
  tautness while tying; Progress = kept stitches / goal). Goals are display constants
  (6 Sandbox / 3 course, 10:00, ±1.0 mm) — Lance to confirm.
- `src/scene/IdealSuturePath.ts` (+test): dashed cyan ribbon line with chevrons along the wound
  (skin only), following the course stitch site.
- Checked: layout, sandbox, production-mode, practice-setup, free-tying, guided-thread,
  render-recovery; screenshots.

### 2026-11-27 — Claude — Build 0.229: visual overhaul step 1 (shared styling)

- Lance (via another session): top priority is a visual overhaul after his mockup "Practice.
  Play. Get better." — dark navy, frosted glass, cyan glow; then in-scene HUD (timer pill, stat
  card, challenge card, dashed ideal suture path), Skill Analysis view, microsurgery view.
  Styling and layout only; tracking and scoring logic unchanged.
- Step 1 done: `src/ui/theme.css` (loaded last on both pages) with shared tokens (`--sh-*`). A
  zero-specificity reset under `#app` / `#tracking-app` makes the old light containers
  transparent; panels, controls and accents are restyled after it. Scene backdrop/floor/tray
  darkened (`createScene.ts`).
- Two fixes found by the checks: the header's blur made a stacking context, so the Tracking menu
  slid under the status strip (header now z-index 40); and the side panel only appeared on the
  async `toggle` event, so a section opened during start-up could leave it hidden (now also a
  MutationObserver on `open`, plus an initial sync).
- Checked: layout, production-mode, tracking-panels, calibration-ui, status-strip,
  tracking-lab-layout, iphone-start, practice-setup, sandbox, stereo-shortcut, performance,
  predictive-decode, driver-depth; screenshots of the practice and tracking pages.

### 2026-11-27 — Claude — Demo at 15 fps: slicing tried again, reverted (no code change)

- Slicing long frames with interpolated instrument poses (as KnotHost does) made 15 fps no better
  and broke 20 fps (which passes since 0.227). Reverted. 15 fps remains a known limit.

### 2026-11-27 — Claude — tracking main-thread CPU profile; calibration preview visibility

- CDP CPU profile of the practice page with the synthetic camera (10 s): JS is small; 82% is
  native "(program)" (software GPU here), then createImageBitmap 4.7%, drawImage 2.7%. Nothing
  large left to optimise in JS on this path.
- CalibrationPreview checked its visibility with getBoundingClientRect every 50 ms (forces
  layout); now uses `visibilityFlag`. Checked: calibration-preview, calibration-ui,
  calibration-rotation, hall-sensor.

### 2026-11-27 — Claude — markerPose tests; phone layout look

- `src/input/markerPose.test.ts`: facing and tilted markers are recovered from projected corners;
  degenerate input rejected (the module had no unit test).
- Also new tests for `src/knot/knotTissue.ts` (skin surface heights, site offset, microsurgery)
  and `src/diagnostics/frameCadence.ts` (arrival rate, missed frames, capture age).
- And `src/scene/ReplayController.ts` (record, replay, restore live pose, clear).
- Phone width (390 px) screenshot: no horizontal scroll; header buttons wrap; side panel opens
  below the scene. The 3D scene is small there when the camera dock is beside it (pre-existing
  layout; left for Lance to decide).

### 2026-11-27 — Claude — Build 0.228: softer shadows

- `light.shadow.intensity = 0.7` (createScene.ts, `SHADOW_INTENSITY`): shadows partly lit instead
  of black. Checked by screenshot; render-recovery, layout, production-mode pass.
- check-knot-worker on claude-worker still fails after the 0.227 regrasp fix (expected: that
  failure is the late instrument corrections, see earlier entry).

### 2026-11-27 — Claude — Build 0.227: Demo works down to ~20 fps

- Cause found: `gripEnd` (src/demo/freeKnotDemo.ts) decided to close the jaws from the distance
  measured *before* the frame's move. At low frame rates the drifting thread end moved more than
  CLOSE_WITHIN (0.03) per frame, so the jaws never closed and the regrasp timed out. Now uses
  the distance remaining after the move.
- Demo unit test with fixed steps (Node 24): passes at 60, 25 and 20 fps (20 failed before); 15
  fps still fails (square instead of surgeon's: a wrap is lost). src/demo tests pass.
  check-demo passes (rerun with SUTURE_DEMO_TRACE=1: 428 s, three throws locked and seated, both
  tails cut, secure stitch kept); one earlier run ended with the page closed after 25 min
  (sandbox contention; the identical code then passed).
- Build bumped to 0.227 (CHANGELOG), checklist Demo item updated.

### 2026-11-27 — Claude — skip hidden rotation diagnostics each frame

- `updateRotationStageReadout` (tracking.ts) now returns early while its Diagnostics panel is
  closed (it did three quaternion→Euler conversions and a string build every frame). Side
  effect: each stage is relative to its first sample after the panel opens, not after page load.
  Checked by script: hidden → skipped; Diagnostics open → readout fills, no errors.
- main.ts: the "Tracking <instrument>" status no longer rewrites on every pose message.
- Visibility now via `src/ui/visibilityFlag.ts` (IntersectionObserver; reading `offsetParent`
  forces layout). Also gates the face-overlap line (re-ranks markers per detection). The filter
  diagnostics line is NOT gated: check-driver-depth and check-depth-stability read it while hidden.

### 2026-11-27 — Claude — shared setText; full local CI pass

- `src/ui/setText.ts` (+test) used by main.ts and tracking.ts: the tracking readouts (marker,
  pose, filter, overlap, stereo label, triangulation status) no longer rewrite unchanged text.
- Full `node scripts/ci-browser-checks.mjs` locally: 41/41 passed. Then sandbox, layout,
  guided-thread, free-tying, practice-setup, tracking-panels, tracking-motion, stereo-motion,
  driver-depth, status-strip all pass on the latest commits.

### 2026-11-27 — Claude — practice loop: no same-text DOM writes

- The render loop wrote ~9 labels every frame even when unchanged (each write replaces the text
  node and invalidates layout). They now go through `setText`, which writes only on change. The
  "Position forceps" label was also written twice per frame (base, then override); now once.

### 2026-11-27 — Claude — Sandbox view tools and knot status text out of main.ts

- `updateSandboxViewTools` (practicePanels.ts) and `freeKnotStateText` (practiceMessages.ts), tested.
  Browser checks run after the full local CI pass (below).

### 2026-11-27 — Claude — "Start 2 cameras" orchestration out of tracking.ts

- `src/input/startBothCameras.ts` (+test). Checked: stereo-shortcut, stereo-motion.

### 2026-11-27 — Claude — slider readouts and depth lock out of tracking.ts

- `src/ui/trackingControls.ts` (+test): slider value readouts and the all-instruments depth lock
  (`depthLockState`). Checked: driver-depth, tracking-storage, calibration-ui, camera-controls,
  tracking-panels.
- Also `resetSimulatedInstruments` and `trackingModeDescription`, tested; checked stereo-shortcut,
  tracking-panels, practice-setup.
- Graphics: a gradient scene background made no visible difference (the floor plane fills the
  view); reverted.
- Note: another Claude session is pushing ROADMAP.md entries to main every few minutes, which
  cancels in-flight deploy runs; the latest run still deploys everything (last code deploy that
  completed: "Cache element lookups in the practice render loop").

### 2026-11-27 — Claude — tension panel and stitch steps out of main.ts

- `src/ui/practicePanels.ts` (+test): `updateTensionPanel`, `tensionMeterValue`, `markStitchSteps`.
  Checked: free-tying, guided-thread, sandbox, layout.
- Also `updateCourseButtons` (course and Free tying buttons), tested; checked course-export,
  practice-setup, sandbox, free-tying.
- Also `skinTractionText` (skin-handling status and hint), tested; checked guided-thread, sandbox,
  layout.

### 2026-11-27 — Claude — practice loop: cached element lookups (main.ts)

- `src/ui/cachedQuery.ts` (+test): the practice render loop's 44 per-frame
  `document.querySelector` calls now reuse each element until it leaves the page. Small CPU
  saving per frame (not measurable above noise in this software-rendered sandbox).
- Checked: layout, sandbox, free-tying, practice-setup, guided-thread, course-export,
  production-mode, render-recovery.
- Strand contact (≈15% of knot physics) re-read: already hashed, cached and box-culled; no cheap
  exact speed-up left.

### 2026-11-27 — Claude — stereo triangulation notes out of animate()

- `stereoInstrumentReport` (+test) in `src/input/stereoIndicator.ts`: each instrument's status note
  and the fit error fed to the camera-moved monitor. Checked: stereo-motion, stereo-rig-faces,
  status-strip, stereo-shortcut.

### 2026-11-27 — Claude — flow-result bookkeeping out of tracking.ts

- `recordFlowMotion` and `holdDecodedMarkers` (DECODED_HOLD_MS = 300) in
  `src/input/driftCorrection.ts`, tested. Checked: tracking-motion, marker-rest, ring-handoffs,
  marker-motion, predictive-decode.
- Also `drawDecodedMarkers` (camera 2 overlay; markerOverlay.ts), tested; checked stereo-motion,
  dual-camera-fit, stereo-capture-quality.

### 2026-11-27 — Claude — Tracking Lab bridge out of tracking.ts (−48 lines)

- `src/trackingLab/bridge.ts` (+test): `createTrackingLabBridge(deps)`; tracking.ts still exports
  `trackingLabBridge` (the Lab imports it from there). Same behaviour.
- Checked: tracking-lab, tracking-lab-layout, tracking-lab-scroll, production-mode.
- Graphics: glossier suture (roughness 0.35) made no visible difference at normal zoom; reverted.

### 2026-11-27 — Claude — overlay helpers and getOrCreate

- `drawCornerMarks` (markerOverlay.ts) and `drawRingAxes` (ringAxisOverlay.ts), tested; five
  get-or-create blocks in tracking.ts use `src/util/getOrCreate.ts`. No behaviour change.
- Checked: tracking-motion, ring-handoffs, ring-configuration, and a scripted run with corner debug
  on (status updates, overlay drawn, no errors).
- Efficiency note: the tracking page's biggest main-thread costs in this sandbox (flow bitmap
  request ~5 ms, tracking frame ~7.6 ms) are dominated by software GPU work; not tuned here, as
  real-GPU numbers will differ.

### 2026-11-27 — Claude — decode diagnostics and stereo positions out of tracking.ts

- `decodeDiagnosticsText` (+test) in `src/ui/trackingReadouts.ts`: the eight decoder rows.
- `src/input/stereoPositions.ts` (+test): per-instrument filtered stereo pose, once per frame pair
  (owns the StereoPoseFilters). Same behaviour.
- Checked: tracking-motion, profiler, tracking-panels, stereo-motion, stereo-rig-faces,
  stereo-capture-quality, detection-previews.
- Scheduled wakes: `trig_01Bj98ypHvMxRmFu424b3tr8` (:13) and backup `trig_015Z27Q9SenRpMCRYRe1k2ht`
  (:43), both to be disabled 2026-11-29 20:00 UTC. Pushes are batched so deploy runs are not
  cancelled by the next push.

### 2026-11-27 — Claude — rigid-body rotation out of tracking.ts (−67 lines)

- `src/input/RotationTracker.ts` (+test): the second half of `updateLiveTargets` (rigid-body
  solve or stereo rotation, source switching, face transitions, rotation gate, stall/accept) and
  the "held still" ring alignment, owning the three per-instrument maps it used. The page passes a
  `RotationContext` (marker freshness, ring trackers, stereo rotation, checkboxes, status outputs).
  Same order and arithmetic; magic numbers named (350/650/110/100/180 ms).
- Checked: tracking-motion, calibration-rotation, rotation-frame, ring-handoffs, marker-rest,
  neutral-placement, stereo-motion, stereo-rig-faces, driver-depth (also SUTURE_DEPTH_NOISE=1),
  ring-configuration, calibration-preview.
- Lance: rotation with the real camera (checklist section 4).

### 2026-11-27 — Claude — stereo pose memory out of tracking.ts

- `src/input/stereoPoseMemory.ts` (+test): per-instrument stereo fit cache and continuity seed
  (`STEREO_CONTINUITY_MS`), same rules. Checked: stereo-motion, stereo-rig-faces,
  stereo-capture-quality.

### 2026-11-27 — Claude — stereo per-camera fallback views out of tracking.ts

- `src/input/stereoMonoViews.ts` (+test): each camera's single-marker pose (undistort, solve,
  reject bad fits/depths, camera 2 into camera 1's frame), thresholds named. Caching stays in
  tracking.ts. Checked: stereo-motion, stereo-rig-faces, stereo-capture-quality, dual-camera-fit.

### 2026-11-27 — Claude — status strip wiring out of tracking.ts

- `src/ui/trackingStatusStrip.ts` (+test): strip button wiring, 500 ms refresh, and `healthInput`
  (page state → health checks), same rules as before. tracking.ts only gathers the raw state.
- Checked: status-strip, calibration-ui, layout, tracking-panels, stereo-shortcut.

### 2026-11-27 — Claude — stereo tip pose out of animate()

- `src/input/stereoTipPose.ts` (+test): with a calibrated stereo tip, the instrument's shared-frame
  position (tip + table shift) and orientation (saved jaw orientation, else shaft toward the ring),
  including saving a pending jaw-orientation request. Same order and arithmetic as before.
- Checked: unit tests; stereo-motion, stereo-rig-faces, stereo-shortcut. No browser check covers
  stereo tip calibration; added to the hardware checklist.

### 2026-11-27 — Claude — decoder drift correction out of tracking.ts

- `src/input/driftCorrection.ts` (+test): `driftCorrections` (which decoded markers reset their
  flow-tracked corners) with named thresholds, and `meanCornerDistance` (also used for flow
  speed). Same arithmetic. Checked: tracking-motion, marker-rest, ring-handoffs,
  predictive-decode, marker-motion.

### 2026-11-27 — Claude — simulated input and stereo prerequisites out of animate()

- `src/input/simulatedInstruments.ts` (+test): keyboard-driven simulated instruments and readout.
  `stereoBlockedReason` (+test) in `src/input/stereoIndicator.ts`: the "Import a calibration / Select
  2 cameras / Disable simulated input / Stereo inactive" message. No behaviour change.
- Checked: stereo-motion, stereo-shortcut, tracking-motion, status-strip, practice-setup, and a
  scripted browser run of simulated input (arrow key moves the driver, no errors).

### 2026-11-27 — Claude — per-camera capture pipeline out of tracking.ts (−82 lines)

- `src/input/CameraCapture.ts` (+test): one class per camera for what both detect functions
  did identically: capture timing (`captureDue`), duplicate counters, video snapshot, flow-frame
  resize, flow request (bitmap or readback) and decode request (bitmap or crop), with the same
  profiler names. Camera-specific result handling stays in `detectFrame` / `detectSecondFrame`.
  Removed ~30 per-camera variables from tracking.ts (canvases, busy flags, budgets, searches).
- Checked: tsc; tracking-motion, performance, predictive-decode, stereo-motion,
  stereo-capture-quality, dual-camera-fit, ring-handoffs, driver-depth, profiler,
  detection-previews, camera-controls (all pass).
- Lance: real-camera check in HARDWARE_TEST_CHECKLIST section 4 (single and two cameras).

### 2026-11-27 — Claude — bitmap flow/decode requests out of tracking.ts

- `src/input/bitmapRequests.ts` (+test): `postFlowBitmap` and `decodeViaBitmap`, unchanged logic;
  `onError` turns off the bitmap path as before. Checked: tracking-motion, performance,
  predictive-decode, stereo-motion, profiler, ring-handoffs.

### 2026-11-27 — Claude — rotation-stage diagnostic out of tracking.ts

- `src/ui/rotationStageReadout.ts` (+test): raw / accepted / rendered rotation readout
  (diagnostic only). Checked: tracking-motion, calibration-rotation, rotation-frame, tracking-panels.

### 2026-11-27 — Claude — marker selection out of tracking.ts

- `src/input/verifiedMarkers.ts` (+test): `selectVerifiedMarkers` (per-instrument ranking by
  area and decode age, capped by `maxVisibleFaces`), same arithmetic as before. Checked:
  tracking-motion, ring-handoffs, driver-depth, marker-rest, neutral-placement, stereo-rig-faces,
  tracking-panels.

### 2026-11-27 — Claude — marker ID tables out of tracking.ts

- `src/input/markerGroups.ts` (+test): ring8 / ring6 / prism marker IDs and `markerGroupsFor`.
  No behaviour change. Checked: ring-configuration, ring-markers, ring-handoffs, tracking-motion,
  iphone-start.
- Also `trackerDescriptionText` (tracker status line and geometry description) moved there, tested;
  checked ring-configuration, tracking-storage, iphone-start.

### 2026-11-27 — Claude — filter and face-overlap readouts out of tracking.ts

- `filterDiagnosticsText` and `faceOverlapText` in `src/ui/trackingReadouts.ts` (+tests); no
  behaviour change. Checked: tracking-panels, driver-depth, tracking-motion, ring-configuration.

### 2026-11-27 — Claude — stereo indicator out of tracking.ts; checks honour SUTURE_TEST_URL

- `src/input/stereoIndicator.ts` (+test): the stereo dot colour, label and state, as a pure
  function (no behaviour change). Checked: stereo-motion, stereo-shortcut, status-strip,
  stereo-rig-faces, checkerboard-worker, ring-handoffs, stereo-capture-quality.
- Four checks ignored `SUTURE_TEST_URL` (hard-coded port 5173): stereo-motion,
  checkerboard-worker, ring-handoffs, stereo-capture-quality. Fixed.
- Graphics: a clearcoat on the skin made no visible difference (no environment to reflect);
  reverted.

### 2026-11-27 — Claude — Correction: Demo frame-rate limit is 20 fps, not 25 (no code change)

- The earlier "fails at 25 fps" runs used Node 22 (this shell's default); AGENTS.md warns physics
  tests differ there. On Node 24 the Demo passes at 60, 40, 30 and 25 fps; fails at 20 fps (after
  the first throw the forceps never regrasps the long strand: `gripEnd` retries ~7 s, gives up,
  only 2 throws, not locked) and at 15 fps (square instead of surgeon's).
- Next suspect: `gripEnd` (src/demo/freeKnotDemo.ts) counts frames (`GRIP_CONFIRM_FRAMES`,
  `REOPEN_FRAMES`), not seconds.
- Also measured: caching `PracticeSession.knotTissue` gave no speed gain (reverted).
- Re-checked the check-knot-worker findings on Node 24: same results (answer every frame passes;
  every 3rd frame, or corrections off, fails).
- Run Node 24 explicitly here: `npx -y node@24 node_modules/vitest/vitest.mjs run <file>`.

### 2026-11-27 — Claude — Build 0.226: metal reflections; CI fix; small tracking.ts extraction

- CI had not deployed since 0.224: `check-full-scan` needs `ARUCO_LIBRARY_DIR`. The workflow now
  `npm pack`s js-aruco2 2.0.0 for the browser-checks job. (One earlier unit-test run died with a
  native "Channel closed" worker crash; one-off, later runs passed.)
- Graphics: `createScene` gives only materials with metalness ≥ 0.5 a RoomEnvironment env map
  (intensity 0.45; off in Fast graphics). Scene-wide env maps were tried before and washed out skin.
  Checked by screenshot; render-recovery, layout, production-mode pass.
- `src/ui/trackingReadouts.ts` (+test): pose readout text and marker outline from tracking.ts.
- Efficiency: profiled the Demo test (Node 24). Top costs: instrument–thread contact 16%, strand
  pair/self contact 15%, skin-height lookups ~14%. A scratch-vector change gave no measurable gain
  (reverted). Further gains need algorithm changes (e.g. broad-phase for strand contact).
- The scheduled resume now fires hourly.

### 2026-11-27 — Claude — Demo below 30 fps (no code change)

- Demo unit test with a fixed frame step: passes at 60, 40 and 30 fps; fails at 25 and 20 fps on the
  default engine (first throw counts, the 2nd and 3rd wraps never register, so no lock).
- Ruled out: the physics step cap (`MAX_TIME_STEPS` 6 still fails) and instrument jumps between
  frames (slicing long frames with interpolated instrument poses, like `KnotHost`, still fails).
  Both reverted. Next suspect: the Demo choreography's wrap/regrasp segments at coarse time steps.
- Matters for slow laptops pressing Demo; hands-on tying at 25 fps is untested.

### 2026-11-27 — Claude — check-knot-worker cause found: Demo + late corrections (no code change)

- Reproduced in Node with the Demo unit test on `claude-worker` through `SlowKnotPort`: an answer
  every frame passes (seated); an answer every 3rd frame locks but never seats, as in the browser.
  Turning off `applyCorrections` makes even the every-frame case fail, so the worker's instrument
  corrections are what pull the knot down onto the skin in the Demo.
- Why only the Demo: its `moveTo` segments start from the instrument's *current* (corrected)
  position, so corrections accumulate into its motion; applied every 3rd frame they change the
  whole path. Camera tracking sets absolute poses each frame and the worker corrects each replayed
  frame itself, so a trainee should not be affected (unverified by hand).
- Tried and reverted: re-applying the last correction every frame (Demo then ties a single throw
  instead of a surgeon's knot), and re-applying only its vertical part (same). A real fix would
  make the Demo independent of corrections or move correction ownership into the worker.
- Separately: at 20 fps the Demo fails to lock with *any* engine, including the default (only 2 throws).

### 2026-11-27 — Claude — check-knot-worker: real failure in background engines (no code change)

- With a 25 min limit the check completes (Demo ~5.5 min) but fails on both background engines:
  classic-worker and claude-worker lock 3 throws and the knot touches the skin, yet never *seats*,
  so the session shows "0 tied (0 secure)". The default main-thread engine passes the same Demo
  (`check-demo`). Not a test problem; threshold left as is. Next step: compare `seatLoad` /
  seating inputs between the worker snapshot and the main-thread engine at the final tighten
  (diag shows seatContact true, seatLoad 0 on the worker).
- Background engines stay labelled experimental (checklist "Known limits").

### 2026-11-27 — Claude — check-performance updated (test only)

- It expected build `0.82`, a "Camera 1 flow readback" row (frames now reach the flow worker as an
  ImageBitmap, with no main-thread readback), and the second-camera button inside a `<details>`.
  Now: any `0.x` build; each capture is sent to the flow worker once, by bitmap or readback (same
  ±2 tolerance as before); the details step is optional. Passed 2/2 here. Not yet in CI.

### 2026-11-27 — Claude — Build 0.225: 26 more browser checks in CI; Tracking menu focus

- Swept 32 browser checks twice. 26 that passed both times (and again through
  `ci-browser-checks.mjs`) were added to `DEFAULT_CHECKS` (40 total, about 8 extra minutes in CI).
- Seven checks that clicked Tracking setup / Diagnostics / Start 2 cameras now open the new
  Tracking ▾ menu first. `check-rotation-frame` defaulted to port 5180; now 5173.
- `check-tracking-panels` found that focus could not return to a menu button after its panel
  closed (the menu had closed). The menu now stays open while its dialog is in use
  (`src/ui/WorkspaceLayout.ts`).
- Not added (follow-ups): `check-knot-worker` times out (331 s, then 600 s);
  `check-performance` expects a "Camera 1 flow readback" row that no longer appears (likely the
  prepared-seed path skips main-thread readback; check probably stale; it failed before 0.224 too).
- Graphics: tried a studio environment map for steel reflections (three variants). Each washed
  out skin and shadows; reverted, nothing shipped. Needs Lance's eye on what he wants changed.

### 2026-11-27 — Claude — Build 0.224: cleaner practice layout

- Lance disliked the buttons under the scene. Setup, Stitch plan, Review and Guide are now header
  buttons opening one side panel beside the scene (sections stay `<details>` with their IDs; opening
  one closes the others and the calibration drawer). Tracking setup / Diagnostics / Start 2 cameras
  moved into a "Tracking ▾" header menu. The coach area is one slim strip.
- Files: `src/ui/WorkspaceLayout.ts`, `src/ui/TrackingLayout.ts` (embedded nav target),
  `src/ui/workspace.css`; checks `check-sandbox`, `check-practice-setup` click the header buttons
  now (section summaries are hidden).
- Checked: tsc; layout, sandbox, practice-setup, production-mode, course-export, free-tying,
  tracking-lab (tracking-lab failed once in a replay step unrelated to layout, passed on rerun).
- Lance: checklist section 7.

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
