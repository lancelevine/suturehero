# Hardware test checklist

Everything shipped recently that only Lance can check, because it needs the real
camera, the Bluetooth jaw sensors, the iPhone or hands-on knot tying. Agents can only
test these with simulated hardware. Tick each box, and note anything that fails (a
screen recording or exported profile helps most).

Last updated: 2026-11-26 (builds 0.205–0.221). Check the build number in the header
first (`BUILD 0.2xx`).

## 1. Jaw sensors (Bluetooth Hall boards)

Setup: Chrome or Edge on the Windows PC; both boards charged.

- [ ] **Firmware update.** Upload `firmware/hall-jaw/hall-jaw.ino` to both boards.
      Set `DEVICE_NAME` to `"SutureHero Jaw 2"` for the forceps board.
- [ ] **Connect both.** Instrument calibration → Jaws → Jaw sensors →
      Connect sensor 1 (SutureHero Jaw) and Connect sensor 2 (SutureHero Jaw 2).
- [ ] **Battery level.** Each sensor shows `battery NN%`. Compare it with the
      `battery_volts` line in the Arduino Serial Plotter: a full battery reads about
      4.1–4.2 V. If the percentage is nonsense, set `READ_BATTERY = false` in the
      firmware and tell an agent.
- [ ] **Guided calibration.** Calibrate (guided) on each: hold closed, then open
      and close fully 2–3 times. The note should read `Calibrated · closed … · open …`.
- [ ] **Live graph.** Opening and closing gives a clean, tall swing between the dashed
      closed and open lines.
- [ ] **Jaws follow.** The virtual needle driver and forceps open and close with the
      real ones, without visible lag or wobble.
- [ ] **Reconnect after reload.** Reload the page: both sensors reconnect by
      themselves (if they don't, Chrome may not support remembered Bluetooth devices
      on this PC; Connect still works).
- [ ] **Reconnect after dropout.** Switch one board off: "Stop reconnecting" shows.
      Switch it on: it reconnects within a few seconds.
- [ ] **Camera off.** Turn camera tracking off: the jaws still follow the sensors in
      Sandbox.
- [ ] **Third slot (optional).** "Add a third sensor" adds a scissors slot.

## 2. Knot tying (hands-on feel)

- [ ] **Default engine is Claude.** Practice setup → Knot engine shows Claude.
- [ ] **Knots lock normally.** A surgeon's knot and a square knot lock and seat, at your
      normal speed and when quick.
- [ ] **No new lag.** Since build 0.219, physics keeps real time at 30 fps (more work per
      second on a slow laptop). Tying should not feel slower or laggier than before.
- [ ] **Background engine (optional).** Knot engine → "Claude in a background thread
      (experimental)": tying should feel smoother on a slow laptop. Report whether knots
      behave as well as with the default.
- [ ] **Demo.** Press Demo: the instruments tie all three throws and the stitch is kept (since
      0.227 also on a slower laptop).

## 3. Results export (Sandbox)

- [ ] **Trainee name.** Session review → Sandbox session: enter a trainee name or ID.
- [ ] **Finish a stitch.** Tie a stitch in Sandbox and press Finish stitch.
- [ ] **Stitches CSV.** Export stitches CSV opens in Excel. Check the knot type, throws
      (e.g. `2+ 1-`), locked, security and seconds.
- [ ] **Progress CSV.** Save session to progress, then Export progress CSV: one row
      per saved session.
- [ ] **Guided course CSV.** Start the 3-stitch course, save a stitch, open Stitch plan:
      Export course stitches CSV gives one row per saved course stitch.

## 4. Cameras

- [ ] **Everyday camera unchanged.** Single-camera tracking works as before. The
      tracking page was reorganised internally (builds after 0.218) with no intended
      change.
- [ ] **Stereo setup unchanged.** If you use two cameras: importing or removing a
      stereo calibration, the workspace axes and "Start 2 cameras + metric 3D" behave as
      before.
- [ ] **Camera capture restructured (2026-11-27).** Both cameras' frame capture now runs through
      one shared module. Tracking should look and feel exactly as before with one camera and with
      two; Diagnostics → profile should still list Camera 1 / Camera 2 rows.
- [ ] **Stereo tip (if calibrated).** With two cameras and a calibrated tip, the instrument
      sits at its real tip and the saved jaw orientation still applies (code moved 2026-11-27).
