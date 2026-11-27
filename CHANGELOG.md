# SutureHero changelog

Per-build notes, newest first. These were moved here from the README on
2026-11-07; the wording is unchanged. Build numbers match the `BUILD 0.xx`
label in the app header. The README before this move is in git history at
commit `bde9116`.

## Build 0.235 — Stitch angle across the wound

- Microsurgery: green Acland double clamp on the vessel. The "Acland clamp" slider (50–150%) pushes the vessel ends closer or spreads them apart, which sets how far the stitch must pull; changing it restarts the stitch (roadmap: "Adjustable green double Acland clamp").
- Microsurgery: "Turn vessel 45°" and "Flip vessel" buttons turn the vessel, clamp and stay marks about the vessel axis, so the next stitch site comes to the top (roadmap: "Flip the vessel", first step; retaining stitches around the vessel comes next).
- Microsurgery: "Stay sutures" choice (none, 2 at 180°, 3 at 120°) marks where the stays go on both vessel ends (roadmap: "Stay sutures planning"; scoring the remaining bites needs a full anastomosis).

- Sandbox: each completed needle pass is drawn as a line across the wound, green when it is square to the wound and amber when it is more than 10° off (roadmap: "Stitch angle across the wound"). Approximate practice measure.
- 3-stitch session: the closure review now ends with a gap scan along the whole wound, listing where the edges are still apart (roadmap: "Gap scan for skin"); when the session is finished (or in Sandbox once two stitches are tied), the open stretches are marked with red bars on the wound.
- Sandbox: 5-minute warm-up drill. Start it from the Sandbox session panel; it counts your passes for five minutes, then logs the day, the passes and the mean bite. The panel shows whether today's warm-up is done and your daily streak (roadmap: "5-minute warm-up drill with a daily log"; stored in this browser only).
- Step-off check: the closure review (3-stitch session) and the Sandbox spacing line say how many stitches left the two edges level within 0.5 mm, and name any that did not (roadmap: "Step-off check").
- Sandbox: stitch patterns. Two passes back and forth are recognised as a vertical mattress (far-far then near-near at the same spot: near bite 1–3 mm, far ≥ 2× near and deeper, in line within 2 mm) or a horizontal mattress (similar bites 3–10 mm apart), and graded in the summary Three or more passes from the same side stepping 3–10 mm along the wound read as a running stitch (graded on even advance and even bites), and alternating dermal bites that don't cross the wound as a running subcuticular (roadmap: "More stitch patterns"; recognition and grading only).
- Sandbox: bite shape. The summary classifies each pass as flask-shaped (everts the edges), straight or V-shaped (inverts them), from its depth against half its surface width (roadmap: "Bite shape view"). The cross-section view also names the planned bite's shape.
- Sandbox: bite depth gauge. The summary lists how many passes held the dermis and which stayed in the epidermis (too shallow) or reached fat (too deep), with depth in mm (roadmap: "Bite depth gauge"; no cutaway picture yet).
- Skill Analysis: new "Needle handling", needle drops outside the tissue and the mean time from forceps pickup to the driver holding the needle (roadmap: "Needle pickup and transfer"; works in both environments, not microscope-specific yet).
- Skill Analysis: new "Edge presented", needle entries made while the forceps held the skin edge gently everted (not flat, over-pulled or unheld) (roadmap: "Edge presentation"; skin hook and dermis-vs-epidermis grasp not graded yet).
- Skill Analysis: new "Blind exits", needle exits that were hidden behind an instrument from the current view when they happened (roadmap: "Blind bite flag"; uses the 3D view, approximate).
- Skill Analysis: new "Regrasp on tip", how many in-tissue needle regrasps gripped the last 10% of the needle (the tip) instead of behind it (roadmap: "Needle regrasp check"; following the curve on pull-through is not graded yet).
- Skill Analysis: new "Tip collisions" count, the times the needle-driver and forceps tips bumped together (within about 3 mm) outside a needle handoff (roadmap: "Instrument tip collisions"; no replay markers yet).
- Sandbox: bite consistency. The summary compares every bite (entry and exit distance from the edge) with your median bite and lists any more than 1.5 mm off (roadmap: "Bite consistency score"); outlier bites are also circled in red on the skin, and each completed stitch line carries a millimetre ruler out from the wound centre (longer tick every 5 mm).
- Sandbox: stitch order coaching. After you tie stitches, the summary says whether you started in the middle and then halved the largest gap each time, and from which stitch you didn't (roadmap: "Stitch order coaching").
- Sandbox targets: new "Square to wound (within 10°)" target with the worst pass shown; the limit is editable with the other targets.
- Fewer per-frame allocations in the render loop.

## Build 0.234 — Tidy narrow scene

- When the 3D scene is narrow (a phone, with the camera panel beside it), the stat and challenge cards, legend and extra buttons are hidden, the timer shrinks, and Reset view / Reset needle / Demo stay as small buttons, so nothing overlaps.
- Instrument calibration panel: Pose / Jaws / Axis mapping are underline tabs again, and the neutral-pose block no longer touches the panel edges.
- Sandbox: the instruction strip no longer shows an empty progress bar labelled "Sandbox" (progress is on the stat card). The camera name chip uses the dark theme.
- Tracking page: "Return to practice" is a header button, the status strip is inset from the edge, and the calibration tabs match the practice page.
- Skill Analysis: before the needle driver has moved, the path chart says "Move the needle driver to draw its path" instead of showing a dot; the Ideal legend swatch is visibly dashed.
- Microsurgery: the vessel wall and lumen have a soft wet highlight instead of a flat matte look.
- Ideal suture line: chevrons are clean cyan arrows (their overlapping glow had turned white), and the line draws in 2 GPU draw calls instead of about 60.
- Faster idle page: the practice page now makes about 15 DOM changes in 3 seconds when idle, down from several hundred (buttons, panels, calibration preview and status lines were rewritten every frame even when unchanged).
- Skill Analysis: the dashed ideal path now runs through your needle entry points instead of straight from start to end.

## Build 0.233 — New look, polished

- Faint cyan grid on the floor around the tray.
- Meters and progress bars glow green on dark tracks; the instruction strip under the scene is a glass bar.
- Production mode and the iPhone start button use the same dark navy and cyan as the rest of the app.
- Side-panel sections use the whole panel height (they were squeezed into a small scrolling box); Tracking Lab's live view no longer shows the HUD; on phones the stat card sits under the timer.
- Panels over the plain page no longer blur what is behind them (it showed nothing and slowed rendering).

## Build 0.232 — Microsurgery HUD

- In microsurgery the stat card shows Alignment (remaining gap plus edge step between the vessel ends, ≈ mm), Score (how fully the ends are brought together, %) and Progress out of 8 sutures; the challenge card shows the anastomosis goal (8 sutures, within 10:00, align within 0.2 mm).
- The microsurgery scene is magnified, so its millimetres use an approximate display scale (2.5 mm per scene unit, from a typical 2 mm artery); to be confirmed.

## Build 0.231 — Skill Analysis

- New Analysis button: a Skill Analysis panel with Time, Path length (cm), Smoothness, Accuracy (mm) and Jaws control (%), an instrument path chart (actual path solid blue, straight start-to-end line dashed cyan, seen from above) and a small velocity graph.
- Definitions: path and speed are the needle-driver tip in the 3D scene; Smoothness is the share of movement without abrupt speed changes; Accuracy is the mean entry/exit symmetry of completed passes; Jaws control is the share of forceps hold time without over-stretching or slipping the skin. Approximate practice measures, not a validated assessment.
- The scene's view buttons moved to the bottom right, so the timer and stat card own the top.

## Build 0.230 — In-scene HUD

- A timer pill at the top of the 3D view, a live stat card (Precision in mm, Tension in %, Progress as stitches placed out of the goal) and a challenge card (place 6 sutures in the Sandbox or 3 in the course, within 10:00, within ±1.0 mm), all in the new glass style.
- A dashed cyan line with chevrons along the wound shows where the row of stitches goes.
- Display only: Precision is the last needle pass's entry/exit symmetry, Tension the held strand's tautness; the challenge targets are shown, not scored.

## Build 0.229 — New look: dark, glowing, high-tech

- Whole app restyled after the "Practice. Play. Get better." mockup: near-black navy background, frosted-glass panels with thin cyan outlines and a soft glow, rounded corners, white text with cyan section labels, green for good values. The 3D scene's backdrop, floor and tray are dark to match.
- Tracking and scoring are unchanged; this is styling only.

## Build 0.228 — Softer shadows

- Cast shadows are partly lit by the room instead of solid black, so instrument shadows on the tray and skin look like shadows rather than holes (Standard graphics).

## Build 0.227 — Demo works on slower computers

- The Demo now ties its knot at frame rates down to about 20 fps (it used to fail below 25 fps: the forceps missed the thread end when regrasping).
- Behind the scenes: the tracking page and practice loop do less work per frame (no rewriting unchanged text, hidden diagnostics skipped), and much of `tracking.ts` moved into tested modules. No intended change to tracking.

## Build 0.226 — Steel instruments look like steel

- On Standard graphics, the instruments and needle reflect a soft studio light, so they read as polished steel instead of flat grey. Skin, tray, lighting and shadows are unchanged; Fast graphics is unchanged.
- Tracking page internals tidied (no visible change).

## Build 0.225 — Tracking menu keeps keyboard focus

- After closing Tracking setup or Diagnostics (opened from the Tracking ▾ menu), focus returns to its button.
- The automatic checks run before each deploy now cover 40 browser checks (camera calibration, markers, stereo, tracking panels and more).

## Build 0.224 — Cleaner layout: no more cards under the scene

- Practice setup, Stitch plan, Review and Guide are now buttons in the header. Each opens in a panel beside the scene (one at a time; ✕ or Esc closes it) instead of the row of cards under the scene.
- Tracking setup, Diagnostics and Start 2 cameras are grouped in a "Tracking ▾" menu in the header.
- The instruction and action buttons under the scene are one slim strip.

## Build 0.223 — Knot physics about 8% faster

- Knot physics about 8% faster (instrument–thread contact), with identical results: the same knot ends in exactly the same thread positions (checked by checksum).

## Build 0.222 — Guided course results export

- Guided course results export: the Stitch plan section shows **Export course stitches CSV** once a course stitch is saved, with the trainee name (the same name as in the Sandbox panel; editing it in one place updates the other). Same columns as the Sandbox stitches CSV: completion time, seconds, knot technique, throws, locked, security, engine, review. Approximate practice measures.

## Build 0.221 — Background knot engines apply instrument corrections

- Background-thread knot engines: the knot model's small instrument corrections (keeping the driver off the skin and the thread) now move the drawn instruments, a frame late, as the main-thread engines do at once. Engine comparison: Claude in a background thread 22/24 (was 17), Classic in a background thread 18/24 (was 14); main-thread Claude stays at 24/24 and remains the default (synthetic scripted hands).

## Build 0.220 — Background knot engine replays missed frames

- Background-thread knot engines: when the background thread falls behind the display, the frames it missed are now replayed in order, each with its own instrument positions and jaw openings, instead of being merged. Before, a grasp made while it was behind could be lost, and a worker 2–3× slower than the display formed no throw at all; now a surgeon's knot locks. New option **Claude in a background thread (experimental)** in Practice setup → Knot engine. The default stays Claude's engine on the main thread, which is still more reliable (synthetic tests).

## Build 0.219 — Thread keeps real time at 30 fps (knots 24/24)

- Knot tying at a low frame rate: at 30 fps the thread simulation now keeps up with real time (it previously ran at half speed, so with quick hands the thread lagged and wound round the needle driver, and a single throw could be counted as a double that never locked). Engine comparison: Claude 24/24, Codex 24/24, Classic 23/24 (synthetic scripted hands). At 30 fps the physics now does the same work per second as at 60 fps; at 60 fps and above nothing changes.

## Build 0.218 — Jaw sensor guided calibration, live graph, third slot

- Jaw sensors, guided calibration: click **Calibrate (guided)**, hold the jaws closed, then open and close them fully 2–3 times over 5 seconds. Closed and open are taken from that sweep, either magnet direction, ignoring single noisy readings. The old Set closed / Set open buttons are under "Set closed and open by hand".
- Each sensor shows a live graph of the last 5 seconds of readings, with the closed and open levels as dashed lines, to check the magnet gives a clean, wide signal.
- **Add a third sensor**: a third slot (scissors by default), remembered once added.

## Build 0.217 — Session results export (trainee, knots, timing, CSV)

- Session results export, for teaching and research (Session review → Sandbox session):
  - **Trainee name or ID** field, remembered in this browser and written into every export and saved session.
  - **Export stitches CSV**: one row per completed stitch, with completion time, seconds for that stitch and since the session start, recognised knot technique, throws (wraps and direction), locked, knot security, knot engine and the stitch review.
  - **Export progress CSV**: one row per saved session (trainee, duration, passes, tears, bites, depth, entry angle, spacing, secure knots), to track progress over time in a spreadsheet.
  - The session JSON export also includes the trainee, session duration and the per-stitch records.
- Practice measures from the simulation: approximate, not a validated assessment. Exports stay on this computer.

## Build 0.216 — OV9281 recognised automatically

- OV9281 cameras are recognised by name: starting a camera whose name contains "OV9281" (or "B0332") switches the Camera type to OV9281 and reopens it at 1280×800 / 120 fps, so it doesn't run at the 1080p/30 webcam setting. Other cameras are unaffected. Synthetic test only; the real camera's name on Windows may differ.

## Build 0.215 — Microsurgery heading fix; browser checks pass again

- Microsurgery: the title above the scene shows the procedure again (for example "Nerve anastomosis · one stitch"). Since the Sandbox work it had been overwritten every frame with "Sandbox" or "Simple interrupted suture".
- Browser checks brought up to date: tracking storage, practice setup and Tracking Lab all pass again.

## Build 0.214 — Tracking Lab list fix and clean-up

- Tracking Lab: recordings no longer appear twice in the list after a page reload. Two list refreshes ran at once and both added their rows.
- Tracking Lab: the leftover "Balls", "Classic jaw pairs" and jaw-confidence lines from the removed camera jaw tracking are gone.

## Build 0.213 — Jaw sensor battery level

- Jaw sensor battery level: each connected sensor shows its battery percentage, with "low · charge soon" at 15 % or less. It needs the updated firmware (`firmware/hall-jaw/hall-jaw.ino`, upload it to both boards), which reads the battery through the chip's own supply measurement. Untested on the real boards. Each board must be chosen once more with Connect so Chrome allows battery access.

## Build 0.212 — Jaw sensors reconnect, work without camera

- Jaw sensors reconnect by themselves: each sensor slot remembers its board. After an unexpected dropout (battery, out of range) it keeps trying every few seconds until the board is back; the button reads "Stop reconnecting" meanwhile. When the page opens, boards connected before reconnect without Chrome's device list where Chrome allows it; otherwise click Connect as before.
- Jaw sensors now also work with camera tracking turned off (Sandbox only). Connect the sensors in the camera setup first, then turn camera tracking off.

## Build 0.211 — Fast pull keeps the tail in the loop

- Knot recognition with fast hands: while the tail is being pulled through the loop, it is now held inside the loop firmly enough that a quick pull no longer makes it slip out and lose the throw. A 3-throw knot tied at 2× hand speed now keeps its third throw. Engine comparison: Claude 23/24, Codex 23/24, Classic 21/24 (synthetic scripted hands).

## Build 0.210 — Fast throws at 30 fps recognised correctly

- Knot recognition at a low frame rate (30 fps) with fast hands:
  - A single throw is no longer counted as a double wrap when the thread running to the forceps passes close to the needle driver.
  - A fully pulled-through throw held at full tension for a second now counts as tightened even if the loop stays slightly open under the pull.
  - A surgeon's knot tied at 2× hand speed at 30 fps now locks. New test; synthetic scripted hands.
- The engine comparison is unchanged (Claude 22/24); this case is not part of it.

## Build 0.209 — Fast-pulled throws count as tightened

- Knot recognition with fast hands: a throw pulled tight quickly, with both hands at the end of the thread, now counts as tightened after half a second of tension. Before, the throw only counted once the hands relaxed, so a quick second throw was missed (square knot at 2× hand speed). Engine comparison: Claude 22/24 (was 21), Codex 22/24 (was 21), Classic 20/24 (was 19). Synthetic scripted hands.

## Build 0.208 — Claude knot engine is the default

- The default knot engine is now **Claude**, chosen by the full engine comparison: Claude 21/24, Codex 21/24, Classic 19/24, all about 280 ms of computer time per second of tying (synthetic scripted hands). Classic and Codex stay available in Practice setup → Knot engine, or with `?knot=classic` / `?knot=codex`.

## Build 0.207 — Production tab restored

- The **Production** tab (the clean full-screen presentation view) is back. Since build 0.201 it was silently missing: Tracking Lab, which creates the tab bar, now loads after the page, so the Production tab had nowhere to go. It is now added as soon as the tab bar appears.

## Build 0.206 — Second Bluetooth jaw sensor (forceps)

- Two Bluetooth jaw sensors. Instrument calibration → Jaws → Jaw sensors now has Sensor 1 and Sensor 2, each with its own Connect button, instrument (defaults: needle driver, forceps) and closed/open calibration. Both can run at once. A warning appears if both are set to the same instrument. The existing single-sensor calibration becomes Sensor 1.
- Firmware (`firmware/hall-jaw/hall-jaw.ino`) is now the version for Lance's board (pins 0.02 and 1.15, LED flash every 5 s), with a `DEVICE_NAME` setting. Give the second board a different name, e.g. "SutureHero Jaw 2".

## Build 0.205 — Remove camera jaw tracking (Hall sensor only)

- Camera jaw tracking is removed. Jaws now come only from the Bluetooth Hall-sensor board. Removed: coloured, striped and solid-white ball tracking; the marker-relative jaw tracker; and handle-prism jaws. That is about 5,300 lines of code.
- Instrument calibration → Jaws now shows only the jaw sensor panel. The old "Jaw tracking" switch, ball assignment, closed/open capture and "Reverse jaw opening" controls are gone. The sensor's own closed/open calibration handles the direction.
- Camera tracking does a little less work per frame: no ball scans, and no decoding of handle-prism markers.

## Build 0.204 — Bluetooth Hall-sensor jaw input

- Bluetooth jaw sensor: Instrument calibration → Jaws → Jaw sensor (Bluetooth). It connects the Hall-sensor board (Seeed XIAO nRF52840 + OH49E, firmware in `firmware/hall-jaw/`), lets you pick the instrument it is on, and calibrates with "Set closed" and "Set open". The opening then drives that instrument's jaws in the practice scene. It needs Chrome or Edge on a computer; the iPhone's Safari has no Bluetooth support. Tested with a simulated sensor only.

## Build 0.203 — iPhone mode defaults to the 8-face ring

- iPhone mode always starts on the 8-face ring. It keeps its own tracker choice, so an older "prism" or "6-face" setting saved in the browser no longer overrides it. A tracker picked while in iPhone mode is still remembered for iPhone mode. Switching the camera type also switches to the tracker saved for that type.

## Build 0.202 — Fix Codex lock seating; full search back to 1 s

- Codex knot engine: with a knot type chosen in Practice setup (not "auto"), an opposing lock now registers as seated. Before, it never did (no "lock seated" message, trim hint hidden, lower closure load).
- Camera tracking: the full search for new instruments runs every 1 s again (0.201 had slowed it to 1.6 s).

## Build 0.201 — Tracking performance and fallback diagnostics

