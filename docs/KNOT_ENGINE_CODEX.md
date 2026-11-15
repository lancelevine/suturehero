# Codex shadow knot engine

Branch: `codex-knot-overhaul`

This branch keeps the current knot engine as the default and adds a selectable
`event-ledger` shadow mode. The switch is in Practice setup and is persisted in
the `knotEngine` URL parameter. The two modes share the same thread, contact,
tail-passage, seating, and scoring inputs, so comparisons do not require two
divergent simulators.

## Recognition model

The event ledger records only throws that have completed the existing physical
checks: a material wrap, observed tail passage, retained post, draw-down, and
seating. It classifies the sequence from those immutable records instead of
trying to infer final knot topology from a noisy thread snapshot.

- A sliding start requires two same-direction single throws and evidence that
  the short post was taut during the second throw.
- Opposing throw direction is locking evidence. A later throw may contain an
  extra turn without being incorrectly rejected as unlocked.
- Same-direction throws without the sliding-post evidence are reported as
  unsecured/granny throws rather than sliding knots.
- One- through four-turn observed throws are retained; starts with more than
  two turns are labeled as multiple-wrap starts.
- A lost post is rejected rather than promoted from proximity or stale state.

This is a deterministic teaching approximation, not a topological proof or a
clinical knot-security measurement.

## Physics cost

The current engine runs 16 retained-contact projections per physics substep.
The shadow mode uses six when a display update already contains multiple fixed
physics substeps and eight for a single 120 Hz substep. Four and six fixed
sweeps were trialed and rejected because they failed sliding or extreme-speed
seating cases.

Paired Vitest fixture timings on the same cloud worker:

| Motion | Current | Event ledger | Change |
| --- | ---: | ---: | ---: |
| 1× at 30 FPS | 17.37 s | 15.09 s | 13% faster |
| 2× at 60 FPS | 20.40 s | 18.23 s | 11% faster |
| 2× at 120 FPS | 21.47 s | 19.13 s | 11% faster |

Wall-clock fixture timing is not a browser benchmark, but the algorithmic
contact budget is deterministically 50–62.5% lower for retained throws.

## Automated coverage

The shadow mode covers:

- surgeon, square, sliding, unsecured, and multiple-wrap classification;
- 30, 60, and 120 FPS at up to 2.5× fixture hand speed;
- irregular 20–60 FPS settling, tissue seating, release, and retained indices;
- near-jaw, opposite-side, and tilted-driver approaches;
- rejection when a steep pull loses the real short post;
- scoring of extra-turn opposing locks and same-direction repeat throws.

The broader legacy-plus-shadow knot regression contained 25 test files and
121 tests and passed. Real hand/controller use still needs comparison before
making the shadow engine the default.