- [ ] **Rotation unchanged (2026-11-27).** Rolling and tilting each instrument, and turning it
      so a different ring face shows, looks the same as before (the rotation code was moved).
- [ ] **Depth range.** Near / Far / Reset depth range and the working-depth field
      behave as before.
- [ ] **OV9281 (when they arrive).** Start one: Camera settings → Camera type switches
      to OV9281 by itself, at 1280×800 / 120 fps. Note the camera's name shown there if it
      doesn't contain "OV9281".

## 5. iPhone

- [ ] **8-face ring default.** On the iPhone, Marker tracker reads "8-face ring" after
      loading (even if a prism was chosen earlier on that phone).
- [ ] **Production start.** The page opens in Production mode with "Start back camera".

## 6. Production mode and titles

- [ ] **Production tab.** The Production tab is next to Simulator and Tracking Lab, and
      opens the clean full-screen view.
- [ ] **Microsurgery title.** In Microsurgery, the title above the scene reads e.g.
      "Nerve anastomosis · one stitch" (not "Sandbox").

## 7. Layout (build 0.224)

- [ ] **Header buttons.** Setup, Stitch plan, Review and ? Guide each open a panel to the
      right of the scene; ✕ or Esc closes it. Nothing is left under the scene but the
      instruction strip.
- [ ] **Tracking menu.** Tracking ▾ holds Tracking setup, Diagnostics and Start 2 cameras.
- [ ] **Laptop screen.** On your laptop the scene is still big enough to practise.

## 8. Graphics (build 0.226)

- [ ] **Steel instruments.** On Standard graphics the instruments look like polished steel, the
      skin colour is unchanged, and the frame rate is no worse than before.
- [ ] **Softer shadows (0.228).** Instrument shadows are lighter than before but still show where
      the instruments are. Say if you prefer the old darker ones.

## 8b. New look (build 0.229)

- [ ] **Readable everywhere.** Practice page, Tracking Lab, Production and the tracking page all
      use the dark theme; no white panels left, text readable, buttons clearly clickable.
- [ ] **Camera views.** Camera previews and overlays still look right on the dark panels.
- [ ] **HUD (0.230).** Timer counts up; Precision fills after a needle pass; Tension moves while
      tying; Progress fills a segment per kept stitch; the dashed line runs along the wound. Say
      whether the challenge targets (6 sutures, 10:00, ±1.0 mm) are the ones you want.
- [ ] **Skill Analysis (0.231).** Analysis → values update while you practise; the path chart
      follows the needle driver; check the definitions suit you (tooltips on each row).
- [ ] **Microsurgery HUD (0.232).** Alignment falls and Score rises as the vessel ends close.
      Confirm the display scale (2.5 mm per scene unit) or give the vessel size to use.

## 9. Older items still worth checking (optional)

Moved here from the handoff Status block on 2026-11-27; details are in
`docs/archive/AGENT_HANDOFF-to-2026-11-14.md`.

- [ ] **Stereo stabilisation (0.88).** Two cameras: hold the needle driver still; it should not
      jump. Then move it deliberately; response should stay usable.
- [ ] **Tracking Lab recording (0.83).** Record a real tracking failure, stop, replay and export it.
- [ ] **Camera-track frames (0.135).** With an OV9281, an exported profile shows `frameSource`
      "camera track" and capture rates above 30/s.

## Known limits (not bugs to report)

- The background-thread engines score below the default in synthetic trials
  (Claude in a background thread 22/24, default 24/24). They are experimental.
- Results are practice measures from the simulation: approximate, not a validated
  assessment.

