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

## 3. The angled marker 6 is not where the model puts it

Part 5, 21 paired frames, stray IDs 2/3 removed:

| Model variant | Stereo accepted |
|---|---|
| 16 mm | 0 / 21 |
| 12 mm | 2 / 21 |
| 12 mm, marker 6 treated as station 7 (6/7 swapped) | 16 / 21, median 0.52 px |

Per-frame search over marker 6 placement (station 6 or 7) × in-plane
rotation (0/90/180/270°): the most constrained frame (camera 1 sees 6, 0, 1;
camera 2 sees 6) fits **only** with marker 6 at the model's station-7 pad and
rotated 180°. Frames with fewer faces fit several variants. Frames where
camera 1 sees 6, 5, 0 and camera 2 sees 4 or 5 fit no variant (unresolved;
possibly another layout difference or motion).

This also explains Lance's earlier live reading "cam1 6:28.5 0:9.2 · cam2
6:24.8 0:18.1". Single-camera mode hides it because build 0.79 learns a
per-marker correction for angled markers; stereo uses the raw model.

**Recommended:** confirm on the physical ring which side-face marker the
angled marker 6 sits next to, and which way its top points, before changing
the model. Alternatively give stereo the same learned angled-marker
correction mono uses, or fit the ring's face poses from recordings.