- Reduced periodic ArUco discovery scanning by 38% while keeping a complete full-frame discovery pass every 1.6 seconds. Diagnostics now report searched-pixel load, decode latency, stale results, and stereo rejection reasons automatically.
- Made stereo-to-single-camera fallback begin at the pose already on screen, then resume lateral movement without transferring accumulated camera bias. Approximate mono depth and plausible rotations continue from the last stereo anchor.
- Added a calibrated Hall-sensor jaw input boundary and deterministic synthetic source for hardware and replay development. No physical Hall transport is selected yet.
- Moved Tracking Lab recording and replay UI into a lazy-loaded chunk, reducing the initial simulator JavaScript by about 10% gzip.

## Build 0.200 — Codex knot mode and natural demo motion

- Added a selectable Codex knot engine that combines Claude's reliable short-tail grasp with event-ledger classification. Same-direction throws only count as a sliding start when the short post was taut; a verified opposing throw counts as a lock even if rapid input leaves an extra detected turn.
- Made the automated stitch-and-knot demo less robotic with smooth human-like acceleration, curved reaches, varied wrap cadence, and asymmetric releases.
- The quick comparison passed 8/8 scenarios for Codex after rejecting an experimental solver reduction that missed a fast jittered third throw.

## Build 0.199 — Claude engine: forceps use classic grasp

- Claude knot engine: the forceps go back to the classic grasp (nearest thread point). Only the needle driver's grasp is redirected to the short tail's end. Lance reported that in the demo the forceps did not take the strand again after the first throw. Synthetic tests only; not reproduced in this sandbox.

## Build 0.198 — Knot physics about 30% faster again

Knot physics faster again, same results (all engines): a knot takes about
30% less computer time than in 0.197, and about 65% less than before 0.193.
In the demo's tie, the median frame is now about 6 ms and only ~2% of
frames go over 16 ms (was ~8%).

## Build 0.197 — Claude's knot engine (robust free-end regrasp)

New knot engine option: "Claude's (classic + robustness fixes)". Same
thread physics and throw recognition as Classic, but when you close the
needle driver right at the short tail's end (or the forceps at the long
strand's end), it takes that end even if another stretch of thread lies
closer; Classic could grab the wrong strand and lose the next throw.
In the engine comparison it ties 21 of 24 test knots correctly vs 19.

## Build 0.196 — Experimental knot engine in a background thread

New knot engine option (Practice setup → Knot engine): "Classic in a
background thread (experimental)". The same knot model runs in a Web Worker
so its physics does not hold up drawing; the knot is shown a frame behind
the instruments. Works when the computer keeps up; if the worker falls
behind (very slow machines), knots may not seat. For the engine comparison.

## Build 0.195 — Knot physics about twice as fast overall

Knot physics faster again (same results): thread self-contact reuses its
candidate list across the many contact passes of each physics step. The
same knot now takes about half the computer time it did before build 0.193.
In the demo the tie's median frame is about 4–10 ms (was 9–17 ms); pulling
the ends apart about 17 ms (was ~32 ms).

## Build 0.194 — Knot engine switch

New Practice setup option: Knot engine. Free tying can run on different
knot implementations so they can be compared; for now only "Classic" (the
current one). Claude's and Codex's engines will appear here. Also settable
with ?knot=<id> in the link.

## Build 0.193 — Faster knot physics, same result

