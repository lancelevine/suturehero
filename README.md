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
| Raise / lower | E / Q | N / M |
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

## Guided pass and pull-through (updated in build 0.22)

1. Click **Start guided pass**, then optionally **Position forceps at skin edge**. Close **Z** and lift briefly with **E** to evert the upper right skin edge with its attached dermis. Stop lifting and click **Begin needle pass** to load the right driver at the right entry. There is no steady-hold timer.
2. Hold **U** to pass right to left, **O** to reverse, and **Shift** for precision. The needle and driver follow the circular guide together. The driver exposes 30° of needle body beyond emergence, then stays still for handoff, even if U remains held.
3. Open **X** to release the skin. Choose an assisted grip with the **Forceps grip position** slider (0–18% behind the tip), then click **Position forceps**, or move manually to any exposed needle-body point. Close with **Z**. The assisted capture region accepts a jaw center within 0.24 sandbox units of an exposed body segment, including an already closed approach. Its color and status text indicate readiness.
4. Open the right driver with **period** to transfer ownership. The staged grip cancels if the forceps open or move out of reach. Closing in range seats the jaws at the nearest exposed body point; the needle keeps its pose, and the local grasp point persists through transfer and rotation. Only one tool drives the needle at a time.
5. Hold **R** to continue rotating the needle with the left forceps; **Y** reverses. The forceps and needle follow the same center and radius used by the driver. Angular progress is shown. Opening the forceps pauses progress; regrasp to resume.

**Reset practice** restores tool poses, needle, thread and exercise state. The positioning buttons are explicit assists; the instruments remain independently controlled outside guided portions. Free needle pickup is still available before starting the pass, but is not a prerequisite.

The pass uses a 0.3-unit needle radius, a 135° (three-eighths-circle) needle, and 0.6-unit entry-to-exit separation. It is a geometric constraint with a visible guide; local tissue eversion is prescribed visually, not solved from tissue forces. The driver rotates until a short section of needle body emerges, then the forceps continue the same circular path until the entire 135° needle and eye clear the exit, plus a small clearance margin. There is no vertical-lift extraction. Before knot mode, a length-constrained strand follows the eye and feeds through guides along the existing tract. Surface contact and drag are simplified; there is no calibrated thread tension or tissue friction. Physical knot mechanics remain future work. Sandbox units are not calibrated clinical measurements.


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

## Persistent opposing throw and basic slip resistance (build 0.17)

Both throws now use the same particle strands from beginning to completion. Starting the opposing throw changes the assisted grip/loop anchors without reseeding particle positions or switching back to a staged free-span curve. The first seated mesh and its geometry remain intact, and both sides of the active throw retain connections through the seated knot. The existing positioning assists still move instruments between stages.

The material budget is now 3.5 sandbox units to cover both loops and the free spans. During the opposing throw, the first loop's sampled circumference stays reserved rather than returning to free thread. Free-span allocation accounts for endpoint reach and shares available slack. Conservation covers active loop + retained loop + two free spans; the guided tissue routes and parked-needle continuation remain outside this subsystem.

`KnotFriction` adds material-coordinate stiction and rate-limited redistribution. Small requested slips hold their allocation, and larger transfers slow as seating increases or another throw is already seated. The readout distinguishes freely feeding, resisted sliding and holding. Since instruments remain kinematic, the reach constraints can override the slip rate by the minimum necessary to avoid stretching a reachable strand. True total overreach is still reported. Reset clears material allocation, retained length, contact state and the seated geometry.

This is a positional resistance approximation, not a calibrated friction/force law or proof that a knot is secure. Loop winding, opposed-pull progress and wound closure remain assisted. There is no tension measurement, instrument force feedback or elastic tissue loading. Keyboard controls and input adapters are unchanged. Regression tests cover persistence across both throws, retained geometry, material conservation, stiction, resisted slip and reset.

## Release-and-hold check (build 0.18)

After the second throw seats, the exercise prompts you to open the forceps with **X** and the driver with **period**. Opening each jaw past its release threshold permanently removes that grip's endpoint pin for this practice attempt. The corresponding thread end falls and settles using the existing strand solver. Reclosing a jaw does not automatically regrasp a released end; reset starts a new attempt. The long-side visual continuation follows the simulated endpoint instead of remaining attached to the forceps.

`KnotReleaseCheck` waits for both releases, then observes three simulated seconds. It checks that wound approximation remains, loop/material allocation does not drift, the knot-side anchors remain in place, and particle coordinates stay finite. One release cannot start or finish the timer. A failure remains visible until reset, and monitoring continues after a pass so later detected drift invalidates it. Feedback includes release status, progress and the observed result.

