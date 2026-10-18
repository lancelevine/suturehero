# Suture Hero

A browser-based surgical sandbox built with TypeScript and Three.js. This first increment provides a tissue pad, a reference curved needle and thread, and two independently controlled needle holders. It is not a clinical training tool.

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

## Architecture

- `input/`: device-independent commands and keyboard adapter. Future tracked controllers should supply target poses through a dedicated pose driver rather than translating tracking into keyboard events.
- `instruments/`: instrument geometry, working-tip pivot, pose integration, jaw state, and sandbox bounds.
- `tissue/`: tissue visualization; future material, collision, and deformation models belong here.
- `suture/`: static curved needle and thread reference; future grasp constraints and suture solver belong here.
- `gameplay/`: practice-session orchestration, decoupled from rendering and input bindings.
- `scene/`: renderer, lighting, camera, and viewport resizing.

The scene uses arbitrary sandbox units; physical calibration is not established. The current tool driver is kinematic and unconstrained except for workspace bounds. Tissue penetration, grasping, thread dynamics, knot tying, haptics, and VR are not implemented. Realistic instrument motion is a long-term requirement: preserve full independent position, orientation, and jaw state, and add calibrated device adapters and mechanical constraints incrementally.

Next playable milestones: needle grasp/release, tissue entry/exit constraints, thread pull-through, then knot mechanics and completion criteria for one simple interrupted suture. Those features require their own validated simulation models; the static needle is not currently interactive.
