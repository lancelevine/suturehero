# Stereo findings from Lance's recording (2026-11-08)

Written by Claude Code while Codex holds the lock on the ring/stereo geometry
files. Source: Tracking Lab export "Tracking 11/7/2026, 8:01:18 PM" (two
1920×1080 cameras, ring8 needle driver). Only parts 1 (0–3.5 s) and 5
(14.5–17.8 s) of the split export were analysed.

Method: markers re-detected independently with OpenCV `DICT_4X4_50`
(sub-pixel corners, native resolution), frames paired within 20 ms, corners
triangulated with the recording's stored stereo calibration, then the
app's own `solveStereoRigPose` run on the same corners (scaled to the 960 px
flow space) with geometry variants injected in a scratch test.

## 1. Printed marker size is 12 mm (model: 16 mm)

Triangulated side lengths: marker 6 = 11.8 mm (part 1) and 12.1 mm (part 5),
marker 5 = 11.7 mm. The calibration itself is consistent with the images:
triangulated corners reproject within 0.46 px median / 1.56 px 95th
percentile (native pixels). A fresh re-calibration matched the old one within
0.4° and ~4 mm, so the cameras had not moved.

## 2. Marker-ID collision from another instrument

Camera 1 sees IDs **2 and 3** stationary at the right image edge
(≈ x 940, y 250–275 in 960-px space), ~400 mm from the ring. They are on a
second instrument (an older tracker), inside the needle driver's ring8 ID
range 0–7. Joint fits including them fail with >400 px errors.
Suggestion: gate an instrument's markers spatially (a ring is ~33 mm across;
drop markers far from the instrument's main cluster / predicted pose) in
both mono and stereo.

## 3. The angled pads sit at the other end of the ring (confirmed physically)

Lance checked the printed ring: **06 is on the angled pad next to 00, and the
top edge of 00 touches the bottom edge of 06. 03 and 07 are oriented the same
way.** In the model (`localCorners`, `faceGeometry`) it is the reverse: marker
0's top edge is at body y = −8 and its bottom at y = +8, while face 6 sits at
y ≈ +11…+25 with its *top* edge next to 0's bottom. So, relative to the
printed marker orientation, the angled pads are at the opposite axial end.

Physical layout tested on the recorded corners: for faces 6 and 7, mirror y
(y → −y) and swap the top/bottom corner rows (TL,TR,BR,BL ← BL,BR,TR,TL),
which keeps the face tilted toward the new end and the marker upright; plus
the 12 mm square. Results (stray IDs 2/3 removed):

| Model variant | Part 1 (4 pairs) | Part 5 (21 pairs) |
|---|---|---|
| 16 mm, current layout | 0 / 4 | 0 / 21 |
| 12 mm, current layout | 4 / 4 | 2 / 21 |
| **12 mm, angled pads at the other end (as measured)** | **4 / 4** | **12 / 21**, median 0.52 px |

With this layout camera 1 becomes internally consistent (e.g. markers 6, 5,
0 at 1.3–1.7 px where marker 6 was 26 px before). An earlier note in this
file suggested "6/7 swapped and rotated"; that was an inference and is
superseded by the physical check.

Remaining failures (9 of 25) are single-marker disagreements in camera 2
(4–12 px). They are not timing (paired frames < 1 ms apart, no motion) and
do not change with angled-pad shifts of ±2 mm or marker sizes 11.7–12.1 mm.
Likely corner noise on small, steeply viewed markers in camera 2 or a small
residual calibration error; unresolved.

Mono mode hid this because build 0.79 learns a per-marker correction for
angled markers. Once the model matches, that learned correction should be
near identity; consider whether it is still needed.