Material allocation is held from the first release while the free endpoints settle. The knot shape, knot-side pins and wound approximation are still guided constraints: a successful check reports that this modeled state was retained, **not** that a physical knot has been proven secure under load. Load-driven reopening, physical slip through a knot and measured tension remain future work. Controls and input adapters are unchanged.

`node scripts/check-knot.mjs` now covers both throws, each separate grip release, the waiting/observation stages and a successful hold check. Unit/integration checks also cover released endpoints moving independently, a still-gripped end remaining pinned, failure conditions, persistent failures, retained material and reset.

## Guided single-tail pull check (build 0.19)

After the release-and-hold check passes, click **Position driver at released tail**. This explicitly positions the open driver at the simulated short-side endpoint. Close with **comma** to regrasp, then hold **Left arrow** to take up slack. When the feedback reports **Gentle load**, release the arrow and hold steady for 1.5 simulated seconds. Continuous pulling cannot complete the steady-hold requirement. The forceps-side endpoint remains free. Opening the driver during the pull fails the attempt; reset starts over.

`KnotLoadTest` estimates relative load as eight times positive endpoint extension divided by the short span's material length. Slack alone generates no load. The guided pull moves quickly through slack and more slowly once loaded. The gentle band is 0.15–0.55; above 0.65 a provisional slip rate transfers material from the opposite free span into the pulled tail. This conserves the existing material ledger. More than 0.025 units of slip fails the check. Wound approximation now responds to this test's elastic load proxy and retained slip, so excessive pulling can reopen the local seam. Releasing removes the elastic component while leaving the slip-related loss of approximation.

The release check remains a recorded result once the separate load assessment begins; it is not rerun against deliberate loading. The new readout reports relative load and cumulative slip. Positioning, pull direction and knot geometry remain assisted, and the solver uses kinematic grips without force feedback. Thresholds, stiffness and slip rates are sandbox parameters, not clinical calibration or a surgical knot-security claim. Input adapters and key mappings are unchanged.

Regression coverage includes regrasping the actual released endpoint, slack versus loaded behavior, a steady gentle hold, overpull/material transfer, wound reopening, conserved material, premature release and reset. The browser script now completes the pass, both throws, release check and gentle pull check.

## Free tying lab foundations (build 0.20)

Click **Free tying lab** to enter a separate experiment directly. It resets the pad, parks the needle and starts with the long tail held in the forceps. Both instruments then use their complete existing translation, rotation and jaw commands, without a scripted pose override. **Reset practice** returns to the guided workflow, which remains available. The input adapter API and key mappings are unchanged.

Three foundation increments are included:

1. `FreeKnotPractice` maintains two persistent physical strands anchored at the tissue portals. Closing an open jaw near an actual strand segment captures a material particle; grasping empty space does nothing. Moving or rotating the instrument carries that captured point. Opening releases it, and moving a closed empty jaw near thread does not magnetically acquire it. Both instruments can grasp different material points.
2. `InstrumentThreadContact` resolves strand segment contact with a driver-shaft capsule and approximate working jaw/forceps-arm capsules. Segment interiors are checked, so a shaft between particles can contact the thread. Corrections preserve pinned points and avoid injecting velocity. `ThreadStrand` accepts this optional contact constraint during its existing physics solve; guided simulation is unchanged.
3. `FreeKnotView` draws only the solved strands and the buried tract, without adding an animated wrapping circle. The winding readout samples nearby strand geometry in driver coordinates; instrument rotation or circling with loose thread does not automatically earn a wrap. Tests show a taut strand bending around the shaft through contact.

This is **experimental free thread handling**, not complete unrestricted knot tying. Discrete contact may tunnel during rapid or overconstrained movement; material held by a kinematic grip can still overreach (reported in the readout). Instrument/instrument collision, contact between the separate strands, contact friction, reliable wrap retention and physical knot topology/security are not solved. The lab does not award completed knots. A loose strand can slip over a driver tip instead of wrapping. Initial material lengths and tissue pins are sandbox setup assumptions, not conservation from the preceding needle pass.

Run `node scripts/check-free-tying.mjs` with the dev server running for free-mode controls/release/reset and responsive-page checks. `SUTURE_TEST_URL` and `CHROMIUM_PATH` are supported; optionally set `SUTURE_SCREENSHOT` to save a screenshot. Unit tests cover independent instrument movement, material grasp/release, segment/shaft contact, pose-invariant winding and a negative test for circling with loose thread. The existing guided browser and layout regressions remain applicable.

## Free-lab grasp stability and shaft crossing fixes (build 0.20.1)

