# Suture Hero

A browser-based surgical sandbox built with TypeScript and Three.js. This first increment provides a tissue pad, a reference curved needle and thread, and left spring forceps and a right needle driver. It is not a clinical training tool.

## Development

Use Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
```

`npm run build` runs the strict TypeScript check and creates `dist/`. `npm test` runs the instrument behavior tests. No credentials or backend services are required.

## Controls

| Action | Left instrument | Right instrument |
| --- | --- | --- |
| Move along pad X/Z | W A S D | Arrow keys |
| Raise / lower | E / Q | PageUp / PageDown |
| Pitch | T / G | I / K |
| Yaw | F / H | J / L |
| Roll | R / Y | U / O |
| Close / open | Z / X | Comma / Period |

Hold keys for continuous motion. Both instruments can move simultaneously; browser and keyboard hardware may limit some key combinations. Drag to orbit the camera, scroll to zoom. Reset buttons restore tool poses or camera. Movement uses world axes; rotations use local axes about each working tip. Jaws are continuously adjustable. Keyboard controls are temporary and require a desktop keyboard.

## Grasping the needle

Start with open jaws and move either tool to the curved needle near the center of the pad. The needle glows green when its arc is within the jaw capture region. Close with **Z** (left forceps) or **comma** (right needle driver) to pick it up. Its pickup orientation is preserved as the tool moves and rotates. Open with **X** or **period** to release, then use the other tool to regrasp. Only one instrument can hold the needle at a time. A closed tool must reopen before another grasp attempt. **Reset practice** restores both instruments and the needle.

This is an assisted kinematic grasp prototype, not a contact simulation. Released needles remain suspended at their release pose; the thread uses a separate basic strand simulation before knot mode. Needle gravity, instrument collision, and surgical grasp-quality assessment are not implemented.

## Architecture

- `input/`: device-independent commands and keyboard adapter. Future tracked controllers should supply target poses through a dedicated pose driver rather than translating tracking into keyboard events.
- `instruments/`: instrument geometry, working-tip pivot, pose integration, jaw state, and sandbox bounds.
- `tissue/`: tissue visualization; future material, collision, and deformation models belong here.
- `suture/`: needle and grasp models, independent position-based thread strand, sliding tissue guides, and guided knot stages.
- `gameplay/`: practice-session orchestration, decoupled from rendering and input bindings.
- `scene/`: renderer, lighting, camera, and viewport resizing.

The scene uses arbitrary sandbox units; physical calibration is not established. The current tool driver is kinematic and unconstrained except for workspace bounds. Mechanical tissue deformation, calibrated thread mechanics, physical knot mechanics, haptics, and VR are not implemented. Guided passage and knot-tying stages use kinematic constraints. Realistic instrument motion is a long-term requirement: preserve full independent position, orientation, and jaw state, and add calibrated device adapters and mechanical constraints incrementally.

Next playable milestones: refine needle grasp/contact mechanics, tissue entry/exit constraints, thread pull-through, then knot mechanics and completion criteria for one simple interrupted suture. Those features require their own validated simulation models; needle pickup is currently a kinematic proximity constraint.

## Play online with GitHub Pages

The deployment workflow in `.github/workflows/deploy.yml` tests, builds, and publishes on pushes to `main`. One-time repository setting: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then run **Actions → Deploy Suture Hero to GitHub Pages → Run workflow** if the initial push ran before Pages was enabled. After a successful deployment, the site is available at https://lancelevine.github.io/suturehero/ . Future pushes update that site automatically. GitHub Pages availability depends on repository visibility and account plan.

The Vite configuration uses relative asset URLs so the build works beneath the repository path as well as locally. Only the generated `dist` site is published; no backend is required.

## Guided pass and pull-through (build 0.9)

1. Click **Start guided pass**. The needle is loaded in the right driver and positioned at the gold entry on the right. There is no angle, distance, or steady-hold test. Starting also restarts an interrupted pass.
2. Hold **U** to pass right to left, **O** to reverse, and **Shift** for precision. The needle and driver follow the circular guide together. The driver exposes 30° of needle body beyond emergence, then stays still for handoff, even if U remains held.
3. Choose an assisted grip with the **Forceps grip position** slider (0–18% behind the tip), then click **Position forceps**, or move manually to any exposed needle-body point. Close with **Z**. The assisted capture region accepts a jaw center within 0.24 sandbox units of an exposed body segment, including an already closed approach. Its color and status text indicate readiness.
4. Open the right driver with **period** to transfer ownership. The staged grip cancels if the forceps open or move out of reach. Closing in range seats the jaws at the nearest exposed body point; the needle keeps its pose, and the local grasp point persists through transfer and rotation. Only one tool drives the needle at a time.
5. Hold **R** to continue rotating the needle with the left forceps; **Y** reverses. The forceps and needle follow the same center and radius used by the driver. Angular progress is shown. Opening the forceps pauses progress; regrasp to resume.

**Reset practice** restores tool poses, needle, thread and exercise state. The positioning buttons are explicit assists; the instruments remain independently controlled outside guided portions. Free needle pickup is still available before starting the pass, but is not a prerequisite.

The pass uses a 0.3-unit needle radius, a 135° (three-eighths-circle) needle, and 0.6-unit entry-to-exit separation. It is a geometric constraint with a visible guide through static tissue, not a tissue force or deformation model. The driver rotates until a short section of needle body emerges, then the forceps continue the same circular path until the entire 135° needle and eye clear the exit, plus a small clearance margin. There is no vertical-lift extraction. Before knot mode, a length-constrained strand follows the eye and feeds through guides along the existing tract. Surface contact and drag are simplified; there is no calibrated thread tension or tissue friction. Physical knot mechanics remain future work. Sandbox units are not calibrated clinical measurements.


The forceps are modeled as two continuous spring arms with shallow serrations on their inner ends. Opening spreads the arms; closing brings the opposing tip faces together. No detached terminal teeth or separate forceps jaw blades are used.


## Visual aids and textures

**Close-up view** gives a closer oblique view; **Wide view** or **Reset view** restores the default camera. Soft tool shadows on the tissue and pad help show height. Purple marks the selected assisted grip, green the reachable or staged point, and gold the held point. These small practice markers remain visible through geometry for clarity; they are not physical instrument features.

Tissue pores, fine creases and warm skin color variation use separate color, height and roughness maps in `src/visuals/skinSurface.ts`. Brushed metal and the woven pad use `src/visuals/surfaceTextures.ts`; no image downloads or external texture services are needed. Texture maps are cached and shared. Textures are cosmetic, and shadows do not add tissue contact or physics.

## Layout regression check

Run `npm run test:layout` with a local Chrome/Chromium installation (set `CHROMIUM_PATH` if it is not in a standard location). It builds the production site and checks repeated wide-to-narrow window resizing at display scale factors 1, 1.25 and 2. It verifies that the page stops growing, has no horizontal overflow, and the canvas stays inside its container. It also checks browser runtime/ResizeObserver errors. The temporary preview server uses port 4178 and is stopped afterward.

The viewport has a CSS-controlled size. Three.js resizes only its drawing buffer, while the canvas is positioned inside the viewport and the grid columns can shrink below their contents' intrinsic size. This prevents canvas dimensions from feeding back into page layout.

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


## Visual tightening and local wound closure (build 0.11)

The first part of each seating pull takes up visible thread slack. Continued opposed pulling narrows the incision locally around the stitch; the first seated throw retains most of the approximation while the opposing throw is wrapped, and the second finishes it. Releasing the driver before a throw seats lets that throw's added approximation relax. The readout reports thread state and whether the local edges are open, drawing together, or approximated.

`WoundApproximation` supplies a bounded, smoothed local displacement field. `TissuePatch` applies it to subdivided skin geometry, and entry/exit markers and knot thread anchors move with the skin. The unstitched incision ends and outer pad edges stay essentially unchanged. A small visible seam is retained so the skin surfaces never cross. Reset restores the original geometry and thread slack.

These are guided visual effects, not force measurements or a biomechanical tissue model. Tightness, knot security, tissue damage, and realistic thread tension are not assessed.


## Basic thread simulation (build 0.12)

During free needle handling and the guided tissue pass, `ThreadStrand` simulates 80 particles with a fixed 3.8-unit material length, distance constraints, gravity, damping and simplified skin/pad/tray contact. A fixed 120 Hz timestep keeps behavior consistent across display rates. `TissueThreadGuide` adds buried tract guides only after the needle eye enters, then shifts material coordinates as the eye exits and moves away. This feeds thread from the entry-side tail to the needle side, rather than attaching a rigid thread shape to the needle or prescribing a shortened tail.

`StrandMesh` updates persistent tube buffers in world space; moving the instrument does not move the entire thread as a rigid object. Rest lengths are approximately enforced while anchors are reachable, with numerical error and particle-sized discretization at guides. Beyond the available length the existing kinematic instrument can overreach; the readout reports **Thread at reach limit** rather than claiming a valid constraint solution or applying new input/force feedback.

Controls and the input interface are unchanged. Beginning knot mode still explicitly repositions the ends and switches to the existing staged knot visualization. Material length is not conserved across that assisted transition or within knot mode yet. Continuous collision detection, physical knot topology, calibrated portal friction and physical force feedback remain future work. Surface drag is a positional approximation, not a measured surgical friction law.


## Strand self-contact (build 0.13)

The pre-knot strand now resolves contact between nonadjacent line segments, using the same thread radius as the renderer plus a small numerical clearance. Segment-interior tests catch crossings that particle-only tests miss. A spatial hash limits candidate pairs; oversized motion falls back to a bounded pair scan. Position corrections preserve pinned eye/tract anchors and do not inject artificial velocity impulses. Each correction is capped to prevent near-fixed contacts from causing an extreme displacement. Kinematic anchors are interpolated across fixed physics substeps to reduce sudden pulls.

This is discrete position-based self-contact, not a guarantee against tunneling at arbitrary speeds. Fully pinned or overconstrained crossings cannot be separated, and moving material guides remain assisted constraints. No self-contact friction, calibrated bending stiffness or knot-security physics is present. The existing guided knot stage still uses its separate staged geometry. Input adapters, keyboard controls and instrument manipulation are unchanged.


## First-throw free-span simulation (build 0.14)

The first knot throw now uses two persistent particle strands: entry site to short-tail/driver grip, and the assisted wrap to the forceps grip. Gravity, length constraints, surface contact and each strand’s self-contact let these free spans sag and settle between control actions. Opposed pulling reduces their available slack; the readout describes slack from endpoint separation rather than reporting a physical tension. The shared `knotLoop` geometry keeps the simulated endpoints aligned with the wrapping guide. `StrandMesh` updates these spans every frame without rebuilding their tube geometry.

This increment covers the first throw only. Each span has a fixed length budget, with no material exchange between spans or conservation across the assisted transition into knot mode. The wrap, buried tract, parked-needle continuation and second throw remain guided geometry. Contact between the two spans, sliding around instruments, physical knot tightening and force-driven tissue closure remain future work. Wound approximation still follows the guided seating stage; controls and input adapters are unchanged.

## Continuous knot/tail routing (build 0.14.1)

The short-side free span now feeds into a shared knot contact as the first throw seats, with an explicit connection back to the tissue entry. Both outgoing spans and the seated crossing meet at that contact instead of rendering a floating knot beside a tail that runs directly to the skin. The opposing throw retains the seated connection. The short-span budget accommodates this longer route. This remains assisted routing, not physical sliding contact or a solved knot topology. Renderer regression tests check the actual curve endpoints against the simulated spans and the seated crossing.

## Driver-carried wrap and assisted loop tightening (build 0.15)

The wrapping guide now uses the driver's full world transform. Its geometry cache includes instrument poses, so **Position driver at tail** carries the wrap with the driver even though the knot stage and wrap progress do not change. Translation and rotation are covered by rendering and geometry regression tests.

`LoopTightening` supplies a shared sliding-loop constraint for rendering and strand anchors. During the initial opposed pull the wrap slides along the shaft toward the jaws, retaining its radius. It then aligns with the captured tail, narrows with continued pulling, and settles at the wound. The first throw's short-side particle strand connects to the moving loop after release from the driver, preserving the connection while the loop tightens. The readout distinguishes sliding, tightening and seating. The same assisted loop progression is used for the opposing throw; its free spans still use the staged path.

This is an assisted geometric constraint with a bounded radius, not a frictional thread/instrument collision solver or a force-based knot model. Loop size follows the existing opposed-pull progress; full material conservation, slip resistance and knot security are not assessed. Input adapters and keyboard controls are unchanged.

## Growing wraps and shared material budget (build 0.16)

The wrap now starts on the forceps side of the driver and grows behind the grip in the same direction as its orbit, for both throws. At zero progress there is one strand contact point rather than an empty path; the first partial turn extends continuously from that point. Helical pitch grows with the laid turn, and switching to the tail-grasp stage preserves the complete wrap. Reversing the wrapping control retracts the same path.

For the first throw, `KnotMaterial` maintains a 3.1-unit budget shared by the laid loop and its two free spans. Growing the loop consumes free-span material; reducing its circumference returns material to the spans, with allocation accommodating their endpoint separation. `ThreadStrand.setMaterialLength` updates constraint rest lengths without reseeding particles or discarding motion. The ledger retains its total even at kinematic overreach, which is explicitly reported rather than silently adding length. Reset clears the allocation.

Conservation applies only to this loop/free-span subsystem. The tissue connectors and parked-needle continuation remain assisted geometry, and the second throw's free spans remain staged. Radius and loop transfer still follow guided opposed-pull progress; calibrated sliding friction, physical tension and whole-thread conservation remain future work. Regression tests cover both winding directions, the zero/completed-wrap transitions, material transfer and persistent particle state.
