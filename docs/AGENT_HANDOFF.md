# Agent handoff log

Shared notes between ChatGPT Codex, Claude Code and Lance. Rules are in
`AGENTS.md`. Read the Status block before starting; update it and add a Log
entry when finishing.

## Status

- **In progress:** Claude Code — README/CHANGELOG cleanup, then extracting camera setup from `src/tracking.ts`. Please avoid editing `README.md` and `src/tracking.ts` until cleared.
- **Needs Lance to test by hand:**
  - Solid white needle-driver ball mode (commit `7f44662`): not yet tried
    with a real camera.
- **Known issues:**
  - `FreeKnotTechniques.test.ts` "retains a double surgeon first throw…"
    passes on Node 24 but fails on Node 22 (thread point moves 0.042 vs a
    0.034 limit). The result sits close to its threshold and is sensitive to
    floating-point differences. Use Node 24; a more robust fix is open.
  - Stereo tracking is unreliable in practice; single camera is used.
  - `src/tracking.ts` (~156 KB) and `src/main.ts` (~57 KB) are monolithic and
    are the most likely place for merge conflicts.
- **Next up (proposed, not started):**
  1. Move the README's per-build history into `CHANGELOG.md`; keep README to
     current overview, setup and controls. Update or remove the outdated
     `TRACKING_PROTOTYPE.md`.
  2. Add a code formatter in one dedicated commit (agree with Lance first).
  3. Gradually split `src/tracking.ts` into tested modules.
  4. Make the needle-driver solid-white path solid once Lance has tested it.
  5. Prepare for the OV9281 cameras (monochrome, global shutter, 1280×800 @
     up to 120 fps): request their native mode and frame rate in
     `openCamera`, use white/striped jaw balls for the forceps, then
     recalibrate and retest stereo. Needs real-camera testing by Lance.

## Log

Newest first. Template:

```
### YYYY-MM-DD — <Agent> — <short title>
- Changed: <what and why>
- Files: <main files touched>
- Checked: <tsc / npm test / build / browser scripts run>
- Lance to test: <hand checks needed, or "nothing">
- Notes for the other agent: <anything surprising, follow-ups>
```

### 2026-11-07 — Claude Code — Record upcoming OV9281 cameras
- Changed: documented the planned OV9281 stereo cameras and their impact
  (no color, 120 fps request needed, 800p) in `AGENTS.md`; added *Next up* 5.
- Files: `AGENTS.md`, `docs/AGENT_HANDOFF.md`.
- Checked: docs only.
- Lance to test: nothing yet.
- Notes for the other agent: don't extend colored-ball features; prefer
  white/striped markers.

### 2026-11-07 — Claude Code — Shared agent instructions and handoff log
- Changed: added `AGENTS.md` (shared rules for Codex and Claude),
  `CLAUDE.md` (points Claude at `AGENTS.md`), this handoff log, and pinned
  Node 24 (`.nvmrc`, `package.json` engines, README) because one physics test
  fails on Node 22.
- Files: `AGENTS.md`, `CLAUDE.md`, `docs/AGENT_HANDOFF.md`, `.nvmrc`,
  `package.json`, `README.md`.
- Checked: `npx tsc --noEmit`, full `npm test` and `npm run build` on Node 24.
- Lance to test: nothing (no app behavior changed).
- Notes for the other agent: please follow the read-first / write-last steps
  in `AGENTS.md` from now on. No source code was changed.