Free tying (and the demo's knot) runs faster: the same knot takes about 46%
less computer time, with exactly the same result (thread positions
identical to 17 digits). Less lag while tying.

## Build 0.191 — Free knots form with fast hands and low frame rates

Free tying: knots form more reliably with fast hands and low frame rates.
The thread used to lag behind the forceps while being wrapped around the
driver whenever the forceps moved too far per physics step (a quick hand,
30 fps, or a camera-tracking jump), so the wrap came up short and the throw
did not register. While the thread is wound on the driver, the physics now
takes extra, smaller steps when the gripping jaw moves fast.
- At 30 fps a surgeon's knot now locks at normal hand speed (it did not).
- The double first throw forms at up to 4× hand speed.
- The demo wraps in 2.5 s instead of 3.2 s.
Known limits: at 2.5× speed or more, and at 30 fps above normal speed, the
second throw can still fail to count as a lock.

## Build 0.190 — Demo: right-to-left pass with forceps eversion, natural speed

Demo changes from Lance's review:
- The needle now goes right to left: in through the right edge, out the
  left.
- The forceps grasp the right skin edge beside the bite and lift it to
  evert it while the needle enters, then let go.
- Everything moves at a more natural pace: the demo takes about 1½
  minutes instead of 2½–3 (faster handling, 57°/s needle drive, 3.2 s per
  wrap).
- Tightening is one continuous pull down and apart, then a short hold
  (longer for the last throw), instead of a slow move and a long pause.
- Grips on the thread ends retry if they miss, so the tie is reliable in
  the browser.

## Build 0.189 — Demo ends on a measured stitch summary

Demo, iteration 4: it ends on a summary measured from the simulation,
e.g. "Stitch complete · bites 5.1 mm / 5.2 mm from the edge · 2.9 mm deep
(dermis) · knot secure". The entry caption now says about 5 mm from the
wound edge (measured).

## Build 0.188 — Demo: natural needle pickup, drive and regrasp; seated knots hold

Demo, iteration 3 (more natural needle handling):
- The needle driver now picks the needle up from where it rests (jaws on
  the needle, shaft perpendicular to its plane) instead of the needle
  appearing in it, and carries it to the wound.
- It drives the needle until the tip is out, lets go, regrasps the tip and
  pulls the needle out along its curve, so its jaws never go into the skin.
  Bite about 6.5 mm from the edge, about 3 mm deep (dermis), 53° entry.
- The forceps wait out of the camera's way.
Sandbox fix: once a free knot's lock has been seated, the wound stays
closed and the stitch can be kept after you let go of the thread (it used
to spring open), and the knot is graded by the throws seated while tying.

## Build 0.187 — Demo: third throw and cutting the tails

Demo, iteration 2: the instrument tie now has a third throw (reversed
again), so the knot grades as secure, and the demo finishes by releasing
the thread, lifting the instruments clear and cutting both tails with the
scissors before keeping the stitch. About 2½–3 minutes on a normal computer.

## Build 0.186 — Demo by free physics: free pass and real instrument tie

The ▶ Demo now performs the suture with free physics instead of the scripted
guided exercise: the needle driver turns the needle through the skin as a
free Sandbox pass, then a real instrument tie forms from thread contact
(double wrap, pull through, lay flat and lower onto the skin; regrasp both
ends; opposing wrap; tighten). The stitch is kept at the end. About 2
minutes on a normal computer. More iterations follow (third throw, cutting
the tails, smoother motion).

## Build 0.185 — iPhone: outlines sit on the markers

Fix: on the iPhone the marker outlines were drawn small and in the wrong
place (they seemed to jump around, and markers read as "12 px"). The frame
copy used for decoding kept the camera sensor's orientation instead of the
picture's, so the image was squashed. Such frames are now copied upright
first. Seen in Lance's screen recording; not yet confirmed on the iPhone.

## Build 0.184 — Move-closer hint uses marker size in pixels

The "move the camera closer" hint now goes by how big the markers are in
the image (under 24 px per side), not by the estimated distance. The
distance depends on the camera calibration, so an uncalibrated iPhone said
"too far" with the markers clearly in view.

## Build 0.183 — iPhone: outlines follow markers more closely

iPhone mode no longer uses frame-by-frame capture scheduling. On the
iPhone it made marker following run on only every other camera frame
(about 16 updates a second instead of about 31), so the outlines lagged
behind the markers (Lance's 0.182 profile).

## Build 0.182 — iPhone opens Production with back camera; 8-face ring default

- On an iPhone (iPhone camera type) the page opens straight into Production
  mode with a large Start back camera button. One tap starts the rear 1×
  camera (iOS needs a tap before the camera can start).
- The 8-face ring is now the default marker tracker when none has been
  chosen. A saved choice (prism, 6-face) is kept.

## Build 0.181 — Hint when markers are too far from the camera

With one camera, the status strip now says when an instrument is too far
from the camera for its 12 mm markers (over 40 cm): "about 55 cm from the
camera · markers too small · move the camera closer (25–35 cm)". From
Lance's iPhone profile, where the markers were 36–55 cm away and the phone
was upright. Approximate guidance.

## Build 0.180 — iPhone camera mode

New camera type: iPhone in Safari (Camera controls → Camera type). It is
chosen automatically when SutureHero is opened on an iPhone.
- Uses the single 1× rear lens: if Safari picks the Back Dual Wide (or
  Triple/Ultra Wide) camera, the app reopens with the plain Back Camera.
  The dual camera switches lenses by itself up close, which made the image
  jump in scale and broke marker tracking.
- Requests 1920×1080 at 60 fps (less motion blur; Safari otherwise opens a
  low resolution) and uses frame-by-frame capture scheduling.
- The diagnostics resolution line shows the lens in use and warns when
  the phone is upright (portrait): hold it sideways.
Not tested on a real iPhone.

## Build 0.179 — Natural-looking knot wraps

Guided knot wraps (and the Demo) look more natural: the wraps now lie
tight on the needle driver shaft instead of forming a wide floating ring,
with adjacent turns. The forceps no longer trace a perfect constant-speed
circle: they loop in a wider-than-tall ellipse, speed up and slow down like
a hand, wobble slightly and drift along the driver. The wrap is still
guided (assisted), not free strand physics.

## Build 0.178 — Demo button: automatic simple interrupted suture

New ▶ Demo button (top right of the 3D view): the instruments perform a
simple interrupted suture by themselves, with large captions for
presentations: evert the edge, drive the needle, support the opposite edge,
transfer and extract, surgeon's knot (double then opposing throw), release,
pull check, trim both tails. About 3 minutes. Click ■ Stop demo to stop.
It plays the guided exercise with the same keys and buttons a learner uses
(guided motions are assisted). From the Sandbox it reloads with the PS-2
needle and starts by itself. The view buttons now wrap instead of covering
the scene title.

## Build 0.177 — Sandbox: forceps eversion and counter-traction count

Forceps technique counts in the Sandbox: the pass feedback credits an
entry through an edge everted with the forceps, and suggests everting when
entering near the edge without it. Holding the skin edge with the forceps
(counter-traction) raises the tear limits by 30%. Approximate.

## Build 0.176 — Sandbox: slow-motion replay with tip paths

- Replay ½×: plays the last 12 s of the Sandbox back at half speed, with
  each instrument's tip path drawn; the simulation pauses and resumes where
  it was. Click again to stop.
- The Sandbox session panel moved into the Session & stitch review drawer.

## Build 0.175 — Sandbox: session summary, spacing, targets, progress, export

New Sandbox session panel under the exercise feedback:
- Summary: passes, tears, cut-throughs, mean bite from the edge, depth,
  entry angle, tied stitches and secure knots.
- Stitch spacing review for tied Sandbox stitches (sorted along the wound),
  also in the bite-planning spacing line.
- Instructor targets (bite range, symmetry, entry angle, tears, even
  spacing) with ✓/✗; editable, saved in this browser.
- Progress: Save session to progress keeps up to 50 sessions and shows the
  trend over the last 5; Export session JSON downloads everything.
Approximate practice measures; not a validated assessment.

## Build 0.174 — Sandbox: knot security and edge approximation

- Knot security for Sandbox stitches: square vs granny throws, unseated
  throws, and fewer than 3 throws are named while tying and in the saved
  stitch review (secure / may slip / insecure). A knot that may slip loosens
  when the stitch is finished (keeps 70% of its closure).
- Edge approximation: edges meet / small gap / overlap, everted / flat /
  inverted, and which edge is higher.
Rule-based teaching feedback, not a mechanical knot test.

## Build 0.173 — Sandbox: thread drag and cut-through

Thread now drags through the tissue in the Sandbox: it slides through at a
limited speed (slower through longer tracts), so pulling the suture fast
makes it taut. Keeping it that taut for half a second cuts the thread
through the skin: the newest pass tears out toward the wound (dark red
split) and stops holding the thread. Pull the suture slowly along its path.
Approximate: thread tension is geometric, not a measured force.

## Build 0.172 — Sandbox: needle loading check, tear limits in mm

- Needle loading check: while the driver holds the needle in the Sandbox, the
  status says where it is gripped (percent from the swage) and warns when it
  is too near the swage or the tip (guidance: a third to half way along).
- The Sandbox readout states the skin type's tear limit in degrees and mm.

## Build 0.171 — Sandbox: hold the suture with either instrument

In the Sandbox, either instrument can now hold the suture outside knot
tying: close the jaws near the thread to grip it, move to pull it, open to
let go. Thread inside the tissue cannot be gripped, and an instrument that
holds the needle or the skin edge does not grip thread.

## Build 0.170 — Sandbox: passes meet the real skin; tears split it

- Free passes meet the live skin surface instead of a flat plane: no skin in
  the open wound gap, the cut edges roll over slightly, and edges lifted by
  the forceps or pulled up by stitches are higher. Bite distances are now
  measured from the wound edge.
- A torn pass splits the skin (dark red tear along the forced direction);
  torn skin holds no new stitch.
- Undo pass button: takes back the last pass or tear.
- Entry angle feedback (90° = perpendicular), with a hint when shallow.
- Camera jitter on a held needle no longer reads as forcing (forcing is
  smoothed over about 0.1 s; tiny twists ignored).
- Tear limits depend on the skin type; new "Fragile thin skin" type tears
  sooner. All values approximate.

## Build 0.169 — Sandbox: forcing tears the needle out

Forcing the needle hard off its curve (over 35° twist or about 7 mm off the
arc) for 0.4 s now tears the pass out: the needle comes free, the entry is
marked red, and a message says the tissue tore. Brief flicks and ordinary
forcing still only warn. Thresholds are approximate, not tissue-validated.

## Build 0.168 — fix: running-stitch thread jumping to the latest pass

With several passes, pulling the needle away after a pass made the thread
jump out of the earlier passes and stay only in the latest one: the loose
thread at the needle was allowed to use the whole strand first. Earlier
passes now keep their thread; pulling the needle further takes thread from
the free tail, and when the thread runs out it goes taut instead.

## Build 0.167 — Sandbox: several separate stitches, each tied

After tying a knot on a Sandbox stitch, the main button reads "Finish stitch
· next" once the knot is seated: the stitch is kept (knot and thread frozen
in place, wound closed at that stitch's own position along the wound) and
you get a fresh needle and thread to place the next one, as many as you
like. Each stitch now closes the wound where you actually placed it (before,
the live knot closed it at the middle of the pad). Reset practice clears
all stitches.

## Build 0.166 — Sandbox: tie a knot on your stitch (Stage B3)

After a free pass in the Sandbox, the "Free tying lab" button becomes "Tie
knot on this stitch": the knot-tying physics starts on your most recent
pass, with the thread ends at its real entry and exit. If the pass crosses
the wound and reaches the dermis on both sides, tightening the knot closes
the wound, and the stitch feedback covers the knot, closure and trimming as
for the guided stitch. Reset practice returns to the Sandbox.

## Build 0.165 — Sandbox: running stitch through several passes (Stage B2, part 2)

The thread now stays in every pass you make, in order: from the needle it
runs through your newest pass, across to the previous one, through it, and
so on, so you can build a running stitch. A new pass takes the thread only
once the needle's eye has gone in. If the strand runs out, the oldest
passes are pulled out. "Reset needle" now also takes the thread out of all
passes for a fresh start (their marks and feedback stay).

## Build 0.164 — Sandbox: the thread follows free needle passes (Stage B2, part 1)

In the Sandbox the suture now follows the needle through a free pass: it
feeds in at the entry behind the needle's eye, runs along the needle's path
through the tissue, and once the needle is through it stays threaded,
sliding through the tissue as you pull. The thread stays in your most
recent pass; keeping several passes threaded at once (a running stitch) and
tying knots come next.

## Build 0.163 — glide back, Reset needle, shorter Sandbox needle

- When the needle leaves the skin, the instrument glides from the needle
  back to your hand (about a quarter of a second) instead of jumping.
- "Reset needle" button in the 3D view (Sandbox): puts the needle back at
  its starting point and cancels a pass in progress; completed passes stay.
- The Sandbox now starts with a shorter trainer needle (PS-2 radius,
  108° arc instead of 135°, about 15 mm), so a free pass needs less
  rotation to complete. It is too short for the guided exercise's standard
  bite, so "Start guided exercise" switches to the PS-2. The trainer can
  be chosen again in Practice setup; microsurgery keeps the PS-2.

## Build 0.162 — the instrument stays on the needle while it is in the skin

In the Sandbox, while the needle is in the skin the instrument holding it is
drawn gripping the needle, instead of following your hand off the needle.
Your hand still drives the needle along its curve, and twisting against the
curve still shows the forcing warning (it compares against where your hand
really is).

## Build 0.161 — Sandbox: free needle passes anywhere (Stage B1)

In the Sandbox, push the needle tip into the skin anywhere on the pad while
holding it with the needle driver. Once in, the needle can only advance or
back out along its own curve, like a real curved needle; twisting against
the curve shows "Forcing the needle off its curve". Let go and it stays in
the skin; regrasp it with either instrument (e.g. the forceps on the tip
once it is out) and keep rotating to pull it through. Entry (teal) and exit
(amber) points are marked, and each pass is reported in mm: distance from
the wound edge at entry and exit, depth and deepest layer, and whether it
crosses the wound. Thread and knots for free passes come next.

## Build 0.160 — Sandbox is the default mode

The simulator now opens in a free-play Sandbox: no exercise steps, no
"Start guided pass" gate. Pick up the needle with either instrument, pass
it between them, put it down (a released needle drops onto the pad), and
lift the skin edges with the forceps, in any order. "Start guided
exercise" enters the step-by-step stitch; "Free tying lab" is unchanged;
"Reset practice" returns to the Sandbox. Free needle passes into the
tissue anywhere are the next stage (not yet).

## Build 0.159 — forceps jaws: rotation reading when the prism barely moves

With both cameras running, the handle-prism jaws were always read from the
prism's 3D position. On Lance's forceps the prism sits about 7 mm from the
hinge: the handle turns 26° but the prism moves only 3.3 mm, which stereo
jitter swamps, so the forceps stayed closed. The position reading is now
used only when closed and open are at least 10 mm apart; otherwise the
handle-rotation reading is used, and Calibrate open says so.

## Build 0.158 — forceps jaw prism IDs 18, 19, 28

The forceps' handle-prism faces are now ArUco IDs 18, 19 and 28 (was 18,
19, 31), to match the printed prism. The scissors' prism moved from 28, 29,
32 to 29, 32, 33 so no ID is shared. Needle driver unchanged (8, 9, 30).

## Build 0.157 — tip dots in the camera views; white axis line

- Each calibrated stereo tip is drawn as a dot (instrument colour, white
  outline) in both camera views, projected with the stereo calibration
  including lens distortion. If the dot sits on the real tip in both
  views, the tip calibration and stereo calibration agree.
- The ring's axis line in Camera 1 is white instead of black.

## Build 0.156 — stitch feedback in millimetres

Stitch feedback now reports real distances (the scene is at 27 mm per
unit): bite distance from the wound edge for each side ("4.1 mm / 4.3 mm
from the edge"), how far uneven bites are offset along the wound and in
height, stitch spacing, the largest gap between stitches, and the surface
and deep dermal gaps in the cross-section view. Before, these said
"practice units" or only "symmetric / uneven".

## Build 0.155 — tip accuracy check

Calibrate → tip section → "Accuracy check": touch the two real tips
together at 6 spots around the workspace, pressing "Record touch" each
time. It reports how far apart the measured tips were (average and worst)
and where the worst touch was (left/right, near/far from Camera 1), and
keeps the last result with its date. Re-run it whenever a camera may have
moved.

## Build 0.154 — jaw orientation (roll) for calibrated instruments

Calibrate → tip section → "Set jaw orientation": hold the instrument with
the jaws opening sideways (finger rings level, side by side) and press it.
From then on the virtual instrument's whole orientation, including its roll
about the shaft, follows the ring's measured rotation, so the plane the
jaws open in matches the real one. Saved with the tip calibration.

## Build 0.153 — motion metrics (research)

Diagnostics → "Motion metrics (research)": Start / Stop recording the
calibrated stereo tips, a live summary per instrument (tracked time, path
length, mean speed, idle time, number of movements) and how much of the
time both hands moved at once, and "Export JSON" with the summary,
thresholds and every sample. Approximate, not validated: for comparing
attempts, not for assessment.

## Build 0.152 — smooth slow movement (no stair steps)

The stereo "rest lock" held an instrument still until a pose was 2.5 mm
away, so slow needle-driving moved in jumps of up to 2–3 mm. It now also
watches a short running average of positions: jitter averages out, steady
drift does not, so slow intentional movement is followed smoothly. At
10 mm/s the largest frame-to-frame jump went from 1.3 mm to 0.34 mm (the
movement itself). A still instrument is still held steady.

## Build 0.151 — true 1:1 scale for stereo

Stereo-tracked instruments are now placed at the scene's real scale, 27 mm
per scene unit (the scene's needles and pad are modelled at that size: the
PS-2 is 19 mm long, the pad about 70 × 90 mm). Real and virtual distances
match: a 5 mm hand movement is a 5 mm movement against the needle and skin.
The workspace axes still set directions; the sweep no longer sets the scale
and its button is hidden.

## Build 0.150 — Tracking Lab: both cameras and the virtual view in one row

Camera 1, Camera 2 and the live virtual instruments now sit side by side at
the same height, so all three are visible without scrolling (stacked on
narrow screens).

## Build 0.149 — stereo instruments no longer move in slow motion

The stereo pose filter smoothed every movement with a fixed 0.28 s time
constant, so the virtual instruments trailed by about a third of a second.
It now smooths heavily only when nearly still and lightly while moving.
Steady movement through the whole filter chain (simulated):
50 mm/s 18 → 6 mm behind; 100 mm/s 31 → 5 mm; 200 mm/s 158 → 5 mm.

## Build 0.148 — guided stereo setup in the status strip

In stereo mode the checklist above the practice view now walks through the
whole setup in order: 2 cameras → Stereo calibration → Workspace → Tips →
Table → Neutral → Jaws. The first unfinished step is highlighted as
"Next: …"; each button opens the place that does it (hover for details).

## Build 0.147 — the table as the skin surface

Calibrate → tip section → "Record table touch": rest a calibrated tip on
the table and press it at 3 spots. The shared stereo space is shifted so
the table sits exactly at the virtual skin surface: instruments resting on
the table rest on the skin, and nothing gets pinned at the scene floor.
Saved for the current stereo calibration; "Clear" removes it.

## Build 0.146 — measured tips shown in the 3D view

With stereo-measured tips, each instrument shows a dot at its measured tip
(in its own colour) and a small white dot at the grasp point 3 mm up the
shaft, drawn on top of everything. Only instruments with a measured tip
get dots; they are hidden in Production mode.

## Build 0.145 — grasp reach in real millimetres

With stereo-measured tips, the needle can be picked up when it is within
4 mm of the jaw point (3 mm up the shaft from the tip), and handed to the
forceps within 6 mm, whatever the workspace scale. Before, the reach was a
box in scene units whose real size changed with the scale. Keyboard jaws
(Z / comma) work for testing until the jaw prisms are printed.

## Build 0.144 — stereo tips in one shared space; open/closed jaws

- **Tip calibration (2 cameras).** Calibrate → "Tip · 2 cameras" →
  Calibrate tip: rest the instrument tip on one spot and rock it for 8 s.
  The app solves where the tip is relative to that instrument's ring
  (pivot calibration), replacing the fixed 55 / 110 mm guesses.
- **Shared space.** With stereo active and a calibrated tip, the
  instrument is placed at its real tip position in the stereo workspace,
  with no per-instrument offset, and its shaft points from the tip toward
  the ring. Real tips touching should now mean virtual tips touching.
  Instruments without a calibrated tip behave as before.
- **"Tips apart" readout** under the tip section: the forceps–needle
  driver tip distance in mm, to check by touching the real tips.
- **Handle-prism jaws: open/closed only** (on by default): open above
  65%, closed below 35%. Untick "Open/closed only" for the percentage.

## Build 0.143 — panels no longer jump when status messages appear

The tracking status strip (checklist, camera-moved warning, "holding"
reasons) is now a single row of fixed height. Messages appearing or
clearing no longer push the panels below up and down; long messages end
with "…" and show in full on hover.

## Build 0.142 — more accurate checkerboard corners for stereo calibration

Stereo calibration now finds the board's corners with OpenCV's newer
checkerboard detector on the full-size image. Lance's 2026-11-14 captures
failed with "Camera 1 intrinsics are unreliable (RMS 3.54 px)": the old
detector placed corners along the board's outer edge up to 28 px off. With
the new detector the same captures fit to 0.84 / 0.55 px (12 usable pairs,
the minimum). Falls back to the old detector if the new one is unavailable
or finds nothing. A white border around the printed pattern also helps.

## Build 0.141 — larger camera views

- New **Full-window cameras** button next to "Enlarge camera preview": both
  live camera views fill the browser window (about 2.5× the area at
  1440×900), with their tracking overlays. Close or Esc returns.
- With two cameras the views are placed side by side or stacked, whichever
  shows them larger, both in the camera panel and in the full-window view.

## Build 0.140 — Production mode

New **Production** tab next to Simulator / Tracking Lab: a polished
full-screen presentation of the live 3D scene for demos. Shows the
SutureHero name, the procedure and current step, the tracking badge and
the instrument legend; hides setup, calibration, diagnostics and the
simulator's buttons. "Full screen" fills the monitor; Esc or "Exit" returns.
Instruments follow camera tracking exactly as in the simulator.

## Build 0.139 — virtual instruments in Tracking Lab

Tracking Lab now shows the simulator's 3D view ("Virtual instruments
(live)") under the camera views, so you can see what tracking makes of the
cameras while recording. It is the live view: during replay it still
follows the live cameras, not the recording.

## Build 0.138 — handle-prism jaws: 0 ↔ 100% swing fixed

- The hinge angle could come out as +346° instead of −14° (the same
  rotation written the other way round), which pushed the opening to 100%.
  Found by replaying Lance's Tracking Lab recording: with the jaws closed
  and only face 9 + ring visible, the reading jumped to 100% on about half
  the frames. Fixed; the same recording now reads 0% throughout.
- "Align prism faces" no longer rounds a face's offset to the ideal prism
  layout unless it is within 4° (was 25°). In the recording, face 9's
  rounded offset left it reading about 15° past closed, as much as the whole
  closed → open range. **Redo the calibration** for it to take effect.

## Build 0.137 — handle-prism jaws use one camera image

Camera 1's markers come partly from optical flow (newest image) and partly
from the marker decoder (an image 50–80 ms older). The handle-prism jaws
combined a fresh ring with an older prism face, so moving the instrument
looked like the handle turning: Lance saw 0 → 100% → 0 while wiggling with
only face 9 visible. The ring and the prism face now have to come from the
same camera image; until they do, the last opening is held and the status
says "prism and ring not in the same Camera 1 image yet (moving)".

## Build 0.136 — handle-prism jaws ignore mirrored faces

With one camera, a single handle-prism face can be solved as its mirror
image, which made the jaws open or close by themselves while the instrument
was turned. Once the jaws are calibrated, each face is now solved several
ways and the solution that fits a turn about the calibrated hinge is used.
A reading more than 15° off the hinge axis is skipped and the last opening
is held; the status then says "does not fit the hinge (likely a mirrored
face)".

## Build 0.135 — camera frames read straight from the camera

With the OV9281 camera type, camera frames are now read straight from the
camera stream as they arrive, not through the on-screen video. Before this,
the app could only use as many frames as the browser drew the page (30 a
second on Lance's PC), so a 120 fps camera gave 30 usable frames. The
exported profile now shows `frameSource` ("camera track" when this is on).
Diagnostics → Performance → "Camera frames processed" → "At display refresh" goes back to the
previous behaviour.

## Build 0.134 — readable camera labels

The "Camera 1" / "Camera 2" labels on the camera views were pale text with a
soft shadow on a light background, which looked blurred. They now sit on a
small solid label.

## Build 0.133 — layout tidy-up

- Practice view: when it is narrow (e.g. laptop width with camera and
  calibration open), the title wraps clear of the view buttons and the
  orbit hint / live-view line are hidden instead of overlapping.
- Calibration: "Set neutral pose" is now at the top, under the instrument
  buttons, visible on every tab; the Pose / Jaws / Axis mapping tabs sit
  above the live preview. The drawer has one heading ("Instrument
  calibration") instead of three.
- Camera panel: "Camera controls · type, focus & exposure" starts
  collapsed; the second camera's chooser and start/stop moved out of it to
  sit under camera 1's row. The camera-type dropdown matches the text size.

## Build 0.132 — sub-pixel marker corners; steadier single-camera depth

The marker corner refinement only snapped corners to the nearest whole
pixel. A 33 px marker could then read as 33×34 px; the tilt correction took
that for a slight tilt and reported the marker ~3% larger, so single-camera
depth drifted when the marker's apparent size changed slightly (e.g. hand
tremor). Corners are now refined to sub-pixel precision (parabola fit of
the corner response). The depth-stability check now passes 6/6 (was ~1/3).
Synthetic test only; affects every decoded marker, so watch tracking
generally on real hardware.

## Build 0.131 — status strip: setup checklist, camera-moved warning, holding reasons

A strip under the header shows:
- a setup checklist (camera(s), stereo calibration in stereo mode, neutral,
  jaws when jaw tracking is on). Green = ready, amber = needs attention;
  hover for what is missing, click to open the step that fixes it;
- an orange warning when the stereo fit stays above 3 px for most of 4 s
  (usually a camera moved since calibration);
- short reasons when an instrument is holding instead of updating (markers
  not visible, depth held, one camera only, cameras out of step).
Synthetic tests only; not yet tried with real cameras.

## Build 0.130 — "Start 2 cameras + metric 3D" on the main bar

The stereo start button was only inside Tracking setup → Stereo
calibration. A shortcut now sits on the main bar next to Diagnostics; its
messages (for example "select a second camera") appear under the camera
views. The original button is unchanged.

## Build 0.129 — neutral pose remembered after reload

"Set neutral" now saves the neutral pose in the browser
(`suturehero.instrument-neutral.v1`), per instrument and separately for
one-camera (marker-size depth) and two-camera (metric depth) tracking.
After a reload the saved neutral is used instead of the first pose the
camera sees. If the camera has moved, set neutral again.

## Build 0.128 — optical flow backs off automatically if it loads the page

Each optical-flow update briefly uses the page's main thread to hand the
camera frame to the flow worker. With two 120 fps cameras that could add up
to more time than the page has. Flow now measures that cost per camera and
spaces its updates so it uses at most about 15% of the main thread, never
dropping below about 30 updates per second. Where the cost is small (most
real GPUs), flow still runs at the full camera rate. Exported profiles now
include the measured cost and chosen interval (`flowBackoff`) and show the
correct build number (they had said 0.124 since build 0.125).

## Build 0.127 — header buttons no longer hidden at mid widths

Between about 760 and 1100 px wide the header's buttons wrap onto a second
row, but the header stayed 64 px tall, so the second row (Reset practice,
Tracking setup, Diagnostics) slid under the camera panel and calibration
drawer and could not be clicked. The header now grows to fit.

## Build 0.126 — marker list shows only markers actually seen

The tracking page's marker list included outlines that optical flow was
still carrying after their face had turned away (for 3–6 s in a synthetic
test), so hidden ring faces appeared as "visible". It now lists only
markers decoded in the last 650 ms, as the overlay already did. Pose
estimation was not affected: it already required recent decodes.

## Build 0.125 — stereo handle prism: every face now gives the same axis point

Two-camera jaw tracking turns each triangulated prism face into a point on
the prism's centre line. The step from the face to the centre line went
outward instead of inward, so each face gave a point about two apothems
(≈ 11 mm for 19 mm faces) away from the others. When the visible face
changed (e.g. rolling the instrument), the opening reading jumped. In the
synthetic two-camera check the pose that shows only face 30 now reads 44%
instead of 89% (true 50%). Synthetic test only; not yet tried on hardware.

## Build 0.124 — whole-frame marker scans split into quarters

While instruments are tracked, each camera looked for new instruments with
one whole-frame scan per second (60–160 ms each in the 0.116 profile),
which caused the marker-age spikes. Discovery now scans one overlapping
quarter of the frame every 250 ms (same full coverage each second, about a
quarter of the cost each time). Recovery scans (nothing tracked, repeated
misses) and the first scan still use the whole frame.

## Build 0.123 — process camera frames as they arrive (for 120 fps cameras)

Camera frames used to be picked up only when the page redraws (about 30 Hz
in Lance's profiles), and optical flow ran at most every 20 ms. Now each
camera's frame callback can start its processing as soon as a frame
arrives, with optical flow allowed every 4 ms. Setting in Diagnostics →
Performance ("Camera frames processed"): Auto (default: as they arrive for
the OV9281 camera type, unchanged for the current webcams), On or Off.
Lab replay keeps the previous path. Not measured on 120 fps hardware yet.

## Build 0.122 — stereo pairs the cameras by real capture time

The two cameras are not synchronised. Stereo used to pair their frames by
when the app read them, which includes 15–19 ms of camera/browser delay that
differs per camera. Chrome reports each frame's camera capture time; stereo
now pairs (and interpolates) on that, falling back to the read time when a
browser does not report it. New profiler row per camera: "capture to read".
Frame-age statistics are unchanged (still from the app's read time).

## Build 0.121 — optional: ArUco regions read in the worker

New switch in Diagnostics → Performance, off by default: "ArUco decode
regions as transferred bitmaps". When on, each marker-decode region is a
cropped bitmap that the ArUco worker reads, instead of a main-thread canvas
draw + readback (~4 ms per decode, p95 15 ms, in Lance's 0.116 profile).
Off by default because in the headless test (software graphics) it made
decode results ~14 ms older; compare both with the profiler on real
hardware. The profiler report records both switches.

## Build 0.120 — OV9281 camera type; optical flow reads a quarter of the pixels

- **Camera type** (Camera controls · focus & exposure): "Current webcams
  (1920×1080 @ 30 fps)" or "OV9281 global shutter (1280×800 @ 120 fps,
  monochrome)". Saved in this browser; applies when a camera is started.
  The profiler report records it.
- **Optical flow:** the flow bitmap is requested at half the flow
  resolution (480×270 for 960×540). The flow worker's image pyramid starts
  at half scale anyway, so the GPU now does that step and the worker reads
  and converts a quarter of the pixels. Marker coordinates are unchanged.
  Synthetic profile: flow worker 8.0 → 3.1 ms per update, readback 2.6 →
  0.5 ms, flow frame age 25 → 17 ms.

## Build 0.119 — stereo calibration in the app; stereo handle-prism jaws; clearer board capture

- **Solve and use calibration** (Calibrate tab, stereo capture): after the
  guided checkerboard capture, the app refines the corners at full
  resolution and solves the stereo calibration itself (same method and
  validation gates as the Python script), then applies it. No JSON export
  or upload needed. Export captures remains for the offline solver.
- **Board capture feedback:** outlines are green only when the pair will be
  saved; yellow with the reason written on the camera view when both boards
  are fine but the pair is waiting (hold still, timing, duplicate pose).
  Boards are checked every 300 ms instead of 650 ms.
- **Handle-prism jaws with both cameras:** Lance's recording showed one
  camera's view of a 12 mm prism face often flips 40–160° and its depth is
  unusable. With stereo active, prism faces seen by both cameras are
  triangulated, and the jaw opening is measured from the prism's position
  relative to the ring (rolling no longer matters). Calibrate closed/open
  record it automatically; falls back to the single-camera method otherwise.
  New "Prism face width (mm)" setting (default 19). Unit tests only so far.

## Build 0.118 — "Align prism faces": the software learns your prism's layout

Rolling the instrument with the jaws still made Lance's handle-prism
reading open and close: the stickers' layout (face order or orientation)
does not match the software's prism model, so each face change looked like
a handle rotation. New step between Calibrate closed and Calibrate open:
Align prism faces — keep the jaws closed and roll so each face is seen.
Each face's correction to the reference face is learned and snapped to the
nearest physically possible layout (sticker on another face and/or turned
by 90° steps), removing pose noise. Until a face is aligned it is not used.
Synthetic check: a prism with faces 9 and 30 swapped reads the same as a
correct one after alignment.

## Build 0.117 — handle axis and estimated hinge in the camera view

With the handle-prism jaw tracker selected, Camera 1 now shows an orange
line along the handle prism's long axis, as the software sees it, and an
orange triangle where that line crosses the black ring-shaft axis (an
approximate image of the hinge). For checking whether the prism's pose is
read the way it is mounted. Display only.

## Build 0.116 — optical flow about 2–3× cheaper, same results

Profiling the flow worker showed 73% of its time in one loop: the coarse
block search that finds each marker in the next frame, which recomputed the
same bilinear weights for each of 1,250 offsets. They are now computed once
per sample (identical results). The frame-to-grayscale step also skips edge
clamping for interior pixels (bit-identical). Per marker: 1.65 → ~0.7 ms;
grayscale + pyramid: ~2.4 → ~1.6 ms (Node). Synthetic browser test: flow
worker 22.6 → 8.0 ms per update, flow now runs on every delivered frame,
flow frame age 46 → 25 ms. No tracking behaviour changed.

## Build 0.115 — flow worker no longer processes frames it may never use

Lance's 0.112 profile: the main thread got lighter (tracking frame 13.2 →
6.4 ms) but optical flow slowed (Camera 1 21 → 15 updates/s, worker 20 →
28 ms). Part of that was a mistake in 0.111: every decode-only frame was
turned into an image pyramid in the flow worker (~20 ms) in case a seed
needed it. Such frames are now kept as unread bitmaps and processed only
when a seed actually uses them; unused ones are released.

## Build 0.114 — Camera 2 confirms the handle-prism jaw reading

The handle's rotation relative to the ring is the same whichever camera
measures it, so Camera 2 now measures it too, with the same calibration
(no stereo calibration needed). When both cameras agree within 8° their
readings are averaged; when they disagree, the one nearer the last good
reading is used (the other is likely a single-marker flip); when one
camera's view is blocked, the other is used alone. The Jaws panel shows
which camera(s) the reading came from. Synthetic test covers one camera
only; the two-camera combination is untested until real hardware.

## Build 0.113 — steadier handle-prism jaw reading

The handle-prism opening jumped around on real hardware: each reading comes
from two noisy single-camera poses. The opening now goes through a filter:
median of the last 5 readings, a jump over 30% of the range must repeat
before it is followed, then light smoothing. Adds roughly 0.1–0.15 s of
delay. Synthetic test plus unit tests only.

## Build 0.112 — handle-prism calibration tolerates real pose noise

With the instrument held still, Lance's closed capture failed with "The
instrument moved during the capture": every sample had to be within 3° of
the mean, but the ring and prism poses (one camera, 12 mm markers) each
wobble 1–3° per frame with occasional flips. Captures now take 20 samples,
drop outliers beyond 5° of a robust mean, and need at least 60% inliers;
real movement is still rejected. A failed capture reports the spread, and
Calibrate warns when "Jaw tracking" is off instead of waiting silently.

## Build 0.111 — optical-flow frames go to the worker as bitmaps (stage 1)

Each camera's optical-flow frame is now a scaled ImageBitmap transferred to
the flow worker, which reads the pixels itself. The main thread no longer
draws the frame into a canvas or calls getImageData for flow (~4 ms per
frame per camera in Lance's 0.110 profile), and a marker decode re-anchors
optical flow from the frame the worker already holds instead of a second
copy. Lab replay, browsers without createImageBitmap/OffscreenCanvas, and
any bitmap error use the previous path. Diagnostics → Performance has a
switch to compare both paths live. Synthetic headless test: tracking-loop
main-thread time 11.2 → 6.6 ms per frame; real-camera effect to be measured.

## Build 0.110 — live performance profiler (measurement only)

Diagnostics → Performance: tick "Enable live profiler" (off by default).
Per camera: requested vs actual resolution/frame rate, delivered-frame
cadence from requestVideoFrameCallback (currentTime fallback), missed
presentations, capture→page time where the browser reports it, processed
marker-decode and optical-flow rates, frame age at result, and skipped or
discarded work. Per stage: rolling mean/median/p95 over ~120 samples, rate,
and busy time, labelled by camera (1, 2 or shared) and thread (main or
worker). A breakdown names the largest measured cost and shows main-thread
shares without double counting nested stages; workers are shown separately
because they run in parallel. Copy or download a JSON report (no images,
camera labels or device IDs). No tracking, calibration or rendering changes.

## Build 0.109 — handle prism jaw tracking (new, synthetic tests only)

New jaw tracker option, "Handle prism (new)", in the Jaws section: a
triangular ArUco prism on the moving handle. Needle driver IDs 8, 9, 30;
forceps 18, 19, 31; scissors 28, 29, 32. Prism layout is the original
3-face prism tracker's: 12 mm markers, faces 120° apart around the long
axis, each marker's top edge across that axis, faces in ID order. Calibrate
closed, then open; the hinge axis is learned from the two captures. The
opening is the handle's rotation about that axis relative to the ring.
Uses the marker detector that already runs, so it costs almost nothing per
frame. Synthetic check: correct within 0.11 at 6 of 7 test poses; one
rolled pose (only face 30 visible, ring faces 0/3–6) still reads 0.

## Build 0.108 — ring shaft axis drawn in the camera view

Each visible ring tracker now has a black line along its shaft axis (60 mm
each side of the ring centre) in the Camera 1 view. This is the reference
the planned handle prism's rotation will be compared against. It uses the
approximate single-camera ring pose.

## Build 0.107 — Jaw tracking switch in the calibration Jaws tab

Instrument calibration → Jaws now starts with a "Jaw tracking" checkbox.
The old "Enable jaw tracking" checkbox in the experimental jaw section is
removed from view (it remains as hidden internal state, so saved settings
carry over).

## Build 0.106 — jaw tracking back to one frame copy per camera

Reading each small jaw search area separately turned out slower on Lance's
PC: 45 ms per update through a CPU canvas (0.100–0.102) and 28 ms through
a GPU canvas (0.103–0.104), against ~8 ms for 0.98's single grayscale copy
of each camera frame. This restores the 0.98 method.

## Build 0.105 — hold the stereo pose between stereo updates

Between stereo poses, the instrument followed changes in each camera's own
single-marker estimate. Those are noisy on 12 mm markers, so a still
instrument jumped on nearly every frame, even though the stereo poses
themselves were steady (replay of the 1:03 AM recording: under 0.1° after
the rest lock). The last stereo pose is now held until the next one.
Movement may look slightly steppier at the stereo update rate.

## Build 0.104 — "Enable jaw tracking" switches jaw tracking off completely

The existing "Enable ball tracking" checkbox (renamed "Enable jaw
tracking") now also stops the white-ball jaw tracker, which used to run
regardless. Unticked, no jaw work is done, leaving the time for instrument
tracking.

## Build 0.103 — fix the jaw-tracking slowdown from 0.99

0.99 made jaw tracking read small regions, but through a CPU canvas, so
each region draw copied the whole video frame: ~45 ms per update and the
tracking loop fell to 13 fps (0.100 report). The region canvas is now
GPU-backed, so only the small region is read back. Not measured on real
cameras yet.

## Build 0.102 — jaw opening holds during fast moves

Moving the needle driver quickly with the jaws closed briefly read them as
wide open. The two cameras are not synchronized (frames up to ~70 ms
apart), so during a fast move each ball is triangulated from two different
moments. While the ring moves faster than 3 marker sides per second, the
jaw opening now holds its last value. Synthetic tests only.

## Build 0.101 — rest lock for stereo; single-camera backup holds position at rest

A still-instrument recording on 0.100 showed the stereo pose itself
wobbling 0.5–3.4° per frame (under ~1.3 mm), from 12 mm markers. While the
stereo pose stays within 3° and 2.5 mm of the held pose, the instrument now
stays put and only drifts slowly toward the average; larger changes are
followed at once. The single-camera backup also keeps the last stereo
position while its own estimate only jitters (under 6 mm sideways, 40 mm in
depth). Synthetic tests and a replay of the recording only.

## Build 0.100 — stereo instrument no longer jumps at rest

Between stereo poses, and whenever stereo has not updated for a moment
(always at rest, because an unchanged image is not re-solved), the rendered
rotation followed single-camera marker poses. On 12 mm markers those wobble
a few degrees and sometimes flip tens of degrees per frame. Single-camera
rotation changes under 4° or over 30° are now ignored, so the last stereo
rotation holds. Synthetic tests only.

## Build 0.99 — jaw tracking reads only the areas around the balls

The 0.97 report showed jaw tracking taking 9 ms per frame on average and
30 ms at worst, because it copied each camera's whole frame back from the
GPU. It now copies only the small search areas around the ring.

## Build 0.98 — fewer full-frame marker scans while tracking

While an instrument is tracked, each camera now scans the whole frame for
new instruments once a second instead of every 350 ms. Those 1080p scans
took ~100 ms and delayed the tracked instrument's own marker reads, so only
~2 stereo poses per second got through (0.96 report). A newly shown
instrument may take up to a second to be found. The performance report now
shows the real needle-driver jaw pattern (it said "striped10" for white).

## Build 0.97 — stereo holds on while tracking; lighter jaw tracking

Once stereo has a pose, a joint fit with up to 5 px error (10 px worst
corner) is kept if it is within 10° and 15 mm of the previous pose. Starting
still needs the strict 3 px limit. In Lance's 0.96 report, fits over 3 px
caused about 120 stereo dropouts per minute; small 12 mm markers make 3–5 px
normal. Jaw tracking now runs at most ~15 times per second outside
calibration, and the performance report has a "Jaw tracking" row.
Synthetic tests only; needs a new report on real hardware.

## Build 0.96 — jaw tracking no longer slows the page; workspace steps wait for the move

Jaw ball searches were slowed ~8× by testing every pixel against every
marker outline (to ignore the markers' white borders), several times per
search and in both cameras in stereo, making the whole page lag. Marker
outlines are now drawn into a mask once, all ball sizes are searched in one
pass (20 ms → 1.7 ms per search), each camera frame is read back once per
frame, and the stereo ball search runs at most ~15 times a second.

Workspace (stereo) steps 2–4 now wait until the instrument is at least 5 cm
from neutral and then held still before capturing (they previously
captured immediately), and Neutral waits for stillness.

## Build 0.95 — stereo workspace calibration

Tracking setup → stereo now has **Workspace (stereo)**: capture 1. Neutral,
2. Right, 3. Forward and 4. Up (about 10 cm each, from neutral), then
5. Sweep through the space you will use. Stereo positions are then expressed
along your desk's right/up/forward axes (made exactly perpendicular) instead
of camera 1's axes, so forward is forward whatever the camera tilt; the sweep
scales your working space to fill the pad (before a sweep: 100 mm per scene
unit). Saved per stereo calibration. Orientation (rotation) is unchanged.

## Build 0.94 — less rotation lag

Rotation smoothing now adapts to turning speed (a "One Euro" style filter on
a smoothed angular-velocity vector, so jitter averages out while real turns
accumulate). Previously a slow steady turn always got the heaviest smoothing
and trailed ~140 ms behind. Steady-turn lag: 30°/s 4.3° → 1.4°, 60°/s 7.0°
→ 1.2°. At-rest jitter suppression is unchanged (existing tests pass).

## Build 0.93 — stereo jaw opening from the 3D ball-to-ball distance

In stereo, the jaw opening now comes from the real 3D distance between the
two jaw balls, triangulated from both cameras, instead of from where the
balls sit relative to the ring. It no longer depends on which ring marker
is visible, or on the instrument's distance or angle. Calibrate closed/open
records the distance in each state (median over the capture); recalibrate
the jaws in stereo to enable it. Pairings must have meeting camera rays and
a spacing near the calibrated one, so stray bright spots are rejected. When
a ball is not visible in both cameras, the ring-relative method is used.
Unit-tested; not yet validated on real two-camera footage.

## Build 0.92 — jaw balls stay locked

The white-ball jaw tracker now locks onto each ball: it predicts where the
ball will be from its recent motion along the jaw path, searches there
first (over a range of sizes), and if the ball no longer looks like a clean
round blob (blur, partial blocking) it follows the bright spot at the
predicted position. A lock is dropped after 0.3 s without any measurement.

## Build 0.91 — jaw calibration measures the white balls itself

Clicking the balls for Calibrate closed/open now searches a wide range of
sizes and measures each ball's real diameter from the ring's distance, so the
ball-size setting is only a starting guess (the field updates to the
measured value). Lance's balls appear ~6–8 mm and were rejected as "not a
10 mm ball". The synthetic check passes with the setting at 6, 10 or 16 mm.

## Build 0.90 — one corrected ring model for single-camera and stereo

The mirror correction from 0.89 now lives in the shared ring model
(`faceGeometry` in `src/input/prismPose.ts`, layout revision 2), so
single-camera tracking, stereo, the jaw tracker and the Tracking Lab all use
the physical ring. It is a reflection of depth (z → −z), which keeps the
previous orientation convention for faces 0 and 3; tracked positions move to
the true ring centre (about 33 mm). On Lance's recordings, single-camera
fits that combine faces improved (median 1.41 → 1.01, 2.31 → 1.77 and
1.14 → 0.77 px; worst 6.8 → 2.2 px); stereo results are identical to 0.89.
**Recalibrate** neutral pose, Near/Far depth and jaws: saved depth and jaw
calibrations from the old layout are no longer reused.

## Build 0.89 — stereo uses the correct (unmirrored) ring layout

Triangulating Lance's recordings showed the ring model is the mirror image
of the printed ring: neighbouring markers sit on the other side of each
marker's plane. One marker alone fits either way, which is why
single-camera tracking works, but stereo fits combining several markers
failed and single-marker fits disagreed by 60–120°, so the instrument jumped
even at rest. Stereo now uses a mirror-corrected layout
(`src/input/ringChirality.ts`) and reports poses in the existing convention.
On Lance's at-rest recording every frame now fits using several markers
(< 1 px) and the pose changes by a median 0.5° (max 1.4°) between frames.
Single-camera tracking is unchanged.

## Build 0.88 — stereo pose stabilization

Accepted stereo measurements now pass through a stereo-only continuity gate
and temporal filter before moving the virtual instrument. Isolated alternate
pose solutions are rejected, while a sustained new pose can reacquire after
three consistent samples. The normal render filter and mono tracking path are
unchanged.

## Build 0.88 — stereo no longer flips between single-marker fits

When the two cameras' markers cannot all be fitted together, stereo falls
back to a marker seen by both cameras. It previously chose the lowest-error
marker each frame, which could alternate between markers whose answers
differ by tens of degrees, so the instrument jumped while still. It now
keeps the fit nearest the previous pose (remembered for 0.5 s), and holds
rather than jumping more than 25°. On Lance's recording: jumps over 20° went
from 4 to 0 (largest turn 64° → 9.8°).

## Build 0.87 — Tracking Lab: reachable controls and compact export

The Tracking Lab now scrolls within its own area, so Import, the recording
library and Export stay reachable on shorter screens without zooming out.
Each recording has **Export compact**: images are re-encoded smaller (1280 px
at JPEG 80%, stepping down to 960 or 800 px if needed) to stay under about
28 MB. Recorded frame sizes are kept and replay scales images back up, so
coordinates and calibrations are unchanged; only image detail is reduced.
Lance's 1.9 s stereo clip went from 17 MB to 5.4 MB. Longer clips may still
need to be recorded shorter.

## Build 0.86 — white-ball jaw setup works from the angled ring markers

The new jaw tracker now uses the angled ring markers (6 and 7) when no
flat-side marker is visible, now that their placement is modelled correctly.
Flat-side markers are still preferred when visible. When a ball click fails,
the message says why: no ring markers, a poor ring fit, a click outside the
image, or no white ball of the set diameter at that click.

## Build 0.85 — measured 12 mm ring markers and stereo outlier recovery

Ring poses now use the measured **12 mm black square**, rather than the 16 mm
white label. Angled pads now sit beside the side markers’ top edges, matching
the physically confirmed label layout. Pad dimensions and legacy prism geometry
remain unchanged. If extra
faces corrupt a joint stereo fit, the solver can retry a shared square seen by
both cameras, keeping the existing per-camera/corner reprojection limits. A
small single-marker rotation prior preserves tilt stability at the reduced
pixel footprint; the existing noise regression remains unchanged.

Stereo checkerboard calibration is retained. Ring Near/Far captures and
marker-relative jaw calibrations made with the old 16 mm assumption need
recapturing. New saved jaw models include the physical marker size; compatible
legacy prism models continue loading. De-identified recorded corner fixtures
cover the actual failure, including rejection of missing or corrupted views.

## Build 0.84 — stereo explains why it is not used

When metric stereo is enabled but an instrument gets no stereo pose, the
stereo status line (Tracking setup) and each Tracking Lab frame now say why:
no time-matched camera pair (which camera, how old, or the frame gap), a
camera that sees no marker of the instrument, markers too small, or the fit
error against the 3 px limit with the error of each marker in each camera.
The performance report lists the latest reason per instrument
(`stereoRejections`) and counts each kind. Stereo behavior is unchanged.

## Build 0.83 — Tracking Lab recording and pipeline replay

A dedicated top-level Tracking Lab workspace records both camera streams at
native resolution into browser IndexedDB, including independent timestamps,
configuration, calibration and available diagnostics. Recordings automatically
stop after 30 seconds by default and support rename, delete and one-file export/import.
Replay sends saved images through the existing marker, pose, jaw and stereo code
in an isolated context. It supports seek with state reconstruction, frame stepping,
speed selection, current/predicted overlays, coverage/loss/reacquisition metrics and
stationary-interval jitter. Both the new marker-relative white-ball jaw tracker and
the Classic tracker are supported; the new tracker's current camera-1 limitation
is reported explicitly. See `TRACKING_LAB.md` for practical limits.

## Build 0.82 — different-face stereo and ball tracking lifecycle

Stereo now jointly fits the known rigid tracker corners to both calibrated, time-aligned camera images. Camera 1 and Camera 2 may observe entirely different face IDs of the same instrument. The fit uses each camera's intrinsics/distortion, the calibrated camera transform, and the selected prism/six-face/eight-face geometry. It requires a valid constraint in both cameras, rejects inconsistent reprojection, and can exclude a bad extra face only while retaining a face in each camera. Position and orientation are published from the same accepted sample. Diagnostics list each camera's contributing IDs and joint pixel error; shared-ID center triangulation no longer gates movement.

Striped jaw balls now maintain individual position/velocity predictions, invalidate current detections when a new processed frame misses them, and expand local searches after losses. Three stripes establish identity. Recent identified balls may continue through circular silhouette tracking, with expected 10 mm image size and marker-relative reach checks. Longer losses trigger an off-main-thread full-frame search; a strict stripe match supplies a hint that must be verified in a new local frame before driving the jaws. Assignments do not need to be repeated. A predicted or held position never becomes a calibration sample or a fresh jaw measurement.

Jaw analysis uses presented/decoded frame identities, and a dedicated overlay refreshes independently of marker decoding so missing or stalled frame delivery does not retain a green lock. The striped-ball overlay is green for a current detection, gray dashed with a crosshair for a predicted position, and labeled **Searching** during acquisition/reacquisition. It no longer paints old accepted pair centers as current locks. One-camera mode continues to use Camera 1 only. Synthetic camera regressions cover different-face stereo handoffs, metric depth movement, silhouette-only continuation, loss invalidation, and full-frame ball reacquisition without reassignment. Physical accuracy still depends on valid camera calibration, the actual marker layout, and resolvable image features.

## Build 0.81 — quality-guided stereo capture and jaw feedback

Stereo checkerboard capture now previews corner overlays and per-camera quality feedback, with checkerboard detection and image analysis in a dedicated worker. Both views must contain all 48 corners, adequate square detail, an uncropped outer board, sufficient contrast, and a sharp image. A pair must also be steady across observations, have fresh presented frames within 50 ms, and differ usefully from previously accepted pairs. Bad and duplicate views are not stored or JPEG-encoded. Presentation timing is a screening aid, not hardware camera synchronization.

Capture stops when at least 20 accepted pairs also cover horizontal/vertical positions, at least a 30% apparent-size range, and top/bottom plus left/right perspective variation in both cameras. Coverage guidance lists the missing movements. These are capture-coverage proxies, not a solved accuracy guarantee: export the resulting captures for the stereo solver's reprojection validation. A 40-pair bound pauses incomplete sets without claiming success. Pause/resume retains accepted images; changing device order or resolution requires a fresh set. Exports retain the original camera identities, and in-flight results cannot add images after stopping or clearing.

Jaw overlays now distinguish amber dashed **assigned, not detected** centers, detected unpaired candidates, and solid paired outlines. Striped-ball readouts report estimated source-image diameter, contrast, and the rejection stage. The detector tolerates a limited dark mounting stem at the sphere boundary or one band endpoint; three-band and shape checks remain. This improves a reproduced mounted-ball synthetic failure; physical painted-ball recognition still needs real camera-image validation.

In **1-camera mode**, only Camera 1 supplies jaw detections, fusion, and closed/open captures. Camera 2 can remain running and retain its saved setup without being required. Changing modes clears old fusion votes and cancels pending captures; stopping Camera 2 in mono mode does not cancel Camera 1's jaw capture. Use 2-camera mode to configure and combine the secondary jaw view.

## Build 0.80 — trial monochrome needle-driver jaws

In **Calibrate → Needle driver → Jaws**, select **White + 3 black bands · 10 mm (trial)**. Use two identical 10 mm white balls with three parallel black bands centered around their equators. A useful starting pattern is roughly 1 mm black bands separated by 1 mm white gaps. Keep the band groups similarly oriented and visible from the side; a pole-on view is not supported by this initial detector.

Start the camera, assign ball A and B by clicking their centers (a dark stripe can be clicked), and capture closed/open at Near and Far with the existing workflow. Assign centers in each camera used; captures record configured views together. The needle driver's striped assignments and measurements save separately from its color profile, and changing this selector does not change the other instruments' color tracking.

The detector searches native-resolution local crops for a round three-band pattern. Ball diameter must be at least about 14 source pixels, preferably 20 or more, so all three bands remain resolved. It rejects unresolved images instead of supplying jaw samples. Distance-based pairing handles identical balls without requiring a color identity; one candidate cannot supply both jaws. The detector is experimental and has passed synthetic image/camera regressions, not a validation on physical painted balls. Strong perspective, partial occlusion, glare, poles facing the camera, and curved bands may still require refinement from real camera samples. Performance reports include the selected needle-driver pattern and striped-search timing.

## Build 0.79 — stable single-camera eight-face rotation

In single-camera eight-face mode, visible side markers now determine body rotation without being pulled by an inconsistent angled-face estimate. To use an angled marker alone, first hold it visible together with a side marker briefly: five distinct agreeing observations learn its body-frame rotational and positional correction. The correction is applied in the tracker frame, preserving pitch, yaw, and roll directions through a handoff. Alignment is independent for each instrument and each angled marker, and resets with the camera/tracker session. The rotation diagnostics report when a marker is aligned or when overlap is needed. Six-face/prism solving and metric stereo solving retain their existing paths.

The stationary latch also now requires an acquired rotation state before holding the pose. Previously, marker recognition could create a translation target before a valid rotation was available; subsequent stationary frames could then skip initialization indefinitely. Stationary frames now continue collecting overlap alignment without disturbing an acquired pose. Tests include inconsistent angled orientation, every instrument ID range, all three rotation directions, distinct-frame validation, and a browser pose-pipeline regression through stationary overlap and angled-only motion.

## Build 0.78 — match eight-face geometry to the printed STL

The angled pads were measured from `suturehero_needledriver_angled_faces_rotated_60.stl`. Each is a 19 × 19 mm square with its center 17.82725 mm along the shaft and 12.3937061 mm radially from the shaft axis. Their normals retain the existing 30° tilt toward the axial end. The old 19 mm axial / 16.454 mm radial center assumptions were incorrect and caused angled-face observations to conflict with side faces. The eight-face ring now uses these measured centers. Its six side faces retain exactly the six-face model's geometry.

The layout assumes marker 06 is on the inclined pad at the same circumferential station as 00, and 07 beside 03, with consistent axial printed orientation; forceps and scissors use the corresponding 16/17 and 26/27 IDs. The selected eight-face model is shared across instruments, so their trackers must share this pad geometry. Markers are modeled as centered 16 mm squares on each pad. Independent test fixtures use the STL's outer-pad vertices to check mono and stereo tracker centers, overlapping side/angled fits, handoffs, and rotation directions for every instrument ID range.

## Build 0.77 — stereo status on the practice screen

A persistent badge on the simulation view shows **Stereo triangulation ACTIVE**, the active fallback camera, waiting for trackers, calibration mismatch, single-camera tracking, or camera tracking off. It remains visible when camera controls are hidden. The badge follows live tracking status rather than the metric-enable checkbox, and expires to an unavailable status if tracking heartbeats stop. Browser verification covers active stereo, fallback through each camera, and visibility with controls hidden.

## Build 0.76 — pair stereo images by capture time

Stereo now buffers camera observations using their source-image capture times. When cameras finish processing at different times, matching corners are interpolated to the same observed instant; the code does not extrapolate motion or interpolate missing marker IDs. Old decoder results cannot replace newer flow frames. This avoids treating worker callback times as synchronized image times, which can reject valid moving geometry. The fallback controller uses the same 180 ms freshness limit as the geometry path and advances fresh monocular lateral movement/rotation between stereo measurements instead of repeatedly publishing a frozen stereo position. Regression coverage includes continuous vertical motion with an extra 35 ms secondary processing delay, ordinary depth changes, and either-camera dropout/recovery.

## Build 0.75 — automatic stereo camera fallback

After acquiring stereo, losing either camera's tracker view automatically continues position and rotation from the remaining camera. Each camera uses its solved intrinsics, distortion, and extrinsics; Camera 2 is transformed into Camera 1's coordinate frame. Each source is anchored to the previous pose, preserving position and orientation during handoffs. Depth holds briefly, then eases into approximate marker-size depth after 350 ms. Stereo corrections blend back over roughly 180 ms when triangulation returns. Both views lost means holding the last pose without publishing fresh tracking. The status indicator and exported `stereoSources` diagnostics identify the active source per instrument. No mode switch or recalibration is required.

## Build 0.74 — responsive stereo movement

Metric position no longer depends on a successful four-corner stereo orientation fit: a valid triangulated marker center can use the fresh primary-camera body orientation to remove the marker-face offset. Full stereo fits remain preferred. Position keeps the existing epipolar, ray-gap, depth, and freshness checks. The extra stereo low-pass and 130 mm distance veto have been removed; movement uses the existing adaptive rendered-pose filter. This prevents real motion from being rejected against an increasingly delayed reference. A two-camera browser regression checks sustained forward/backward depth changes, including when the full corner fit is unavailable.

## Build 0.73 — stereo depth and shared jaw calibration

Stereo movement now uses triangulated tracker positions, preserving depth beyond 400 mm and maintaining a consistent tracker center when marker faces change. Camera order and image dimensions are checked against the solved calibration.

The checkerboard defaults to 9 × 7 squares (48 inner corners), with **16 mm** squares. Confirm the printed layout and measured square size before capturing. Keep both cameras fixed and capture about 20 varied board poses visible in both views. Export the paired captures, then solve them offline:

```sh
python -m pip install -r scripts/requirements-stereo.txt
python scripts/validate_stereo_calibration.py captures.json --output calibration.json
```

Import the resulting solved JSON into Tracking setup. The solver checks pose diversity, reprojection and epipolar errors, baseline, and corner ordering; it does not export a solution that fails validation. New physical camera captures are required to determine the actual calibration; synthetic tests do not calibrate your cameras.

Jaw tracking now supports both cameras. Sample each ball's color separately in each camera using **Color sampling view**, then capture closed/open once at Near and once at Far: each capture records all running views configured for that instrument. Each view retains its own measurements and color profile. Matching estimates are combined, and a fresh remaining view can continue tracking when the other loses the balls.

## Tilt-corrected size depth and guided jaw recovery in 0.72

Single-camera depth uses the square's principal image scale to compensate for
moderate tilt, including an off-center viewing-ray correction. It prefers a more
face-on visible marker; edge-on, distorted or tiny markers hold the last depth.
Near/Far captures store inverse corrected size from several recent observations
of the selected instrument. Saved references are bound to the camera, tracker
geometry and image aspect ratio. **Re-capture Near and Far after this update**;
the old distance-based calibration is not reused. This remains an approximate
single-camera measurement, with lens distortion and very small markers limiting
accuracy. Stereo tracking and X/Y estimation are unchanged.

When a jaw pair cannot be matched, a visible colored ball and its marker-relative
pair geometry now guide a smaller recovery search for the harder ball. Slightly
more color tolerance applies only there; recovered candidates must still pass
pair size, separation and instrument-association checks.

`SUTURE_SIZE_CALIBRATE=1 node scripts/check-driver-depth.mjs` checks real Near/Far
capture and depth movement. `SUTURE_JAW_PARTNER=1 node scripts/check-ball-pairs.mjs`
checks recovery of a weak partner color, genuine loss and reacquisition.

## Jaw detection continuity in 0.71

Validated colored-ball pairs bridge detection gaps shorter than 250 ms while
holding the last jaw opening. Held positions do not refresh detection timestamps
or count as calibration samples; sustained loss still reports missing. Small
color changes are tolerated only near an already tracked ball. New acquisition
and pair geometry checks retain their existing thresholds.
`SUTURE_JAW_FLICKER=1 node scripts/check-ball-pairs.mjs` checks lighting changes,
brief hold, real loss, reacquisition and calibration through the camera pipeline.

## Resting unlocked depth in 0.70

Single-camera depth preserves continuity when switching between planar-pose and
marker-size estimates or visible marker faces. Switching back to the 3D source
requires sustained good fits. Stationary image geometry holds the depth reference,
while unlocked forward/back movement remains active. The depth filter also
confirms moderate back-and-forth changes instead of passing them through as motion.
X/Y tracking is unchanged. `SUTURE_DEPTH_NOISE=1 node scripts/check-driver-depth.mjs`
checks resting stability under changing fit confidence, then deliberate movement.

## Both cameras visible in 0.69

At the top of the camera panel, both stacked feeds fit completely within the
available height. Their full images and native proportions are preserved;
controls remain below the feeds. Resizing the window recalculates the fit.

## Unlocked depth fallback in 0.68

Unlocked depth now accepts the approximate marker-size distance when the planar
3D fit is unreliable. Previously that distance was calculated but rejected by
the depth filter, leaving Z frozen while X/Y continued to move. Existing jitter,
spike and rate limits remain active. Depth diagnostics and performance reports
identify the measurement source and validity. Run
`SUTURE_SIZE_DEPTH=1 node scripts/check-driver-depth.mjs` to exercise the size
fallback through calibration and main-scene movement.

## Stacked camera feeds in 0.67

With two cameras active, Camera 1 appears above Camera 2. Both use the panel's
full width and preserve their native proportions; scroll to reach the second
feed and camera controls when needed.

## Native camera proportions in 0.66

The feed uses its actual camera aspect ratio to determine preview height at the
panel's full width. Controls scroll below it instead of squeezing the image into
a short viewport. This removes layout-created bars without cropping the camera
or its marker overlay, including for 4:3 and portrait streams.

## Camera sizing and hardware controls in 0.65

The camera preview stays within its panel instead of expanding beyond the panel
and clipping the image. Video and marker overlays keep the same dimensions;
the full camera image retains its aspect ratio. Camera controls now open by
default with focus mode/distance, exposure mode/time and gain when supported.
Controls appear as soon as the stream starts, even if marker detection cannot
initialize. Switching modes refreshes available hardware controls.

## Camera panels and full-scan optimization in 0.64

Camera feeds, Tracking setup and Diagnostics now have separate panels. Hide/show
preserves active camera streams. Instrument depth locks and jaw calibration stay
in Calibrate; duplicate global depth-lock and exposure controls are removed.
Full-frame scans use equivalent row-wise thresholding and reuse grayscale during
recovery. Local 1080p fixture scans improved from about 62 to 55 ms; actual camera
performance still needs measurement. Synthetic needle-driver depth movement was
verified through calibration and the main scene.

## Frame-efficient flow and fallback diagnosis in 0.63

The follow-up 1080p report measured 10.6 decode FPS versus 5.4 before optimization,
48 ms versus 144 ms mean decoder work, and 69 ms versus 162 ms decode-frame age.
Camera presentation remained 25 FPS, while capture attempts were 31.8/sec and
flow readbacks 37.8/sec. Flow-frame age increased from 19 to 29 ms, identifying
readback/flow work as the next target rather than graphics submission.

Optical flow now consumes newly presented camera-frame notifications. It takes
the latest available frame without queueing stale ones and avoids repeated
processing of the same presentation. Browsers without video-frame callbacks
retain the previous timed path, also used if callbacks stall. Decode recovery remains independently scheduled,
so it may still retry a frame with an expanded/full search. When flow and decode
coincide, an owned byte copy supplies the decoder's seed; the flow worker can
transfer its input without requiring a second canvas readback. Both cameras use
this path. Full-resolution recognition, recovery thresholds and global scan
frequency are unchanged.

Performance reports now split worker timings by full/predicted/expanded search
and count why full frames were used: periodic discovery, missing hints, repeated
misses, large regions, or explicitly selected baseline. These counters are since
reset, unlike the rolling five-second timing averages. Use them to identify the
reason for full-frame work before changing recovery policy.

Unlocked depth also no longer saturates at the configured Near/Far span before
relative motion is calculated. For example, both 600 and 650 mm were previously
clipped to the same default far value, producing no depth response. The span now
sets gain; final workspace limits still constrain the tool. The rest hold also
releases on coherent subpixel scale changes so gentle depth motion can be seen.
Depth-only damping is stronger to suppress far-distance measurement noise. Reports
include per-instrument depth lock state, estimated distance and source Z.

## Predictive native-resolution decoding in 0.62

Baseline profiling at 1920×1080 showed full-image grayscale, thresholding and
contours dominating decode time. The decoder now searches native-pixel regions
predicted from recent flow positions and velocity. A miss expands the search;
a second miss forces full-frame recovery until reacquisition. Global scans become due every 350 ms; completion depends on decoder workload.
They discover instruments outside the tracked area. Large regions, expired hints and resolution/model
changes use full frames. Group-aware recovery accepts a new face of the same
instrument but detects a missing second instrument. Uncheck **Predictive region
decode** to compare with full-frame decoding. Predictive scheduling targets a
65 ms interval; jobs never overlap within one decoder worker.

An owned VideoFrame (when supported) supplies the same image to flow and decode,
removing the redundant full-size canvas copy. Frames always close in finally;
the original canvas snapshot remains a tested browser fallback. Recovery hints
translate with crop origins. Corner refinement converts only the required 11×11
neighborhoods rather than converting the entire native frame a second time.
The luminance formula, Harris search, dictionary and recognition thresholds are
unchanged. Baseline/new refinement agreed for 1,760 random and border corners.

A local synthetic 1080p A/B measured 5.4 → 9 decode FPS and 73 → 28 ms mean worker
time; these are test-machine results, not a promise for other hardware. All 50
IDs and rotated boundary IDs still decode. The existing difficult-recognition
suite remains 139/144 with no wrong IDs. Browser checks cover out-of-region
marker discovery, abrupt movement, both snapshot backends and frame cleanup.
Collect another Performance report on the actual camera to compare with 0.61.

## Performance instrumentation in 0.61

Open **Diagnostics → Performance diagnostics**. Run tracking for at
least ten seconds and choose **Copy performance report**; a selectable text
report is also provided if clipboard access is unavailable. Reset measurements
clears only timing data. Reports are generated locally and are not sent anywhere.

The five-second rolling table reports camera presented FPS, decode and optical
flow throughput, worker execution and round-trip/transfer delay, capture and
readback time, pose estimation/filtering, jaw scans, overlay/status UI work,
tracking and simulator loop rates, frame intervals, application-capture frame
age, rendering CPU submission and long tasks. When camera 2 is active, it also
reports capture skew and accepted-update skew. Counters expose duplicate captures/
decodes, decoder busy checks, worker errors and stale decode results. Reports
include build, resolutions, active settings and browser/core count, without
camera IDs, images or color samples. Rendering timings do not measure GPU
execution, and frame age excludes camera buffering before application capture.
Stages can overlap and must not be summed as a serial frame budget.

This release instruments the existing pipeline: recognition, scheduling, ROI
behavior, smoothing and calibration are unchanged. Use the baseline to identify
unnecessary work before implementing predictive detection with progressive
fallback. No speed improvement is claimed until those measurements are reviewed.

## Rest stability and saved jaw tracking in 0.60

The published pose now holds when a previously observed face's image corners
remain stationary, even if recognition alternates between one face and overlap.
New faces can join the stationary reference; movement is compared with the fixed
reference so slow motion accumulates and releases the hold. Reacquisition after
a gap or an unseen face does not inherit a stationary lock. Recognition, green/
orange overlays, jaw tracking and frame freshness continue independently.

Each instrument's ball colors, sampled brightness, marker-relative acquisition
references and Near/Far jaw measurements now save automatically in this browser.
Reloading restores them and enables previously enabled ball tracking; after
starting the camera, the pair can reacquire without assigning colors again.
Pending captures, live centroids and jaw output are not restored. Reset jaw
measurements keeps selected colors; assigning a new color replaces that color
and clears that instrument's measurements. Recalibrate if camera or ball setup
changes. Blocked or corrupt storage retains session functionality.

`SUTURE_JAW_DEPTH=1 SUTURE_JAW_PERSIST=1 node scripts/check-ball-pairs.mjs`
checks real camera calibration, reload and reacquisition. `scripts/check-marker-rest.mjs`
checks alternating one/two-face recognition without virtual oscillation and
verifies deliberate movement releases the hold.

## Near/Far jaw calibration in 0.59

In Jaws, assign both ball colors, select Near working distance and capture closed
and open. Hold each pose and distance steady while eight unique video frames are
averaged (usually about one second). Then select Far and repeat at the same
instrument angle. Captures trim isolated outliers; unstable poses, insufficient
depth range, missing frames and inconsistent opening direction retain previous
measurements. Reset jaw measurements affects only the selected instrument.

A completed single distance remains usable while the second is captured. With
both distances, closed and open endpoints interpolate using apparent ball radii,
independently of ArUco face size or face switches. Values clamp beyond the sampled
range. A 4% closed tolerance, releasing at 6%, snaps the closed output to exactly
zero. This compensates depth-dependent segmentation bias, not arbitrary tilt or
occlusion; keep a typical instrument angle, both balls visible and consistent
lighting. Calibration remains per instrument and per camera session.

Run `SUTURE_JAW_DEPTH=1 node scripts/check-ball-pairs.mjs` against a Vite server
(or set `SUTURE_TEST_URL`) for real synthetic-camera depth/capture checks.

Unlocked single-camera depth now uses tracker-center distance rather than the
visible radial face's distance. Unique-frame median filtering, a small stationary
deadband, multi-frame spike confirmation and a bounded movement rate reduce
jumps. Unlocking starts from the existing depth. These are post-estimation
changes; decoding and the rotation/XY calibration mappings are unchanged.
Single-camera depth remains approximate; the existing depth range and sensitivity
controls still apply. Calibrated ball-pair fallback also keeps its separation
bound so background blobs cannot bypass the near/far association envelope.

## Consistent rotation frames in 0.58

A reproduced reversal came from a reflected rotation mapping, including swapping
X/Z without a companion sign change. Mapping an absolute quaternion's rotation
vector through a reflection reverses composition order: a tilt that works near
neutral can reverse after shaft roll, even with exact marker poses.

Rotation profiles now always form a proper coordinate frame. Loading a reflected
saved profile keeps its axis selections and both tilt signs, correcting shaft
roll. Axis edits do the same; explicit roll inversion instead adjusts pitch as
the companion so the requested roll edit remains effective. The live checkboxes
and status report companion adjustments. Valid profiles, position mappings,
marker recognition and smoothing are unchanged. Guided calibration rejects
contradictory tilt/roll results instead of accepting a reflected frame.

Tests reproduce the X/Z reversal before the change, verify all six shaft-roll
stations and both directions, check all 48 signed permutations, saved-profile
repair, explicit invert edits and noisy hexagonal face transitions. Browser
checks exercise the real controls and repaired live preview.

## Hexagonal ring audit and neutral placement in 0.57

Six-face mode already passes the 60° hexagonal model to both monocular and
stereo orientation estimation for needle driver IDs 0–5, forceps 10–15 and
scissors 20–25. New synthetic projection tests exercise every face, adjacent
handoffs including face 5→0, forward pitch direction and noisy overlaps for all
three ID ranges. They validate the software model, not the physical print order.

Active-model metadata now supplies marker size consistently: ring squares are
16 mm, legacy prism squares 12 mm. Planar translation and pose seeds previously
still defaulted to the legacy size. Diagnostics now show the selected geometry,
correct ID groups, visible face count and spacing instead of static 120° prism
text and a misleading "3 learned" count. Hexagonal overlap diagnostics permit
three visible sides and use the selected instrument ID groups.

Set neutral now places the selected instrument at its calibrated tracked X/Y in
the main workspace using the existing tracking scale, preserving current depth
and workspace limits. First acquisition still preserves the original placement;
subsequent movement continues relative to the new anchor. Other tools and saved
axis mappings are unaffected. This is not pixel-perfect camera registration.

## Post-recognition smoothing in 0.56

The existing published-pose filter now smooths small fluctuations more strongly
(110 ms position / 140 ms rotation time constants), retaining a faster 25 ms
branch for larger changes. The angular fast branch begins beyond typical small
camera wobble, so several-degree jitter does not accelerate its own response.
Marker decoding, green outlines, flow tracking and solver acceptance are unchanged.
The same stabilized pose drives the calibration preview and simulator; saved
axis mappings and gains are preserved. Tests cover alternating 15 Hz camera
jitter, deliberate and slow movements, refresh rates and reacquisition.

## Rotation control directions in 0.55

Rotation controls now name their actual effect on the upright instrument:
left/right tilt about Z, forward/back tilt about X, and shaft roll about Y.
Previously the rotation table reused translation labels, so the row labeled
"X · left/right" inverted pitch rather than the visible left/right tilt.
The controls retain their original saved axis keys, and guided calibration now
assigns its three direction pairs to these actual rotation axes and signs.
Existing saved profiles are preserved; use the Left/right tilt invert control,
or repeat guided calibration to learn all three directions again.

`node scripts/check-calibration-rotation.mjs` checks all three rotation controls
and visibly verifies forceps left/right reversal against the Vite dev server.

## Handle-side tracker offset in 0.54

The measured tracker-to-tip offset points toward the tip (-Y), placing the
tracker center on the handle side (+Y from the tip). The previous sign placed
the tracker beyond the tip and reversed the rotation-induced tip displacement.
Tracking and the calibration illustration now share one offset helper. Needle
driver distance remains 55 mm, forceps 110 mm; custom marker-frame corrections
retain their existing meaning. Tests check physical handle-side placement through
pitch, roll and yaw, including the actual virtual instrument mounting rotation.

## Calibration usability in 0.53

The calibration drawer has one scrollbar for the entire section, a compact
live preview, and a shortcut that opens and scrolls to the guided checks.
The published instrument pose uses a light adaptive position/quaternion filter:
small residual motion is smoothed, with a 0.6° rotation and 0.002 practice-unit
position deadband; larger movements use a shorter time constant. Marker
recognition and solver acceptance are unchanged, and each instrument filters
independently. Tracking resets clear filter state.

Guided captures average fresh observations and permit modest zero-mean jitter.
They still reject continuing drift, large spikes, stale tracking, incorrect
neutral poses, and inconsistent opposite-axis checks. Focused tests cover jitter
attenuation, deliberate and slow movement, refresh rates, shortest quaternion
arcs, reacquisition, and noisy guided captures.

## Guided calibration checks in 0.52

Calibration opens on page load, with camera setup ready but no camera stream
started. The rotation guide checks right/left, forward/back, and clockwise/
counterclockwise roll. Each capture needs fresh, steady observations and a
return to neutral between directions. All three opposite pairs must identify
distinct, consistent axes before the mapping is applied; failed checks keep the
previous mapping. This checks axis direction, not metric angle or translation scale.

A green square in the live preview shows the tracker center computed from the
same calibrated offset as the instrument tip (55 mm for the needle driver), with
a corner dot to show roll and a dashed connection to the tip. It is an assumed
mounting reference, not a camera measurement; custom tip offsets move it too.

The guided UI regression can be run with a Vite dev server on port 5175 using
`node scripts/check-guided-calibration.mjs` (or set `SUTURE_TEST_URL`).

## Calibration order and axes in 0.51

The calibration instrument tabs start with needle driver, then forceps and
scissors. Needle driver is selected initially. A larger fixed X/Y/Z guide in
the preview stays visible as the instrument moves: red X for left/right,
green Y for up/down, and blue Z for depth. Tracking slots and saved profile
keys retain their existing assignments.

## Live calibration preview in 0.50

Open **Calibrate** and select forceps, needle driver or scissors. A live
instrument schematic shows the selected tool's calibrated translation,
rotation and tracked jaw opening, with a faint upright reference and labeled
X/Y/Z axes. Move or turn one axis at a time to see which marker axis maps to
which virtual axis; **Input → mapped readings** shows the corresponding
neutral-relative values. Changes to mapping, sensitivity and mounting settings
appear in the preview through the same transform used by the tracking bridge.

The preview uses CPU-projected SVG and adds no WebGL context. On larger desktop
screens it stays above the scrolling settings. The camera and suturing scene
remain visible during setup. Missing markers dim and freeze the last pose;
selecting a tool with no tracked marker shows a waiting state. **Center view**
recenters only the illustration; **Set neutral pose** resets calibration's
reference as before. Position readings include the tracker-to-tip offset and
rotation about the tracker. The preview shows input before workspace collision
and reach limits, and its instrument shapes are schematic.

`scripts/check-calibration-preview.mjs` exercises real synthetic-camera motion,
rotation, axis reversal, jaw updates, tool isolation, marker loss/reacquisition,
neutral and visual centering, responsive layout, and the single-context budget.

## First-throw capture in 0.49

A wrap can spiral along the needle driver before the short tail is picked up.
Its shaft-supported opening is perpendicular to the driver, while a best-fit
plane through the helical thread can be tilted substantially. For strongly helical wraps, capture now
uses the shaft opening while supported and transports that same opening with
its material after it leaves the metal. Nearly planar loops retain their
existing material-plane behavior. Previously, switching between those
planes could incorrectly report that an already-passed tail moved backward.
The live driver axis is supplied by the free-tying simulation, including rotation.

Retention still requires the short strand to cross the live opening and the
metal to clear it. Reversal, release and genuinely missed crossings still
cancel capture. No loop, completed throw or extra thread is generated by this
change. Regression tests cover single/double helical wraps, both directions,
tilting/rotation, and actual wrap-before-pickup handling at 30 and 20 FPS.

## Marker recognition retries in 0.48

The native-resolution baseline decoder and its refined corners are preserved.
Additional candidate fits use a six-cell-aligned sampling grid and require an
exact dictionary match; error tolerance is not increased. Native adaptive
threshold retries handle low contrast, modest blur and foreshortened faces.
Recent missing faces get bounded local retries even when a different marker
is already recognized. Periodic alternate full-frame scans still discover new
faces; local hints expire and never replace full-frame reacquisition.

The green outline can bridge up to 650 ms between decodes while image-validated
flow remains live. Hiding a marker still stops live observations; this does not
keep an unsupported prediction on screen. Duplicate retry results are merged
by ID before pose solving. `scripts/check-marker-recognition.mjs` tests 144
transformed cases from independent OpenCV markers across size, contrast, rotation,
foreshortening and blur, and checks plain-square rejection and incorrect IDs.

## Graphics stability in 0.48

Embedded camera tracking shares the main scene instead of creating an unused
second WebGL context. Native camera capture and decoder recovery reuse their
2D buffers, with CPU-read hints for frames processed in JavaScript. The main
scene caps its drawing buffer at two million pixels (750,000 in Fast mode),
independent of window size and display pixel density, and uses a smaller shadow
map. CSS layout and the camera's native marker decoding resolution are unchanged.

If the browser loses the graphics context, the stitch simulation pauses and a
status replaces the blank scene. When the browser restores the context, Three.js
rebuilds its GPU resources, the same stitch resumes, and graphics switch to Fast
mode. This handles recoverable context loss; it cannot repair a crashed browser
process or guarantee recovery from every hardware/driver failure.

`scripts/check-render-recovery.mjs` forces real WebGL context loss/restoration
with the camera on and off, checks that stitch state survives and drawing
resumes, and verifies high-DPI buffer limits and a single embedded WebGL context.
Set `SUTURE_RENDER_SOAK_MS=60000` to include a sustained moving-camera session.

## Motion tracking in 0.47

Optical flow now uses a separate module worker, retaining the matching source
image for each marker. Decoded seeds carry the image in which their corners
were measured, so asynchronous decoding cannot seed an old quadrilateral
against newer pixels. Failed flow frames leave the last successful reference
intact for up to 450 ms of recovery; fresh decoded geometry is projected into
the current image before correcting an existing track, including during turns. Unconfirmed tracks still expire.

Small markers use fewer pyramid levels so their detail survives downsampling.
The flow image is antialiased, whole-marker appearance guides movement searches,
and a shared rotation/scale fit lets the outline turn between decodes. Motion
matches still require image evidence and forward/backward validation; hiding a
marker does not indefinitely extrapolate its movement. Native-resolution marker
recognition, refined decoded corners and physical tracker geometry are unchanged.

`src/input/markerFlow.test.ts` covers small-marker translation, reversals,
rotation and rejection of blank images. `scripts/check-marker-motion.mjs`
exercises the actual flow worker, including delayed decoded seeds and recovery
after a failed frame. Run it against the dev server with `SUTURE_TEST_URL`, or
supply `SUTURE_FLOW_WORKER_PATH` for the bundled production worker. `scripts/check-tracking-motion.mjs` also exercises a moving synthetic camera
through the real decoder, flow bridge and instrument pose. Synthetic
checks do not reproduce every camera's motion blur or lighting conditions.

## Workspace and instrument calibration in 0.46

The suturing view is now the first and largest part of the practice screen.
The current maneuver and actions stay immediately below it. Practice setup,
stitch planning, session review and full instructions open only when needed.
**Calibrate** opens per-instrument settings and camera setup. During setup, the
real camera and virtual instruments remain on screen while settings scroll
inside their panels. **Hide camera** hides the feed without stopping tracking;
**Camera** shows it again. Disabling
tracking stops both cameras. The standalone Tracking Lab uses the same panels.

Use **Choose camera** to select a device card instead of the long device
select. The currently running device can show a preview; other cameras start
when selected. **Camera controls · focus & exposure** contains focus, exposure and the second-camera
device controls. **Tracking setup** opens marker geometry, tracking mode, working
depth and stereo calibration. **Diagnostics** opens performance reports, decoder
statistics, marker overlays and experimental tracking controls. Per-instrument
depth locks and jaw setup live only in **Calibrate**.

Forceps, needle driver and scissors have independent profiles: movement and
rotation sensitivity, translation/rotation axis mapping and inversion,
mounting presets and offsets, mono depth lock, marker-frame tip offset in practice
units, and jaw-opening reversal. **Set neutral pose** requires a recent marker
sample and uses the current physical pose as neutral without jumping the tip
position. Tip offsets rotate around the tracked marker rather than being added
as a fixed world offset. Profile changes preview immediately. **Save** persists
only the selected instrument in this browser; unsaved changes to other tools
stay unsaved. Neutral-pose baselines are session-specific and are refreshed on
camera restart. Ball colors and closed/open measurements also remain specific
to the current camera session. Marker detection and physical geometry are not
changed by calibration settings.

## Current practice options (build 0.46)

The setup bar selects skin or microsurgery, tissue target, needle, suture material, and guided knot technique. Setup changes restart practice; the choices are kept in the URL. The build number stays visible in the mobile header. Movement currently requires a keyboard. **Graphics → Fast** disables shadows and caps rendering resolution; it can be toggled during practice without restarting. The choice stays in the URL (`graphics=low`).

- **Skin:** thin, standard, or thick dermis, beneath a fixed epidermal layer and above fat. Dermal purchase carries the closure load; grasping the epidermis lifts its attached dermis.
- **Microsurgery:** two hollow artery ends, a smaller artery, or nerve ends containing seven fascicle bundles each. The driver changes to a Castroviejo spring-handle form. A vessel wall or the nerve's outer sheath carries the stitch; this prototype supports one anterior-wall/sheath stitch, not a complete circumferential anastomosis or individual fascicle suturing.
- **Needles:** PS-2, CT-1, SH, FS-2, P-3, and BV-1, with different radii, arc lengths, and representative cutting/taper geometry. These are practice-scale profiles, not calibrated commercial dimensions. Guided paths preserve the selected needle radius and keep skin bites within the dermis.
- **Sutures:** blue Prolene, black nylon, and violet Monocryl. They share the same solver, with modest differences in damping, bending, and sliding resistance. These coefficients are exploratory rather than measured material properties.
- **Starting knots:** a surgeon's double first wrap followed by an opposing single throw; or two same-direction single throws on a taut short post, followed by an opposing locking throw. Guided mode assists these selected sequences; free mode automatically identifies single, surgeon's, square, or sliding starts from the observed throws, without a technique selector. Free mode detects actual supported wraps and short-thread passage, keeps earlier throws connected, and feeds existing material while tightening. Additional free throws alternate directions. A visible in-scene badge distinguishes a detected wrap, tail passage, retained throw, and seated throw.
- **Scissors:** select **Use scissors** to route the existing right-hand keys to a separate instrument while the driver stays parked. Skin uses Mayo scissors; microsurgery uses fine Westcott scissors. **Position scissors at tail** is an optional assist. Close with **comma** to cut a strand between the blades; **period** reopens for another cut. Offcuts remain separate simulated material and a held offcut stays attached until released. Reset restores full strand lengths. Cutting is available in free tying and after the guided knot's release/pull checks. Retained knots have a protected material region; scissors currently trim free tails rather than severing a knot or tissue.

Free knot retention remains an approximate material-crossing constraint, not a calibrated knot-security model. The finite-iteration solver allows small geometric strain (the multi-throw regression bounds it to 3%) while preserving the prescribed material budget. Shaft/thread contact, local tissue deformation, and sliding on the short post are approximations. No heavy graphics features or input-device redesign are part of this increment.

## Colored ball pairing and initial instrument orientation

Camera ball outlines and selection-button swatches now use the sampled color.
Balls are selected jointly for each instrument: both blobs must have plausible
size, remain within a bounded separation and stay near recent ArUco observations
from that instrument's configured marker group. After closed/open calibration,
the separation bound follows the calibrated range with tolerance and scales
with apparent ball size. Before calibration, a looser bound uses the selected
pair and marker scale. Reacquisition regions move and scale with the ArUco
marker rather than returning to a fixed background location.

Individual balls remain visible as dashed circles while selecting the second
color; these provisional tracks never supply a jaw measurement. Pair bounds
learn the selected separation and reach so tilted markers and print-scale
differences do not immediately reject the selection. Brightness and saturation
thresholds follow the sampled color rather than rejecting accepted muted colors.

A missing ball or rejected pair clears the confirmed pair and stops fresh
jaw-opening updates. Brief ArUco dropouts can use the last associated marker
for up to one second; sustained marker loss stops updates. The last jaw opening is retained;
a background-colored blob cannot refresh it on its own. All three instruments
retain separate color slots and calibration. Re-selecting a color requires
recalibrating that instrument's closed/open positions. Known tracker-to-tip
measurements supply a loose association bound, not calibrated tip poses.

The Tracking Lab previews and simulator share a fixed mounting transform that
starts neutral instruments with handles up and tips down. ArUco IDs, solver
corner ordering and estimated rotation are unchanged. Focused geometry tests
cover this orientation, while `scripts/check-ball-pairs.mjs` exercises color
swatches, calibration, distractor rejection, marker loss and reacquisition with
a synthetic camera (run with the same development server and optional
`ARUCO_LIBRARY_DIR` as the marker test).

## Visible epidermal alignment in 0.43

During opposite-edge support, small amber rings follow the visible epidermal edges at the stitch. They turn green when the surface edges meet with similar heights and the forceps holds a gentle grasp. Alignment uses the same deformed epidermal positions as the 3D pad and cross-section, rather than a fixed amount of lifting. After grasping the opposite edge with Z, pull inward with D; use E/Q only if the surface heights need adjustment. Stop pulling when the rings turn green, then U advances the needle driver.

The opposite edge can move toward the stationary first edge across the original incision midline, with a bounded clearance to prevent crossing it. Excessive lifting produces a lower-with-Q cue rather than counting as alignment. The deeper dermal review remains separate in the cross-section and stitch feedback; surface alignment is not a claim of adequate deep purchase. This remains a geometric approximation with the existing controls.

## Two-edge guided skin pass in 0.42

After the needle traverses the first skin edge, the guided skin pass now pauses at the wound-facing side. Open the forceps with X to release the right edge. Once it relaxes, **Position forceps at opposite edge** places the open jaws at the left edge; manual positioning is also supported. Close Z, lift gently with E, then pull inward with D until the opposite edge is flush. Shift slows movement. U resumes the driver's curved advance only while that edge remains supported. Releasing or slipping pauses the pass and allows recovery. Open X after emergence before transferring the needle.

The guided needle driver now takes an absolute pose from its fixed needle attachment each frame. Guided and handoff poses bypass free-motion position clamping while jaws still respond. This removes accumulated corrective transforms and competing pose constraints. The opposite-edge maneuver is a geometric teaching sequence; it does not add puncture forces or a new input device. Microsurgery keeps its existing one-wall pass.

## Skin cross-section and depth closure in 0.41

**Show skin cross-section** opens a lightweight side-on panel showing epidermis, dermis and fat at the current stitch. It follows the same tissue field as the 3D pad, including closure, forceps eversion, unequal edge heights and neighboring stitches. The dashed blue curve shows the planned needle path in tissue coordinates; it is not a live suture trace. The toggle does not change instrument movement or interrupt practice and is hidden in microsurgery.

A shallow planned needle tract now provides less approximation in the lower dermis while still allowing surface closure. Fat passively follows the lower dermal displacement. The panel compares surface and deep dermal gaps, sampled in the lower quarter of the dermis. Stitch feedback separately reports a remaining deep gap and uneven edge levels. Both the tract depth and the review are retained with saved stitches. Existing bite-width controls change the circular tract's depth; there is no new input requirement.

Depth support and the feedback thresholds are bounded geometric illustrations, not measured tissue mechanics, tissue injury predictions or clinical adequacy criteria. Guided needle placement remains constrained to valid dermal purchase. No extra dynamic physics or heavy rendering effects are added.

## Neighboring stitch closure in 0.40

In the three-stitch skin session, adjacent seated stitches now share a bounded tissue deformation between their sites. Even, close spacing supports a smoother ridge and smaller inter-stitch gap; widely separated stitches leave more opening. Both stitches must carry closure before a bridge develops. Local compression and unequal-bite height differences remain visible. The spacing review now also reports the largest midpoint gap in practice units.

Rendering, surface contact and the active stitch's thread anchors use the same combined tissue field. Completed sutures and their saved reviews remain static; only the tissue profile and current stitch respond. Closure stays bounded without adding displacements or crossing the wound edges. This is a geometric approximation, not elastic tissue mechanics, calibrated tension, injury prediction or a continuous running-suture model. Single-stitch practice, microsurgery and input controls retain their existing behavior.

## Tension-sensitive skin closure in 0.39

Two dermal bites carry approximation; the attached epidermis and fat follow passively. Balanced bite widths preserve an even everted ridge. Unequal bites reduce this eversion slightly and retain the existing edge-height mismatch. Forceps preparation contributes to the ridge without changing instrument controls.

Excess pull during free tying or the guided pull check temporarily flattens the central ridge and gathers the surrounding skin. Easing tension lets this compression recover while a seated knot maintains closure. The review reports current tissue compression separately from peak pull. Saved stitches retain their recorded deformation when advancing through the three-stitch session. This is a bounded geometric illustration, not calibrated force, tissue injury, tearing or a clinical score. Microsurgery is unchanged.

## Skin traction and grasp recovery in 0.38

Skin grasping now distinguishes gentle eversion, visible stretching and a slipping grasp. The existing forceps controls are unchanged. The skin marker and relative-traction meter warn as the edge is pulled farther from its resting position; sustained overload can release the skin. Ease the pull back toward the edge before it slips, using Q to lower the forceps or Shift for slower movement. Abrupt out-of-range pulls release the grasp with bounded deformation instead of stretching the pad arbitrarily far.

A lost skin grasp pauses the guided needle pass without resetting its progress. Open X, optionally use **Position forceps**, close Z near the edge and lift gently to resume. Keeping closed jaws near the tissue cannot automatically regrasp it after a slip. The tissue relaxes after release; there is no tearing, permanent injury or calibrated force model. The response uses geometric displacement and time under overload. Microsurgery retains its previous edge-handling behavior.

High skin traction and grasp-slip counts remain in the current stitch review and its saved session record. They clear for a new stitch or reset and do not prevent completing a recovered stitch. Gentle eversion still prepares the skin profile used by the seated suture; excessive traction is not recorded as extra eversion preparation.

## Bite placement and spacing in 0.37

In skin practice, **Plan this stitch** adjusts the right entry width, left exit width and position along the incision before the skin is grasped. Widths are percentages of the default bite for the current needle; positions use practice units. A real circular path preserves the selected needle radius. Requests outside the span that reaches the dermis are adjusted, including limits that keep valid dermal purchase on both sides. The targets, needle pose, purchase sites and buried thread route follow the accepted plan. Controls lock once tissue is held or the pass starts.

Unequal dermal bites produce a small bounded edge-height mismatch during closure, reported in the stitch review and preserved with a saved stitch. This is an illustrative geometric response, not elastic tissue mechanics or a clinical quality score. Guided and free tying after a pass use the chosen geometry. **Show needle arc** toggles the visual overlay; needle movement remains assisted, and instrument controls are unchanged.

Each site in a three-stitch session can be repositioned before its pass. Earlier saved sites stay fixed; the next site reserves room for the remaining stitches and maintains at least 0.30 practice units of separation. The session review compares actual gaps and labels their spacing as even or uneven. Resetting practice restores the default bite geometry and positions. Microsurgery retains its existing single-stitch path.

## Free-tying capture continuity in 0.36

A confirmed short-post crossing now survives a brief contact gap as the loop clears the driver. Previously, a single solver step placing the local strand just to one side of the fitted opening plane discarded that evidence immediately and reported “Loop slipped off.” Provisional continuity now follows the same material coordinate for up to 0.1 seconds, bounded by the live opening's slab and rim. Retention still requires an actual material crossing to recover; proximity alone cannot form a knot. Releasing the tail, pulling it back out, or failing to recover the crossing cancels capture.

## Three-stitch skin session in 0.35

Choose **Start 3-stitch session** beneath the workspace to place three interrupted stitches along the skin incision. Complete the guided pass and extraction at each site, then use either guided knot tying or **Tie freely after pass**. After the seated knot passes its release hold and both primary tails are cut, **Save & next stitch** preserves it and prepares a fresh needle at the next site. **Finish session** saves the third stitch. Each completed stitch keeps its quality review.

The pad recenters on each active site. Saved thread geometry and local dermal closure remain in place, with independent copies of strand coordinates and tissue state. Completed stitches are static for this milestone: they cannot be regrasped or cut, and do not run additional physics or interact with the current suture. Overlapping local closure profiles share displacement rather than adding enough deformation to cross the incision. This remains a bounded geometric tissue approximation.

**Reset practice**, starting a new session, or changing setup clears the session. The separate preplaced **Free tying lab** is disabled during a session; free tying after a completed needle pass remains available. Multi-stitch sessions currently apply to the skin pad; microsurgery remains a one-stitch exercise.

## Knot reliability batch in 0.34

A detached wrap now follows its own material plane instead of the empty driver's axis. Tail passage is tested in the moving opening frame, so rotating an outside tail around a loop does not falsely count as passing through it. Supported helical wraps retain the shaft projection until departure; collapsed material still requires a rewrap.

Loop take-up ignores small reversal cycles, while deliberate backoff rearms a fresh pull. Repeated small oscillations in slack arms no longer accumulate into unintended tightening; genuinely taut arms can still feed material through a retained throw. A sliding post requires sustained tissue bearing before its material allocation freezes, allowing closure-induced slack to settle first. A captured opposing lock on a surgeon's start can begin draw-down under requested post load after regrasping, avoiding a deadlock between post straightness and the paired material reach limit; sliding starts require actual post tautness through locking. Tissue bearing uses a small entry/exit tolerance band to avoid repeated loss of closure at a contact boundary, while genuine lifting or displacement still removes load. Failed-capture instructions remain available until a fresh wrap or retry replaces them.

Regression coverage includes detached tilted single/double loops, rotating outside tails, stationary hand oscillation, a stronger driver tilt, successive throws, regrasping, sliding starts, release and cutting. Retention remains a geometric approximation, not a complete topological knot solver or a clinical security model.

## Tension, tissue response and the full stitch in 0.33

Free tying has separate long- and short-arm indicators for released, slack, gentle and excessive pull. These combine geometric tautness with requested movement beyond the material reach limit; they are relative feedback, not measured forces. Sudden pose discontinuities near a taut arm are eased over frames. Ordinary continuous controls retain their existing movement. A high-pull history remains visible in the stitch review after the hands relax.

Skin closure now preserves a small local eversion profile, including preparation with the forceps. Excessive pull adds local puckering, which relaxes when demand is removed. Only valid dermal purchase carries closure; fat follows horizontal approximation passively and receives no eversion lift. Thread and driver support use the responding skin surface to keep the core above it. This is a bounded geometric response, not an elastic tissue or tissue-damage model. Vessel and nerve environments retain their own wall geometry.

A six-stage exercise connects eversion/pass, extraction, tying, release, trimming and review. After extraction, **Begin knot tying** keeps the guided sequence; **Tie freely after pass** preserves the completed pass and actual tissue purchase while switching to free instrument tying. This transition currently seeds the exterior free strands; needle-to-knot material transfer remains approximate. **Free tying lab** still starts a separate preplaced stitch and cannot count as a completed needle-pass exercise.

Open both jaws after seating the opposing lock. Free tying observes a 1.5-second released hold; guided tying keeps its existing release check. Use **Position scissors at tail**, close the scissors, then position and cut the other tail. Both primary tails must be cut to complete the exercise; shortening an offcut does not count twice. The sidebar and review report assisted bite symmetry, edge alignment, knot placement, eversion/puckering and trimming. Completion records the performed exercise stages, not a clinical quality grade; bite placement is still assisted by the needle guide.

## Capture and retry feedback in 0.32

A collapsed opening now gives a persistent rewrap hint. Partly opened bights stay eligible for actual material passage. A live bight moving sideways off the shaft remains eligible for actual tail passage. A missed opening gives a persistent retry hint while the tail stays held; releasing or successfully passing the tip clears it.

Provisional thread contact now ramps with elapsed physics time rather than advancing twice per step. A passed loop and its observed short-post material are protected from scissors while waiting for driver clearance, before full retention. The existing material strands, independent instruments and automatic knot-start detection remain in use.

Regression coverage includes off-center passage through tilted fine-jaw openings, outside misses, rolled and tilted instruments with real wrap/pull-through motion, collapsed openings, sideways clearance, and gentle provisional contact at 60 and 120 Hz. These remain geometric capture and retention approximations.

## Sliding starts and trimming in 0.31

Two same-direction single throws can draw down together along the taut short post. The second throw's material boundary follows the first throw as it advances; it cannot feed through the earlier core. Once the base bears at the stitch, it holds while the next throw seats and while the opposing lock is prepared. This remains an approximate material constraint, not a calibrated slip-knot or security model.

Driver clearance now covers the seated stack, including upper throws. The optional **Position scissors at tail** assist selects the untrimmed long tail first and the short tail after a successful cut. The readout tracks cuts on both attached tails; cutting a detached offcut does not count again. Protected material around every retained throw remains uncuttable, and reset clears trimming progress.

## Between throws in 0.30

After seating the first throw, release and regrasp the gold tail to prepare another wrap. Lower both held ends and pull gently apart to draw the next compact throw onto the earlier knot. Feeding uses existing material and stops at the earlier throw's protected long-thread and post coordinates.

The readout separates an opposing throw formed in the air from an opposing lock seated on the existing knot. Seating requires adjacent compact throws, short bridges on both strands, and the first throw bearing at the stitch. These are geometric checks, not a clinical knot-security assessment. The earlier core retains its material coordinates during regrasping and preparation; input and graphics remain unchanged.

## Tissue seating in 0.29

A tightened throw above the pad no longer closes the wound. Closure starts when the compact first throw bears near the stitch and slack has been taken up on both tissue-side arms; dermal purchase on both sides is still required. Retained bearing holds after release while the first throw stays supported, and an opposing lock increases closure only after that first throw has reached tissue. This is geometric approximation, not a calibrated tension measurement.

To seat a first throw, keep both ends held, lower them toward the stitch plane and pull gently apart. Existing material feeds through the compact throw under tension, including a taut V that has no spare slack. Post movement is rate limited. A surgeon's double wrap stops feeding once seated and holds while the opposing throw is prepared. Releasing a hand cancels the seating action; simply regrasping low tails does not restart it.

Compact cores have local support at the stitch surface, including a narrow bridge between microsurgery portals. The driver clears a supported core while shallow skin overlap remains available for nearby tail pickup. The badge distinguishes touching tissue with slack from bearing at tissue; the readout shows tissue purchase and whether wound edges are drawing together.

## Free knot capture and stability in 0.28

After observed tail passage, a gently engaged material neck and rim contact preserve the threaded bight while it slips off the driver. It does not compact the loop onto the instrument, and releasing or reversing the tail cancels this provisional support. Driver clearance now uses the actual shaft and jaw contact shapes, including Castro jaws, instead of a broad bounding box. Both single and double wraps follow the rotating material opening. The detector searches free material before the working grasp and selects the winding portion, excluding long curved outgoing arms.

Retention uses the short strand's actual crossing through the opening rather than the nearest particle. A loop that has slipped off the short strand gives a retry notice. Additional coupled distance corrections preserve velocity so settling and material feeding do not launch the free arm. Existing strand length, tool pins and independent input remain intact.

Regression coverage includes diagonal and rotated openings, narrow jaws, release/regrasp before the next throw, movement during capture and tightening, and retained material coordinates after a sliding start is locked. Retention remains a material-space approximation.

## Patch 0.27.1

Invalid wraps now rearm passage detection automatically so a corrected wrap can form a throw without resetting practice.

## Reliability and formation changes in 0.27

The opening detector follows moving material within a wrap until tail passage, then preserves the actual crossing coordinates. Coverage includes late grasps, elliptical single and double wraps, and material feeding beyond the held working end. Capture feedback now explains a released or reversed tail, an opening still on the driver, missing grips, and slack or reach limits during tightening.

New crossings engage smoothly over 0.3 seconds. Knot corrections share a per-particle budget across all contact iterations in a physics step, increasing gradually over the first 0.6 seconds. This reduces formation kicks without weakening settled retention. The readout distinguishes a tightened throw from one near the tissue; the seating indicator uses geometric proximity to the bite, not a force measurement. Retention regressions also cover releasing and repositioning instruments, then cutting a free tail.

## Stability changes in 0.26

Free tying limits physics catch-up to two fixed steps per display frame and reduces extra contact iterations once throws are seated. Material reach limits prevent dragging a captured knot beyond the available thread. Local velocity damping reduces idle chatter while preserving uniform strand motion. Sliding tension is measured between the collar and the held post, so slack below the knot does not block advancement.

Microsurgery thread and driver contact follow the hollow tube wall, including its underside and cut face, rather than snapping to its upper surface. Skin thread approaching the pad from below meets its side instead of jumping to its top. Near an accessible short endpoint, a neighboring fold no longer steals a driver pickup.

Build 0.26.1 uses two continuous, wider Mayo scissor halves with finger-ring holes and a central screw; Westcott scissors retain their spring-handle shape. Free throw capture engages gradually, with local damping during tightening as well as after seating. Both held ends respect the shared material paths through retained throws, including material spent in earlier coils. Sliding collars leave room to seat outside the closed jaws, and existing loop particles compact as material is drawn through. Passage detection includes working jaws, fine jaw openings, and loose wraps while still requiring actual held-tail passage.

Build 0.26.1 also damps relative motion in the guided needle thread at each physics step. The bend solver respects the fixed tract curvature at its boundary, and the guide no longer packs spare exterior folds into the small gap as the needle eye emerges. Regression coverage includes the completed pass, forceps handoff, extraction, and subsequent settling in skin and microsurgery.

## First-throw handoff, shallow pickup and dermal depth (build 0.24.2)

The driver can overlap skin by up to 0.04 scene units for pickup. A matching local thread-support indentation beneath its contact capsules preserves room for a wrap, rather than forcing the strand through the shaft. Tray and floor support remain unchanged. This is a bounded collision approximation; it does not deform the rendered tissue.

Tail-passage detection now trims exterior arms and projects a shaft-supported helical opening along the shaft axis. It preserves the opening's material indices during passage. Retention engages shortly after clearance past the jaw tips, before the unsupported loop can sag out of its capture neighborhood. Stronger neck projection and additional coupled sweeps keep the crossing together during opposed pulling. Seating feedback is assessed after contact converges. A regression performs actual jaw pickup, forceps wrapping, driver pull-through, opposed tightening, and release without injecting a prepared loop or passage event.

Guided needle and thread paths, and both knot views, share a shallow circular tract with a lowest point of 0.25, just inside the dermis (bottom 0.24). Raising the circle center and narrowing its surface bite preserves the needle's actual radius. Dermal purchase remains the closure-load criterion. The driver's identifying collar and legend are now red.

At build 0.24.2 this supported one retained throw. Build 0.25 adds surgeon/sliding starts and keeps earlier throws connected; see the current practice options above.

## Resting-tail layout and skin-level pickup (build 0.24.1)

The free short tail starts in a broad arc matching its full 1.2-unit material length. Previously its much shorter seed path forced the distance solver to create small folds while expanding it. A weak straightening preference also acts below the earlier sharp-angle limit, alongside tool and strand contact.

Driver pickup measures proximity from the jaw surface with the existing forgiving capture tolerance. Closing seats captured material at the jaw surface; it cannot remain floating below the grasp. Shaft-to-skin clearance stays in place to protect wraps. A free-session regression settles the actual short tail, bounds its bends, lowers an open driver to the resting tip, closes to capture it, and verifies attachment and material length.

## Driver contact with the pad (build 0.24)

The free driver now stops above the tissue instead of sinking through it and squeezing a wrapped strand out through the shaft. The existing shaft/jaw capsule geometry is sampled against the support surface, including capsule footprint overlap at pad edges. The limit includes thread-radius clearance so both the skin and shaft constraints can be satisfied at once. Tool orientation and input commands remain unchanged; the correction limits downward position only in free practice. Forceps tissue grasps and the guided needle arc keep their existing behavior. The readout reports **Driver at tissue surface** when downward movement reaches this limit.

The regression lowers a real simulated one-turn material wrap onto the skin, then holds it there. It checks retained winding, material length, and separation from both surfaces. Additional checks cover tilted shafts, overlap at a pad edge, movement outside the pad, and the free-session correction. This remains approximate capsule/heightfield contact, not tissue indentation or complete instrument-body collision.

## Free throw retention and smoother strands (build 0.24)

After the held short tip crosses a live material opening and the loop clears the driver, `FreeThrow` retains one throw using constraints on the existing strand particles. Pulling both held ends apart feeds existing material out of the loop, reducing its size; a seated throw persists after release. The readout distinguishes passage, retention, tightening and seating. Reset clears these constraints. No replacement loop mesh or instrument choreography is introduced. This first approximation supports one throw, not a complete freely tied square knot or a knot-security assessment. Opposing throws remain available in guided practice.

A soft bending constraint discourages sharp alternating folds that produced saw-tooth thread shapes. It acts on simulated particles, preserves the material budget and attachment points, and permits ordinary curved wraps. Regression coverage includes an initially jagged strand settling, tail passage and driver clearance before retention, opposed pulling, material length, release persistence, and rejection of tightening from rigid motion or a single held end.

## Free skin handling and surface detail (build 0.23)

Closing the forceps near either upper incision edge now grasps tissue before starting an exercise and in the free tying lab. Lift with **E** to evert, rotate with the existing controls, and open **X** to release. The grasp site follows the jaw's location along the incision; local roll is mirrored on the two sides. The optional **Position forceps at skin edge** aid is available outside guided preparation too. Selecting or releasing skin does not start the guided exercise. Its first maneuver continues to use the right edge at the stitch site.

A forceps grasp has one owner: skin, thread, or needle. Existing needle/thread captures take precedence when material is within reach; a skin-held forceps is excluded from new thread/needle captures until released. The free lab still starts holding the long strand, so open **X** before positioning to grasp skin. Guided knot choreography retains its existing thread grasps. Tissue relaxation continues after release. The local prescribed deformation and dermal closure-load rule remain approximations, with one skin patch held at a time.

The resting/reset needle is rotated 90° out of its original horizontal plane with its tip tangent facing upward; it stays clear of the pad. Beginning the guided needle pass still loads the established right-to-left entry pose.

Instruments now share separate cached steel color, machining-height and roughness maps, using the existing scene lighting. Reflection environments and additional graphical effects are deferred to keep rendering lightweight. Skin has denser pores, more fine creases, richer color variation and stronger height detail. These are procedural visual assets with no external downloads. Validation covers unguided and free-lab skin handling, mirrored eversion at different incision locations, grasp ownership, upward reset orientation, the guided sequence, and browser movement/release/reset/resizing checks.

## Guided pass and pull-through (updated in build 0.22)

1. Click **Start guided pass**, then optionally **Position forceps at skin edge**. Close **Z** and lift briefly with **E** to evert the upper right skin edge with its attached dermis. Stop lifting and click **Begin needle pass** to load the right driver at the right entry. There is no steady-hold timer.
2. Hold **U** to pass right to left, **O** to reverse, and **Shift** for precision. The needle and driver follow the circular guide together. The driver exposes 30° of needle body beyond emergence, then stays still for handoff, even if U remains held.
3. Open **X** to release the skin. Choose an assisted grip with the **Forceps grip position** slider (0–18% behind the tip), then click **Position forceps**, or move manually to any exposed needle-body point. Close with **Z**. The assisted capture region accepts a jaw center within 0.24 sandbox units of an exposed body segment, including an already closed approach. Its color and status text indicate readiness.
4. Open the right driver with **period** to transfer ownership. The staged grip cancels if the forceps open or move out of reach. Closing in range seats the jaws at the nearest exposed body point; the needle keeps its pose, and the local grasp point persists through transfer and rotation. Only one tool drives the needle at a time.
5. Hold **R** to continue rotating the needle with the left forceps; **Y** reverses. The forceps and needle follow the same center and radius used by the driver. Angular progress is shown. Opening the forceps pauses progress; regrasp to resume.

**Reset practice** restores tool poses, needle, thread and exercise state. The positioning buttons are explicit assists; the instruments remain independently controlled outside guided portions. Free needle pickup is still available before starting the pass, but is not a prerequisite.

The pass uses a 0.3-unit needle radius, a 135° (three-eighths-circle) needle, and 0.6-unit entry-to-exit separation. It is a geometric constraint with a visible guide; local tissue eversion is prescribed visually, not solved from tissue forces. The driver rotates until a short section of needle body emerges, then the forceps continue the same circular path until the entire 135° needle and eye clear the exit, plus a small clearance margin. There is no vertical-lift extraction. Before knot mode, a length-constrained strand follows the eye and feeds through guides along the existing tract. Surface contact and drag are simplified; there is no calibrated thread tension or tissue friction. Physical knot mechanics remain future work. Sandbox units are not calibrated clinical measurements.


The forceps are modeled as two continuous spring arms with shallow serrations on their inner ends. Opening spreads the arms; closing brings the opposing tip faces together. No detached terminal teeth or separate forceps jaw blades are used.

## Evert the skin edge before the guided pass (build 0.22)

**Start guided pass** now starts skin handling. Click **Position forceps at skin edge** for an optional open-jaw placement and a close view of the upper right edge, or position manually. Close **Z**, then lift briefly with **E** (hold **Shift** for slower movement). The grasp is in the epidermal edge; the attached dermis rises with it. Once the edge is everted, stop lifting and click **Begin needle pass**. Keep the forceps grasp during the right-to-left **U/O** pass. Releasing the edge pauses needle advancement; the positioning aid can be used again to regrasp. Once the needle emerges, open **X** to release the skin before using the existing forceps positioning aid for needle handoff and curved extraction.

`EdgeEversion` accepts a jaw pose and openness rather than keyboard events. It captures an actual local tissue attachment on jaw closure, derives local lift/roll from instrument motion, and relaxes on release. All layer meshes use the same continuous deformation at their shared interfaces; the fat base stays supported. Excessive displacement releases the provisional grip. This remains prescribed local deformation without calibrated tissue elasticity, damage or force feedback. The established needle arc remains assisted. The input adapter API is preserved. Needle-driver height now uses **N** to raise and **M** to lower, replacing Page Up/Down.

Forceps grasping and suture purchase are separate. The forceps can lift the epidermis and underlying tissue; **the dermis is the suture-bearing layer**. Shared anatomical bounds distinguish it from epidermis and fat. The guided needle arc records purchase in the dermis on each side, separately from its visible surface entry/exit. `WoundApproximation` accepts closure load only with valid opposing dermal bites. Epidermis, fat, or a single dermal bite cannot drive closure; their geometry follows dermal approximation passively. This is a layer-specific load rule, not a constitutive tissue model or calibrated strength simulation.

Tests cover epidermal grasp with dermal lift, close/open grasp transitions, local roll and release, layered rendering refresh without changing closure, pause/regrasp, complete guided handoff/extraction/knotting, and rejection of non-dermal or one-sided closure support. Browser helpers now exercise the first maneuver before continuing to the guided pass.

## Free-tail handling, collision gaps and layered tissue (build 0.21)

The short strand's actual free endpoint has a small gold marker, turning green when the driver grasps its last few material particles. Grip readouts distinguish the long strand, short strand body and short tail. `TailPassage` observes an opening derived from a contiguous material section with at least 0.8 turns around the driver; it follows those material indices as the wrap moves off the shaft. A held short endpoint crossing inside its projected polygon, clear of the boundary, receives passage feedback. Collapsed or strongly distorted openings are rejected, and a small plane-side deadband avoids chatter. This approximate geometric observation does not form a loop, move either instrument, tighten a knot or assess knot security.

The two exterior strands now receive swept segment contact at shared 120 Hz steps. Pins and tool contacts are interpolated within each display frame. Pair corrections preserve existing particle velocity; bounded sampling and kinematic pins still limit collision reliability under extreme motion or conflicting constraints.

Two additional driver-crossing gaps are addressed. A held material point previously bypassed all collisions as a kinematic pin: dragging the forceps grip directly through the driver could pull the strand through it. The occupied grip is now swept against the other instrument before solving the strands; collision correction translates the holding tool and its material attachment together. This is working-point collision, not complete instrument-body collision. Shallow swept crossings are also checked when their endpoint normals lie on the same hemisphere. Regression tests reproduce both cases, alongside the existing wrap-retention and resting-motion checks. Input adapters and key mappings are unchanged.

The needle driver's finger rings now lie in the longitudinal handle plane, with short connecting shanks. The pad has separate textured epidermal, dermal and subcutaneous-fat layers on both sides of a full-depth central split. The solid bridging base and shallow wound strip have been removed. All six layer halves follow the existing local wound approximation together, with the original top surface and needle entry coordinates preserved. Layer appearance and proportions are visual approximations; independent tissue mechanics are future work.

Validation includes contact and passage cases, all-layer closure/reset alignment, the free-lab browser movement/release/reset and resizing checks, and the guided stitch/knot workflow.

## Free-lab grasp stability and shaft crossing fixes (build 0.20.1)

Captured material and its two neighboring particles on either side are exempt from the coarse collision shapes of the instrument holding them. This lets thread occupy the jaw gap without its grasp pin and its own jaw collider fighting each other. Other instruments still collide with that region. The fix removes the persistent resting wiggle without adding blanket strand damping or smoothing away instrument motion.

Instrument contact now uses interpolated tool poses over fixed physics substeps and checks incoming motion for full crossings. Contact participates in each distance-constraint iteration; each iteration uses its own prior geometry rather than repeatedly rewinding to a stale frame pose. Fine strand edges use swept particle contact with a small chord clearance, while sparse or stretched edges also receive segment-interior contact. The contact response removes inward normal velocity while preserving tangential sliding, instead of feeding the same inward motion back into the next solve.

Regression cases cover a strand crossing completely through a stationary shaft, a moving shaft crossing stationary thread, a laid full wrap retaining its winding and material length for five simulated seconds, and actual forceps motion laying a wrap that remains after the hand stops. A separate ten-second resting test bounds residual motion and verifies that slack and strand length are retained. Reach-limit feedback now includes excess solved strand length, so a path around an obstacle that exceeds available material is reported even when the endpoints alone appear reachable.

These checks address the reproduced free-lab failures; they do not make arbitrary kinematic motion collision-proof. Sweeps use bounded adaptive samples, captured points remain kinematic, contact friction and physical knot topology remain incomplete, and a loose wrap can still slide off a tool end. Key mappings and input adapters are unchanged.

## Free tying lab foundations (build 0.20)

Click **Free tying lab** to enter a separate experiment directly. It resets the pad, parks the needle and starts with the long tail held in the forceps. Both instruments then use their complete existing translation, rotation and jaw commands, without a scripted pose override. **Reset practice** returns to the guided workflow, which remains available. The input adapter API and key mappings are unchanged.

Three foundation increments are included:

1. `FreeKnotPractice` maintains two persistent physical strands anchored at the tissue portals. Closing an open jaw near an actual strand segment captures a material particle; grasping empty space does nothing. Moving or rotating the instrument carries that captured point. Opening releases it, and moving a closed empty jaw near thread does not magnetically acquire it. Both instruments can grasp different material points.
2. `InstrumentThreadContact` resolves strand segment contact with a driver-shaft capsule and approximate working jaw/forceps-arm capsules. Segment interiors are checked, so a shaft between particles can contact the thread. Corrections preserve pinned points and avoid injecting velocity. `ThreadStrand` accepts this optional contact constraint during its existing physics solve; guided simulation is unchanged.
3. `FreeKnotView` draws only the solved strands and the buried tract, without adding an animated wrapping circle. The winding readout samples nearby strand geometry in driver coordinates; instrument rotation or circling with loose thread does not automatically earn a wrap. Tests show a taut strand bending around the shaft through contact.

This is **experimental free thread handling**, not complete unrestricted knot tying. Discrete contact may tunnel during rapid or overconstrained movement; material held by a kinematic grip can still overreach (reported in the readout). Instrument/instrument collision, contact between the separate strands, contact friction, reliable wrap retention and physical knot topology/security are not solved. The lab does not award completed knots. A loose strand can slip over a driver tip instead of wrapping. Initial material lengths and tissue pins are sandbox setup assumptions, not conservation from the preceding needle pass.

Run `node scripts/check-free-tying.mjs` with the dev server running for free-mode controls/release/reset and responsive-page checks. `SUTURE_TEST_URL` and `CHROMIUM_PATH` are supported; optionally set `SUTURE_SCREENSHOT` to save a screenshot. Unit tests cover independent instrument movement, material grasp/release, segment/shaft contact, pose-invariant winding and a negative test for circling with loose thread. The existing guided browser and layout regressions remain applicable.

## Guided single-tail pull check (build 0.19)

After the release-and-hold check passes, click **Position driver at released tail**. This explicitly positions the open driver at the simulated short-side endpoint. Close with **comma** to regrasp, then hold **Left arrow** to take up slack. When the feedback reports **Gentle load**, release the arrow and hold steady for 1.5 simulated seconds. Continuous pulling cannot complete the steady-hold requirement. The forceps-side endpoint remains free. Opening the driver during the pull fails the attempt; reset starts over.

`KnotLoadTest` estimates relative load as eight times positive endpoint extension divided by the short span's material length. Slack alone generates no load. The guided pull moves quickly through slack and more slowly once loaded. The gentle band is 0.15–0.55; above 0.65 a provisional slip rate transfers material from the opposite free span into the pulled tail. This conserves the existing material ledger. More than 0.025 units of slip fails the check. Wound approximation now responds to this test's elastic load proxy and retained slip, so excessive pulling can reopen the local seam. Releasing removes the elastic component while leaving the slip-related loss of approximation.

The release check remains a recorded result once the separate load assessment begins; it is not rerun against deliberate loading. The new readout reports relative load and cumulative slip. Positioning, pull direction and knot geometry remain assisted, and the solver uses kinematic grips without force feedback. Thresholds, stiffness and slip rates are sandbox parameters, not clinical calibration or a surgical knot-security claim. Input adapters and key mappings are unchanged.

Regression coverage includes regrasping the actual released endpoint, slack versus loaded behavior, a steady gentle hold, overpull/material transfer, wound reopening, conserved material, premature release and reset. The browser script now completes the pass, both throws, release check and gentle pull check.

## Release-and-hold check (build 0.18)

After the second throw seats, the exercise prompts you to open the forceps with **X** and the driver with **period**. Opening each jaw past its release threshold permanently removes that grip's endpoint pin for this practice attempt. The corresponding thread end falls and settles using the existing strand solver. Reclosing a jaw does not automatically regrasp a released end; reset starts a new attempt. The long-side visual continuation follows the simulated endpoint instead of remaining attached to the forceps.

`KnotReleaseCheck` waits for both releases, then observes three simulated seconds. It checks that wound approximation remains, loop/material allocation does not drift, the knot-side anchors remain in place, and particle coordinates stay finite. One release cannot start or finish the timer. A failure remains visible until reset, and monitoring continues after a pass so later detected drift invalidates it. Feedback includes release status, progress and the observed result.

Material allocation is held from the first release while the free endpoints settle. The knot shape, knot-side pins and wound approximation are still guided constraints: a successful check reports that this modeled state was retained, **not** that a physical knot has been proven secure under load. Load-driven reopening, physical slip through a knot and measured tension remain future work. Controls and input adapters are unchanged.

`node scripts/check-knot.mjs` now covers both throws, each separate grip release, the waiting/observation stages and a successful hold check. Unit/integration checks also cover released endpoints moving independently, a still-gripped end remaining pinned, failure conditions, persistent failures, retained material and reset.

## Persistent opposing throw and basic slip resistance (build 0.17)

Both throws now use the same particle strands from beginning to completion. Starting the opposing throw changes the assisted grip/loop anchors without reseeding particle positions or switching back to a staged free-span curve. The first seated mesh and its geometry remain intact, and both sides of the active throw retain connections through the seated knot. The existing positioning assists still move instruments between stages.

The material budget is now 3.5 sandbox units to cover both loops and the free spans. During the opposing throw, the first loop's sampled circumference stays reserved rather than returning to free thread. Free-span allocation accounts for endpoint reach and shares available slack. Conservation covers active loop + retained loop + two free spans; the guided tissue routes and parked-needle continuation remain outside this subsystem.

`KnotFriction` adds material-coordinate stiction and rate-limited redistribution. Small requested slips hold their allocation, and larger transfers slow as seating increases or another throw is already seated. The readout distinguishes freely feeding, resisted sliding and holding. Since instruments remain kinematic, the reach constraints can override the slip rate by the minimum necessary to avoid stretching a reachable strand. True total overreach is still reported. Reset clears material allocation, retained length, contact state and the seated geometry.

This is a positional resistance approximation, not a calibrated friction/force law or proof that a knot is secure. Loop winding, opposed-pull progress and wound closure remain assisted. There is no tension measurement, instrument force feedback or elastic tissue loading. Keyboard controls and input adapters are unchanged. Regression tests cover persistence across both throws, retained geometry, material conservation, stiction, resisted slip and reset.

## Growing wraps and shared material budget (build 0.16)

The wrap now starts on the forceps side of the driver and grows behind the grip in the same direction as its orbit, for both throws. At zero progress there is one strand contact point rather than an empty path; the first partial turn extends continuously from that point. Helical pitch grows with the laid turn, and switching to the tail-grasp stage preserves the complete wrap. Reversing the wrapping control retracts the same path.

For the first throw, `KnotMaterial` maintains a 3.1-unit budget shared by the laid loop and its two free spans. Growing the loop consumes free-span material; reducing its circumference returns material to the spans, with allocation accommodating their endpoint separation. `ThreadStrand.setMaterialLength` updates constraint rest lengths without reseeding particles or discarding motion. The ledger retains its total even at kinematic overreach, which is explicitly reported rather than silently adding length. Reset clears the allocation.

Conservation applies only to this loop/free-span subsystem. The tissue connectors and parked-needle continuation remain assisted geometry, and the second throw's free spans remain staged. Radius and loop transfer still follow guided opposed-pull progress; calibrated sliding friction, physical tension and whole-thread conservation remain future work. Regression tests cover both winding directions, the zero/completed-wrap transitions, material transfer and persistent particle state.

## Driver-carried wrap and assisted loop tightening (build 0.15)

The wrapping guide now uses the driver's full world transform. Its geometry cache includes instrument poses, so **Position driver at tail** carries the wrap with the driver even though the knot stage and wrap progress do not change. Translation and rotation are covered by rendering and geometry regression tests.

`LoopTightening` supplies a shared sliding-loop constraint for rendering and strand anchors. During the initial opposed pull the wrap slides along the shaft toward the jaws, retaining its radius. It then aligns with the captured tail, narrows with continued pulling, and settles at the wound. The first throw's short-side particle strand connects to the moving loop after release from the driver, preserving the connection while the loop tightens. The readout distinguishes sliding, tightening and seating. The same assisted loop progression is used for the opposing throw; its free spans still use the staged path.

This is an assisted geometric constraint with a bounded radius, not a frictional thread/instrument collision solver or a force-based knot model. Loop size follows the existing opposed-pull progress; full material conservation, slip resistance and knot security are not assessed. Input adapters and keyboard controls are unchanged.

## Continuous knot/tail routing (build 0.14.1)

The short-side free span now feeds into a shared knot contact as the first throw seats, with an explicit connection back to the tissue entry. Both outgoing spans and the seated crossing meet at that contact instead of rendering a floating knot beside a tail that runs directly to the skin. The opposing throw retains the seated connection. The short-span budget accommodates this longer route. This remains assisted routing, not physical sliding contact or a solved knot topology. Renderer regression tests check the actual curve endpoints against the simulated spans and the seated crossing.

## First-throw free-span simulation (build 0.14)

The first knot throw now uses two persistent particle strands: entry site to short-tail/driver grip, and the assisted wrap to the forceps grip. Gravity, length constraints, surface contact and each strand’s self-contact let these free spans sag and settle between control actions. Opposed pulling reduces their available slack; the readout describes slack from endpoint separation rather than reporting a physical tension. The shared `knotLoop` geometry keeps the simulated endpoints aligned with the wrapping guide. `StrandMesh` updates these spans every frame without rebuilding their tube geometry.

This increment covers the first throw only. Each span has a fixed length budget, with no material exchange between spans or conservation across the assisted transition into knot mode. The wrap, buried tract, parked-needle continuation and second throw remain guided geometry. Contact between the two spans, sliding around instruments, physical knot tightening and force-driven tissue closure remain future work. Wound approximation still follows the guided seating stage; controls and input adapters are unchanged.

## Strand self-contact (build 0.13)

The pre-knot strand now resolves contact between nonadjacent line segments, using the same thread radius as the renderer plus a small numerical clearance. Segment-interior tests catch crossings that particle-only tests miss. A spatial hash limits candidate pairs; oversized motion falls back to a bounded pair scan. Position corrections preserve pinned eye/tract anchors and do not inject artificial velocity impulses. Each correction is capped to prevent near-fixed contacts from causing an extreme displacement. Kinematic anchors are interpolated across fixed physics substeps to reduce sudden pulls.

This is discrete position-based self-contact, not a guarantee against tunneling at arbitrary speeds. Fully pinned or overconstrained crossings cannot be separated, and moving material guides remain assisted constraints. No self-contact friction, calibrated bending stiffness or knot-security physics is present. The existing guided knot stage still uses its separate staged geometry. Input adapters, keyboard controls and instrument manipulation are unchanged.

## Basic thread simulation (build 0.12)

During free needle handling and the guided tissue pass, `ThreadStrand` simulates 80 particles with a fixed 3.8-unit material length, distance constraints, gravity, damping and simplified skin/pad/tray contact. A fixed 120 Hz timestep keeps behavior consistent across display rates. `TissueThreadGuide` adds buried tract guides only after the needle eye enters, then shifts material coordinates as the eye exits and moves away. This feeds thread from the entry-side tail to the needle side, rather than attaching a rigid thread shape to the needle or prescribing a shortened tail.

`StrandMesh` updates persistent tube buffers in world space; moving the instrument does not move the entire thread as a rigid object. Rest lengths are approximately enforced while anchors are reachable, with numerical error and particle-sized discretization at guides. Beyond the available length the existing kinematic instrument can overreach; the readout reports **Thread at reach limit** rather than claiming a valid constraint solution or applying new input/force feedback.

Controls and the input interface are unchanged. Beginning knot mode still explicitly repositions the ends and switches to the existing staged knot visualization. Material length is not conserved across that assisted transition or within knot mode yet. Continuous collision detection, physical knot topology, calibrated portal friction and physical force feedback remain future work. Surface drag is a positional approximation, not a measured surgical friction law.

## Visual tightening and local wound closure (build 0.11)

The first part of each seating pull takes up visible thread slack. Continued opposed pulling narrows the incision locally around the stitch; the first seated throw retains most of the approximation while the opposing throw is wrapped, and the second finishes it. Releasing the driver before a throw seats lets that throw's added approximation relax. The readout reports thread state and whether the local edges are open, drawing together, or approximated.

`WoundApproximation` supplies a bounded, smoothed local displacement field. `TissuePatch` applies it to subdivided skin geometry, and entry/exit markers and knot thread anchors move with the skin. The unstitched incision ends and outer pad edges stay essentially unchanged. A small visible seam is retained so the skin surfaces never cross. Reset restores the original geometry and thread slack.

These are guided visual effects, not force measurements or a biomechanical tissue model. Tightness, knot security, tissue damage, and realistic thread tension are not assessed.

## Guided instrument tie (build 0.10)

After curved extraction completes, click **Begin knot tying**. The needle is parked on the tray, the left forceps are positioned holding the long strand, and the open right driver is positioned for wrapping. These are explicit positioning assists. The separate `GuidedKnot` state machine controls the sequence, and `KnotView` renders the staged thread geometry.

| Stage | First throw | Opposing throw |
| --- | --- | --- |
| Wrap long strand around driver | Hold R | Hold Y |
| Position driver at short tail | Click Position driver at tail | Click Position driver at tail |
| Grasp short tail | Close with comma | Close with comma |
| Seat with opposed hand movement | Hold A + Right arrow | Hold D + Left arrow |

After seating the first throw, click **Next opposing throw**. Holding the wrong wrap direction unwinds instead of advancing. Moving the ends in the same direction cannot seat a throw. Keep the forceps closed; Z recloses them after an accidental release. Opening the driver during seating returns to the tail-grasp stage. Shift slows all keyboard actions. **Reset practice** clears the knot, restores the original thread and needle, and returns to the pass workflow.

The completed result records two opposing single throws, a guided square-knot sequence. This is a staged geometric exercise: there is no knot topology solver, conserved thread length, physical tension, friction, elastic tissue model, or knot-security assessment. The sequence currently ends after two throws; further throws and realistic tightening mechanics are future increments.


Browser regression: with the dev server running, execute `node scripts/check-knot.mjs`. Set `CHROMIUM_PATH` to your Chrome/Chromium executable outside Linux, and optionally `SUTURE_TEST_URL` to another running instance. This exercises real keyboard controls through passage, selected body grasp, forceps extraction, both throws and completion, and rejects browser runtime errors. It uses the existing Playwright Core development dependency.
