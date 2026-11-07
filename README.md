# SutureHero

A browser-based surgical skills sandbox built with TypeScript and Three.js. You
practice simple interrupted sutures in skin and anterior-wall stitches in
microsurgery, from the guided needle pass through free instrument tying. You
can move the instruments with the keyboard, or with real instruments tracked
by a webcam.

**Status:** research prototype (build 0.82). Tissue, thread and knot behavior
are approximate models in arbitrary sandbox units, and camera tracking has been
checked mostly with synthetic camera tests. SutureHero is **not** a validated
clinical training or assessment tool yet.

- **Play online:** <https://lancelevine.github.io/suturehero/>
- **What changed in each build:** [`CHANGELOG.md`](CHANGELOG.md)
- **Working with AI coding agents:** [`AGENTS.md`](AGENTS.md) and
  [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md)

## Quick start

Requires Node.js 24 (see `.nvmrc`). No backend or credentials are needed.

```sh
npm ci
npm run dev
```

Open the printed local URL. Camera access needs `localhost` or HTTPS. Two
pages are served:

- `index.html`: the practice lab, with camera tracking available inside it.
- `tracking.html`: the standalone **Instrument Tracking** page (same camera
  panels, without the practice scene).

## Practice options

The setup bar selects the environment, target, needle, suture and guided knot
technique. Changing the setup restarts practice, and the choices are kept in
the URL. **Graphics → Fast** turns off shadows and caps rendering resolution
(`graphics=low` in the URL).

- **Skin:** thin, standard or thick dermis under a fixed epidermis, above fat.
  The session plans a series of stitches with adjustable bite width and
  spacing, and tissue closure responds to tension.
- **Microsurgery:** two artery ends, a smaller artery, or nerve ends. One
  anterior-wall or sheath stitch is supported, not a full anastomosis. The
  driver becomes a Castroviejo.
- **Needles:** PS-2, CT-1, SH, FS-2, P-3 and BV-1 practice-scale profiles.
- **Sutures:** Prolene, nylon and Monocryl. They share one strand solver with
  exploratory (not measured) material differences.
- **Knots:** guided mode walks through a surgeon's or sliding start. Free mode
  detects single, surgeon's, square and sliding throws from what you actually
  tie.
- **Scissors:** **Use scissors** routes the right-hand controls to Mayo
  (skin) or Westcott (microsurgery) scissors to trim tails.

### Guided pass in brief

1. **Start guided pass**. Evert the skin edge with the forceps (close **Z**,
   lift with **E**), then **Begin needle pass**.
2. Rotate the needle through the tissue with **U** (reverse **O**, hold
   **Shift** for precision). The driver stops once enough needle has emerged.
3. Release the skin (**X**), grasp the exposed needle with the forceps, then
   open the driver (**period**) to hand it over.
4. Continue rotating with the forceps (**R** / **Y**) until the needle clears,
   then tie.

Purple marks a selected assisted grip, green a reachable point and gold a held
point. **Close-up view**, **Wide view** and **Reset view** change the camera.
Details of each step are in the changelog (build 0.22 onward).

## Keyboard controls

| Action | Left instrument (forceps) | Right instrument (driver) |
| --- | --- | --- |
| Move along pad X/Z | W A S D | Arrow keys |
| Raise / lower | E / Q | N / M |
| Pitch | T / G | I / K |
| Yaw | F / H | J / L |
| Roll | R / Y | U / O |
| Close / open | Z / X | Comma / Period |

Hold keys for continuous motion; both instruments can move at once. Drag to
orbit the view and scroll to zoom. Movement uses world axes; rotations use
local axes about each working tip. To pick up the needle, bring open jaws to it
(it glows green when in reach) and close. Only one instrument holds the needle
at a time.

## Camera tracking

Real instruments carry printed ArUco markers (OpenCV `DICT_4X4_50`) and small
balls on the jaws. The browser detects them from one or two webcams and drives
the virtual instruments.

**Current hardware**

- **Tracker:** the 8-face ring (`ring8`), with 16 mm markers on 19 mm pads.
  Marker IDs are needle driver 0–7, forceps 10–17 and scissors 20–27. The
  older prism (0–2 / 3–5 / 6–8) and 6-face ring (0–5 / 10–15 / 20–25) are
  still supported.