- Build 0.235: on a phone, the practice scene is full width with the camera panel below it; scroll down for calibration and the instruction strip.
- Build 0.235: in Sandbox, make a straight pass and a deliberately slanted one; the straight one gets a green line across the wound, the slanted one amber, and the Targets list shows "Square to wound" with the worst angle.
- Build 0.235: in Sandbox, tie a stitch in the middle, then at about the quarter points; the summary's spacing line ends "Stitch order: middle first, then halving". Start at one end instead and it says from which stitch to change.
- Build 0.235: in Sandbox, make passes with one much wider bite; the summary's "Bite consistency" line names that pass as an outlier.
- Build 0.235: open Analysis, touch the forceps and needle-driver tips together (not while passing the needle): "Tip collisions" goes up by one per touch. Passing the needle between them should not count.
- Build 0.235: in Sandbox, press "Start 5-minute warm-up", make a few passes and let it run out; the line then reads "Warm-up done today · 1-day streak · last: N passes…". Stopping early does not log.
- Build 0.235: finish a 3-stitch session with the stitches far apart; the closure review ends "Gap scan: open at … to …". With close, even stitches it says "edges touching along the wound". Open stretches also show as red bars on the wound.
- Build 0.235: with the needle through the skin, regrasp it right at the tip, then behind the tip; Analysis "Regrasp on tip" shows 1/2.
- Build 0.235: make a pass with the needle driver between your view and the exit point; Analysis "Blind exits" counts it (1/1). A pass with a clear view does not.
- Build 0.235: in Sandbox make one shallow and one deep pass; the summary's "Bite depth" line names them (too shallow / too deep).
- Build 0.235: tie a stitch with a much wider bite on one side; the spacing/closure line reports a step-off for that stitch.
- Build 0.235: enter the skin once with the edge gently lifted and once without holding it; Analysis "Edge presented" shows 1/2.
- Build 0.235: after a Sandbox pass, the stitch line shows small ruler ticks every mm out from the wound centre, a longer one every 5 mm.
- Build 0.235: pick the needle up with the forceps, pass it to the driver, then drop it once on the table; Analysis "Needle handling" shows 1 drop and a load time.
- Build 0.235: in Sandbox, one deep narrow pass reads "flask" and one shallow wide pass reads "V-shaped" in the "Bite shape" line.
- Build 0.235: in Sandbox, make a wide deep pass across the wound, then a narrow shallow pass back at the same spot; the summary lists a vertical mattress with its checks. Two similar passes back and forth ~5 mm apart read as a horizontal mattress.
- Build 0.235: in Sandbox, three passes from the same side about 5 mm apart read as "running"; alternating bites that stay under the skin on each side read as "running subcuticular".
- Build 0.235: in Microsurgery, a green clamp sits on each vessel end; moving the "Acland clamp" slider to 60% brings the ends closer (Alignment readout drops) and to 140% spreads them.
- Build 0.235: in Microsurgery, set "Stay sutures" to 3 · 120°; three cyan marks appear on each vessel end, one at the top.
- Build 0.235: in Microsurgery, "Turn vessel 45°" turns the clamp and stay marks around the vessel; "Flip vessel" turns it half way round. The needle still works on the top of the vessel.
- Build 0.235: in Microsurgery, complete a stitch, press "Save stitch & turn": the knot stays on the vessel and turns with it, a fresh stitch starts on top, and the HUD reads 1/8. Repeat and use "Flip vessel" for the back wall.
- Build 0.235: in Microsurgery, plan a very deep vessel bite; while passing it the instruction line starts with "Back wall caught".
- Build 0.235: tie a first throw but leave it loose above the skin, then make the second throw; the instruction line starts with "Air knot". A normally seated knot shows no warning.
- Build 0.235: tie two Sandbox stitches with the knot pulled to the left each time; the spacing line ends "Knots: 2/2 off the incision · all on the left". Leave one over the wound line and it is counted.
- Build 0.235: while free tying, pull a strand gently taut: it glows green; pull hard: it turns red.
- Build 0.235: in Microsurgery (artery), the HUD progress reads x/16; after saving stitches the instruction line says "Stitches n/16 … evenly spaced" unless you turned the vessel unevenly between them.
- Build 0.235: Setup → "Landmark exercise": a red line crosses the wound at the centre; put the first stitch on it and the instruction line says "aligned ✓".
- Build 0.235: Setup → Body site → Scalp: the pad shows stubble and the dermis is thicker; Face: pinker, finer pores, freckles, edges closer. Move the Tension slider up and the wound gap widens.
- Build 0.235: in Sandbox, make two passes without tying and let the thread rest: after a few seconds the earlier loop sags and the line says "slack at loop 1"; pull the thread taut and it tightens.
- Build 0.235: Setup → Size 6-0, tie and pull hard: the strand snaps with "Suture snapped (6-0)"; with 3-0 the same pull does not snap. The instruction line shows "Pull: peak N% of … breaking point".
- Build 0.235: tie three stitches on a high-tension body site (Back, or Tension slider up): the glows around the stitches turn amber/red; on Face they stay green.
