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

This is an assisted kinematic grasp prototype, not a contact simulation. Released needles remain suspended at their release pose; the visual thread moves rigidly with the needle. No gravity, tissue collision, thread dynamics, or surgical grasp-quality assessment is implemented.

## Architecture

- `input/`: device-independent commands and keyboard adapter. Future tracked controllers should supply target poses through a dedicated pose driver rather than translating tracking into keyboard events.
- `instruments/`: instrument geometry, working-tip pivot, pose integration, jaw state, and sandbox bounds.
- `tissue/`: tissue visualization; future material, collision, and deformation models belong here.
- `suture/`: needle visualization and independent proximity-based grasp constraint; future suture solver belongs here.
- `gameplay/`: practice-session orchestration, decoupled from rendering and input bindings.
- `scene/`: renderer, lighting, camera, and viewport resizing.

The scene uses arbitrary sandbox units; physical calibration is not established. The current tool driver is kinematic and unconstrained except for workspace bounds. Tissue penetration, thread dynamics, knot tying, haptics, and VR are not implemented. Realistic instrument motion is a long-term requirement: preserve full independent position, orientation, and jaw state, and add calibrated device adapters and mechanical constraints incrementally.

Next playable milestones: refine needle grasp/contact mechanics, tissue entry/exit constraints, thread pull-through, then knot mechanics and completion criteria for one simple interrupted suture. Those features require their own validated simulation models; needle pickup is currently a kinematic proximity constraint.

## Play online with GitHub Pages

The deployment workflow in `.github/workflows/deploy.yml` tests, builds, and publishes on pushes to `main`. One-time repository setting: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then run **Actions → Deploy Suture Hero to GitHub Pages → Run workflow** if the initial push ran before Pages was enabled. After a successful deployment, the site is available at https://lancelevine.github.io/suturehero/ . Future pushes update that site automatically. GitHub Pages availability depends on repository visibility and account plan.

The Vite configuration uses relative asset URLs so the build works beneath the repository path as well as locally. Only the generated `dist` site is published; no backend is required.

## Needle-placement exercise

Grasp the needle with the right needle driver, or transfer it from the left forceps. The blue dot identifies the needle's working tip; the blue projection on the pad and dashed vertical line help judge depth. Move that tip into the gold ring on the left side of the incision and orient the needle's forward tangent downward, following the gold arrow. Hold within **0.12 sandbox units** and **20 degrees** for **one continuous second** to complete the exercise. The readout shows distance, angle and hold progress. Losing alignment or releasing the needle resets the hold; completion stays recorded until **Reset practice**.

Hold **Shift** with any tool control for 20% speed, including fine rotation and jaw adjustment. Thresholds are forgiving game criteria, not clinical measurements. This exercise checks placement only; it does not puncture tissue or simulate contact forces. The tip marker is a visual aid rather than a modeled sharp tip.

## Guided tissue pass (build 0.4)

After the placement hold, keep the driver grasp and current entry alignment, then click **Begin assisted pass**. Engagement aligns the needle plane and center to a canonical circular guide while preserving the instrument-to-needle grasp relationship. The entry and exit are 0.6 sandbox units apart, matching this needle's 0.3-unit radius. Hold **U** to advance, **O** to reverse, and **Shift** for fine control. Right-tool translation and other rotation axes are temporarily replaced by the guided circular motion; the left forceps remain independently movable. The blue exit marker and dashed arc are visible through tissue as practice aids.

The pass completes when the needle tip reaches the exit after a half-circle rotation; releasing early interrupts it. Reset for a fresh attempt, or regrasp and realign at entry to engage again after interruption. At completion, normal instrument control resumes and the completion result remains recorded until reset. This is needle-tip emergence only, not the entire needle being extracted or the suture pulled through. Tissue remains static, other free motion is not collision-constrained, and thread geometry still moves rigidly with the needle. No force feedback, tissue damage, deformation, or thread tension is simulated.