Captured material and its two neighboring particles on either side are exempt from the coarse collision shapes of the instrument holding them. This lets thread occupy the jaw gap without its grasp pin and its own jaw collider fighting each other. Other instruments still collide with that region. The fix removes the persistent resting wiggle without adding blanket strand damping or smoothing away instrument motion.

Instrument contact now uses interpolated tool poses over fixed physics substeps and checks incoming motion for full crossings. Contact participates in each distance-constraint iteration; each iteration uses its own prior geometry rather than repeatedly rewinding to a stale frame pose. Fine strand edges use swept particle contact with a small chord clearance, while sparse or stretched edges also receive segment-interior contact. The contact response removes inward normal velocity while preserving tangential sliding, instead of feeding the same inward motion back into the next solve.

Regression cases cover a strand crossing completely through a stationary shaft, a moving shaft crossing stationary thread, a laid full wrap retaining its winding and material length for five simulated seconds, and actual forceps motion laying a wrap that remains after the hand stops. A separate ten-second resting test bounds residual motion and verifies that slack and strand length are retained. Reach-limit feedback now includes excess solved strand length, so a path around an obstacle that exceeds available material is reported even when the endpoints alone appear reachable.

These checks address the reproduced free-lab failures; they do not make arbitrary kinematic motion collision-proof. Sweeps use bounded adaptive samples, captured points remain kinematic, contact friction and physical knot topology remain incomplete, and a loose wrap can still slide off a tool end. Key mappings and input adapters are unchanged.

## Free-tail handling, collision gaps and layered tissue (build 0.21)

The short strand's actual free endpoint has a small gold marker, turning green when the driver grasps its last few material particles. Grip readouts distinguish the long strand, short strand body and short tail. `TailPassage` observes an opening derived from a contiguous material section with at least 0.8 turns around the driver; it follows those material indices as the wrap moves off the shaft. A held short endpoint crossing inside its projected polygon, clear of the boundary, receives passage feedback. Collapsed or strongly distorted openings are rejected, and a small plane-side deadband avoids chatter. This approximate geometric observation does not form a loop, move either instrument, tighten a knot or assess knot security.

The two exterior strands now receive swept segment contact at shared 120 Hz steps. Pins and tool contacts are interpolated within each display frame. Pair corrections preserve existing particle velocity; bounded sampling and kinematic pins still limit collision reliability under extreme motion or conflicting constraints.

Two additional driver-crossing gaps are addressed. A held material point previously bypassed all collisions as a kinematic pin: dragging the forceps grip directly through the driver could pull the strand through it. The occupied grip is now swept against the other instrument before solving the strands; collision correction translates the holding tool and its material attachment together. This is working-point collision, not complete instrument-body collision. Shallow swept crossings are also checked when their endpoint normals lie on the same hemisphere. Regression tests reproduce both cases, alongside the existing wrap-retention and resting-motion checks. Input adapters and key mappings are unchanged.

The needle driver's finger rings now lie in the longitudinal handle plane, with short connecting shanks. The pad has separate textured epidermal, dermal and subcutaneous-fat layers on both sides of a full-depth central split. The solid bridging base and shallow wound strip have been removed. All six layer halves follow the existing local wound approximation together, with the original top surface and needle entry coordinates preserved. Layer appearance and proportions are visual approximations; independent tissue mechanics are future work.

Validation includes contact and passage cases, all-layer closure/reset alignment, the free-lab browser movement/release/reset and resizing checks, and the guided stitch/knot workflow.

## Evert the skin edge before the guided pass (build 0.22)

**Start guided pass** now starts skin handling. Click **Position forceps at skin edge** for an optional open-jaw placement and a close view of the upper right edge, or position manually. Close **Z**, then lift briefly with **E** (hold **Shift** for slower movement). The grasp is in the epidermal edge; the attached dermis rises with it. Once the edge is everted, stop lifting and click **Begin needle pass**. Keep the forceps grasp during the right-to-left **U/O** pass. Releasing the edge pauses needle advancement; the positioning aid can be used again to regrasp. Once the needle emerges, open **X** to release the skin before using the existing forceps positioning aid for needle handoff and curved extraction.

`EdgeEversion` accepts a jaw pose and openness rather than keyboard events. It captures an actual local tissue attachment on jaw closure, derives local lift/roll from instrument motion, and relaxes on release. All layer meshes use the same continuous deformation at their shared interfaces; the fat base stays supported. Excessive displacement releases the provisional grip. This remains prescribed local deformation without calibrated tissue elasticity, damage or force feedback. The established needle arc remains assisted. The input adapter API is preserved. Needle-driver height now uses **N** to raise and **M** to lower, replacing Page Up/Down.

