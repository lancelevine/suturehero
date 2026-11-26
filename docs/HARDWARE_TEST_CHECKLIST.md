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
- [ ] **Demo.** Press Demo: the instruments tie all three throws and the stitch is kept.

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

## Known limits (not bugs to report)

- The background-thread engines score below the default in synthetic trials
  (Claude in a background thread 22/24, default 24/24). They are experimental.
- Results are practice measures from the simulation: approximate, not a validated
  assessment.