- **Jaw markers:** solid white balls on the needle driver (new, being tested).
  Colored and striped (white with three black bands) modes also exist; the
  forceps choice is still open.
- **Cameras:** one camera in daily use. A pair of OV9281 monochrome
  global-shutter cameras (1280×800, up to 120 fps) is planned for stereo.
  These cannot see color, so colored jaw balls will not work with them.

**Setup outline**

1. Open **Calibrate**, choose the camera, and set focus and exposure under
   **Camera controls**.
2. Under **Tracking setup**, choose the tracker geometry and mode (one or two
   cameras).
3. For each instrument, hold it in a comfortable position and **Set neutral
   pose**. Adjust sensitivity, axis mapping and tip offset, then **Save**.
4. For jaws, assign or sample the balls, then capture closed/open at **Near**
   and **Far**.
5. For stereo, capture about 20 varied checkerboard poses (default 9 × 7
   squares, 16 mm; verify your print), export them, and solve offline:

   ```sh
   python -m pip install -r scripts/requirements-stereo.txt
   python scripts/validate_stereo_calibration.py captures.json --output calibration.json
   ```

   Import the solved JSON in **Tracking setup**. The solver refuses solutions
   that fail its reprojection and geometry checks.

Settings and calibrations are saved in the browser's local storage, per
browser. A status badge on the practice view shows whether stereo, a fallback
camera or single-camera tracking is active. **Diagnostics** has performance
reports and marker overlays.

Single-camera depth is estimated from apparent marker size and is
approximate. Stereo falls back to whichever camera still sees the tracker.

## Project structure

```
index.html → src/main.ts          practice lab (scene, UI, input wiring)
tracking.html → src/tracking.ts   camera tracking setup and pose output
src/input/        tracking, calibration, marker and ball detection, workers
src/instruments/  instrument geometry, jaws, scissors
src/suture/       needle, thread strand, knot mechanics
src/tissue/       tissue patch, needle pass, wound closure, eversion
src/gameplay/     practice session, stitch course, assessment
src/environments/ and src/setup/   skin types, micro targets, needles, sutures
src/scene/, src/visuals/, src/ui/  rendering, textures, panels
scripts/          browser checks, OpenCV.js build, stereo calibration solver
```

`src/tracking.ts` sends poses to the practice lab as `suturehero:*` window
events (or `postMessage` when it runs in its own page).

## Development

```sh
npx tsc --noEmit   # strict type check
npm test           # unit tests (about 4 minutes)
npm run build      # type check and production build into dist/
```

Use Node 24. One physics regression test fails on Node 22 because of
floating-point differences.

**Browser checks.** `scripts/check-*.mjs` drive the real app in local Chromium
with synthetic cameras. Start `npm run dev`, set `SUTURE_TEST_URL` if not using
port 5173 and `CHROMIUM_PATH` if needed, and run them one at a time (software
WebGL is CPU-heavy), for example:

```sh
node scripts/check-practice-setup.mjs
node scripts/check-free-tying.mjs
node scripts/check-knot.mjs
```

Many tracking checks accept `ARUCO_LIBRARY_DIR` pointing at a local copy of
js-aruco2 2.0.0 when the CDN is unreachable, and some have extra modes
described at the top of each script or in the changelog (e.g.
`SUTURE_JAW_PARTNER=1 node scripts/check-ball-pairs.mjs`). Marker decoding
fixtures are described in `scripts/fixtures/README.md`.

`npm run test:layout` builds the site and checks repeated window resizing at
several display scales (preview server on port 4178).

**External code.** The marker decoder loads js-aruco2 2.0.0 from jsDelivr at
runtime. Stereo checkerboard capture needs a custom OpenCV.js build at
`vendor/opencv.js`. CI builds it; locally run
`bash scripts/build-opencv/fetch-and-build.sh` (needs Docker), otherwise
stereo capture is unavailable in development.

**Decoder performance notes.** Full-frame thresholding uses reusable buffers
and row-wise sliding sums, matching js-aruco2's integer rounding and borders.
`scripts/check-full-scan.mjs` compares its output with the pinned library and
benchmarks 1080p scans (about 62 → 55 ms locally; run it alone).

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: install, unit tests,
OpenCV.js build (cached), production build, then publish to GitHub Pages. A
failing test stops the deploy. Assets use relative URLs so the site works under
the repository path.