Forceps grasping and suture purchase are separate. The forceps can lift the epidermis and underlying tissue; **the dermis is the suture-bearing layer**. Shared anatomical bounds distinguish it from epidermis and fat. The guided needle arc records purchase in the dermis on each side, separately from its visible surface entry/exit. `WoundApproximation` accepts closure load only with valid opposing dermal bites. Epidermis, fat, or a single dermal bite cannot drive closure; their geometry follows dermal approximation passively. This is a layer-specific load rule, not a constitutive tissue model or calibrated strength simulation.

Tests cover epidermal grasp with dermal lift, close/open grasp transitions, local roll and release, layered rendering refresh without changing closure, pause/regrasp, complete guided handoff/extraction/knotting, and rejection of non-dermal or one-sided closure support. Browser helpers now exercise the first maneuver before continuing to the guided pass.

## Free skin handling and surface detail (build 0.23)

Closing the forceps near either upper incision edge now grasps tissue before starting an exercise and in the free tying lab. Lift with **E** to evert, rotate with the existing controls, and open **X** to release. The grasp site follows the jaw's location along the incision; local roll is mirrored on the two sides. The optional **Position forceps at skin edge** aid is available outside guided preparation too. Selecting or releasing skin does not start the guided exercise. Its first maneuver continues to use the right edge at the stitch site.

A forceps grasp has one owner: skin, thread, or needle. Existing needle/thread captures take precedence when material is within reach; a skin-held forceps is excluded from new thread/needle captures until released. The free lab still starts holding the long strand, so open **X** before positioning to grasp skin. Guided knot choreography retains its existing thread grasps. Tissue relaxation continues after release. The local prescribed deformation and dermal closure-load rule remain approximations, with one skin patch held at a time.

The resting/reset needle is rotated 90° out of its original horizontal plane with its tip tangent facing upward; it stays clear of the pad. Beginning the guided needle pass still loads the established right-to-left entry pose.

Instruments now share separate cached steel color, machining-height and roughness maps, using the existing scene lighting. Reflection environments and additional graphical effects are deferred to keep rendering lightweight. Skin has denser pores, more fine creases, richer color variation and stronger height detail. These are procedural visual assets with no external downloads. Validation covers unguided and free-lab skin handling, mirrored eversion at different incision locations, grasp ownership, upward reset orientation, the guided sequence, and browser movement/release/reset/resizing checks.

## Driver contact with the pad (build 0.24)

The free driver now stops above the tissue instead of sinking through it and squeezing a wrapped strand out through the shaft. The existing shaft/jaw capsule geometry is sampled against the support surface, including capsule footprint overlap at pad edges. The limit includes thread-radius clearance so both the skin and shaft constraints can be satisfied at once. Tool orientation and input commands remain unchanged; the correction limits downward position only in free practice. Forceps tissue grasps and the guided needle arc keep their existing behavior. The readout reports **Driver at tissue surface** when downward movement reaches this limit.

The regression lowers a real simulated one-turn material wrap onto the skin, then holds it there. It checks retained winding, material length, and separation from both surfaces. Additional checks cover tilted shafts, overlap at a pad edge, movement outside the pad, and the free-session correction. This remains approximate capsule/heightfield contact, not tissue indentation or complete instrument-body collision.

## Free throw retention and smoother strands (build 0.24)

After the held short tip crosses a live material opening and the loop clears the driver, `FreeThrow` retains one throw using constraints on the existing strand particles. Pulling both held ends apart feeds existing material out of the loop, reducing its size; a seated throw persists after release. The readout distinguishes passage, retention, tightening and seating. Reset clears these constraints. No replacement loop mesh or instrument choreography is introduced. This first approximation supports one throw, not a complete freely tied square knot or a knot-security assessment. Opposing throws remain available in guided practice.

A soft bending constraint discourages sharp alternating folds that produced saw-tooth thread shapes. It acts on simulated particles, preserves the material budget and attachment points, and permits ordinary curved wraps. Regression coverage includes an initially jagged strand settling, tail passage and driver clearance before retention, opposed pulling, material length, release persistence, and rejection of tightening from rigid motion or a single held end.

## Resting-tail layout and skin-level pickup (build 0.24.1)

The free short tail starts in a broad arc matching its full 1.2-unit material length. Previously its much shorter seed path forced the distance solver to create small folds while expanding it. A weak straightening preference also acts below the earlier sharp-angle limit, alongside tool and strand contact.

Driver pickup measures proximity from the jaw surface with the existing forgiving capture tolerance. Closing seats captured material at the jaw surface; it cannot remain floating below the grasp. Shaft-to-skin clearance stays in place to protect wraps. A free-session regression settles the actual short tail, bounds its bends, lowers an open driver to the resting tip, closes to capture it, and verifies attachment and material length.
