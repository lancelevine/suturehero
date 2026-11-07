# SutureHero — instructions for AI coding agents

This file is read by **both** ChatGPT Codex (`AGENTS.md`) and Claude Code
(`CLAUDE.md` imports this file). Keep all shared rules here so both agents
follow the same ones. The project owner is Lance Levine.

## The handoff log — read it first, write to it last

`docs/AGENT_HANDOFF.md` is how the agents (and Lance) tell each other what
changed. Every working session must:

1. **Before starting:** `git pull origin main`, then read the top of
   `docs/AGENT_HANDOFF.md` (the *Status* block and the newest few entries).
   If *Status → In progress* names another agent's unfinished work in the same
   files, stop and ask Lance before editing those files.
2. **While working:** set *Status → In progress* to your agent name and a
   one-line description, and commit/push that change first if the work will
   take more than one commit.
3. **When finishing:** add a new entry at the top of the *Log* section (format
   is in that file), update *Status* (clear *In progress*, update *Known
   issues* / *Next up*), and commit it in the same commit as the work or right
   after.

Keep entries short and factual: what changed, which files, how it was checked,
and what Lance still needs to test by hand (especially anything needing a real
camera, which agents cannot test).

## Working on `main` without conflicts

- Lance commits directly to `main`; there is no PR review step.
- Only one agent should be working at a time. The *In progress* line is the
  lock.
- Pull before you start and again right before you push. If the push is
  rejected, `git pull --rebase origin main`, re-run checks, then push.
- Make small, focused commits. Do not mix reformatting or refactoring with
  behavior changes, and do not reformat code you did not otherwise change —
  large whitespace diffs in `src/tracking.ts` or `src/main.ts` are the most
  likely source of conflicts.
- Never force-push `main`.
- Commit messages: imperative summary line (e.g. `Fix stripe threshold for
  small balls`), then a short body saying why.

## Checks before every commit

Use **Node 24** (see `.nvmrc`). Some physics tests are sensitive to tiny
floating-point differences between Node versions and fail on Node 22.

```sh
npm ci
npx tsc --noEmit      # strict type check
npm test              # ~4 min full unit suite; must be all green
npm run build
```

While iterating, run a single file: `npx vitest run src/path/File.test.ts`.
The full suite must still pass before pushing, because the GitHub Pages
deploy (`.github/workflows/deploy.yml`) runs it and will not publish on
failure.

Browser checks in `scripts/check-*.mjs` need `npm run dev` running and use
local Chromium (Playwright). Run them one at a time when a change touches the
area they cover; they are not run by CI.

Never weaken a test threshold just to make it pass. If a limit is genuinely
wrong, say why in the commit message and the handoff entry.

## Versioning

- The user-facing build number is the `BUILD 0.xx` label in the header HTML in
  `src/main.ts`. Bump it for each user-visible change.
- Describe the change for Lance in the handoff entry. (The README currently
  also contains per-build notes; that history is planned to move to
  `CHANGELOG.md`.)

## Current hardware and priorities (as of 2026-11-07)

- **Camera:** one camera day to day. Stereo (two cameras) is the goal but does
  not yet track well. Do not break the single-camera path while working on
  stereo.
- **Upcoming cameras:** two OV9281 USB 2.0 webcams — **monochrome**, global
  shutter, 1280×800 at up to 120 fps (MJPEG). Implications: colored-ball jaw
  tracking cannot work with them (use white or striped balls); the camera
  request (`CAMERA_REQUEST` in `src/input/cameraDevices.ts`) must ask for
  1280×800 and a high frame rate instead of 1080p/30 fps; markers cover fewer pixels than at
  1080p; the two cameras are not hardware-synchronized. Keep current cameras
  working until Lance has switched.
- **Tracker:** the **8-face ring** (`ring8`) is the one in use. The prism and
  6-face paths still exist; don't remove them without asking.
- **Jaw markers:** needle driver uses **solid white** balls (new, untested on
  real hardware). Forceps marker choice is still undecided. Colored and
  striped modes remain supported.
- **Purpose:** intended for training medical students/residents in standard
  suturing and microsurgery, and for research. Be accurate about what is
  validated: say "approximate" or "synthetic test only" when that's the truth.
  Never claim clinical accuracy.

## Project map

- `index.html` → `src/main.ts`: practice scene (Three.js), UI, keyboard and
  camera-driven instruments.
- `tracking.html` → `src/tracking.ts`: camera tracking setup (also embedded in
  the main page). Talks to `main.ts` through `suturehero:*` window events or
  `postMessage`.
- `src/input/`: tracking, calibration, marker/ball detection, workers.
  Camera device handling (requested resolution/frame rate, device lists,
  remembered cameras) is in `src/input/cameraDevices.ts`.
- `src/suture/`, `src/tissue/`, `src/gameplay/`: thread/knot physics, tissue,
  practice-session logic. These are well unit-tested; keep it that way.
- `src/scene/`, `src/visuals/`, `src/ui/`: rendering and UI.
- `scripts/`: browser checks, OpenCV.js build, stereo calibration solver
  (Python).

`src/tracking.ts` and `src/main.ts` are very large. When you add logic, prefer
putting it in a new tested module under `src/input/` (or the relevant folder)
and calling it from those files, rather than growing them further.

## Code style

- TypeScript, strict mode. No new `any` without a reason.
- Write new or changed code readably: one statement per line where practical,
  descriptive names, named constants for tuning values (with units, e.g.
  `MAX_GAP_MS`). Do not mass-reformat existing code in a feature commit.
- Add or update a unit test next to the module (`Foo.ts` → `Foo.test.ts`) for
  any behavior change.
- Browser storage keys start with `suturehero.` and end with a version
  (e.g. `suturehero.jawTracking.v2`) so saved data can be migrated.
