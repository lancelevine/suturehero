import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Stitch pattern recognition in Sandbox (roadmap "More stitch patterns", step 1, 2026-11-27):
 * consecutive completed passes that cross the wound in opposite directions form a mattress stitch.
 *  - Vertical mattress: a wide, deep far-far pass and a narrow near-near pass back at the same spot.
 *  - Horizontal mattress: two passes of similar width back and forth, a few mm apart along the wound.
 * Anything else counts as a simple pass. Thresholds are common teaching guidance, approximate.
 */
export const VERTICAL_ALIGN_MM = 2;
export const HORIZONTAL_SPACING_MM = { min: 3, max: 10 } as const;
export const NEAR_BITE_MM = { min: 1, max: 3 } as const;
/** The far bite should be at least this many times the near bite. */
export const FAR_TO_NEAR = 2;
export const HORIZONTAL_BITE_MATCH_MM = 1.5;

export interface PatternPass {
  entry: { x: number; z: number };
  exit: { x: number; z: number } | null;
  entryEdge: number;
  exitEdge: number | null;
  depth: number;
  crossesWound: boolean;
  torn?: boolean;
}

export type PatternName = 'simple' | 'vertical mattress' | 'horizontal mattress';

export interface RecognisedStitch {
  pattern: PatternName;
  /** 1-based pass numbers (completed passes only). */
  passes: number[];
  checks: Array<{ label: string; met: boolean }>;
}

const mm = (units: number) => units * SCENE_MM_PER_UNIT;
const biteMm = (p: PatternPass) => mm((p.entryEdge + (p.exitEdge ?? p.entryEdge)) / 2);
const middleZ = (p: PatternPass) => (p.entry.z + (p.exit?.z ?? p.entry.z)) / 2;
const opposite = (a: PatternPass, b: PatternPass) => Math.sign(a.entry.x) !== Math.sign(b.entry.x);

function asMattress(a: PatternPass, b: PatternPass): RecognisedStitch | null {
  if (!a.crossesWound || !b.crossesWound || !opposite(a, b)) return null;
  const apartMm = mm(Math.abs(middleZ(a) - middleZ(b)));
  const [far, near] = biteMm(a) >= biteMm(b) ? [a, b] : [b, a];
  if (apartMm <= VERTICAL_ALIGN_MM && biteMm(far) >= 1.5 * biteMm(near)) {
    return {
      pattern: 'vertical mattress',
      passes: [],
      checks: [
        { label: `near bite ${biteMm(near).toFixed(1)} mm (${NEAR_BITE_MM.min}–${NEAR_BITE_MM.max})`, met: biteMm(near) >= NEAR_BITE_MM.min && biteMm(near) <= NEAR_BITE_MM.max },
        { label: `far bite ${(biteMm(far) / biteMm(near)).toFixed(1)}× near (≥ ${FAR_TO_NEAR}×)`, met: biteMm(far) >= FAR_TO_NEAR * biteMm(near) },
        { label: `far pass deeper`, met: far.depth > near.depth },
        { label: `in line within ${VERTICAL_ALIGN_MM} mm`, met: apartMm <= VERTICAL_ALIGN_MM },
      ],
    };
  }
  if (apartMm >= HORIZONTAL_SPACING_MM.min && apartMm <= HORIZONTAL_SPACING_MM.max) {
    const difference = Math.abs(biteMm(a) - biteMm(b));
    return {
      pattern: 'horizontal mattress',
      passes: [],
      checks: [
        { label: `bites match within ${HORIZONTAL_BITE_MATCH_MM} mm`, met: difference <= HORIZONTAL_BITE_MATCH_MM },
        { label: `${apartMm.toFixed(1)} mm apart (${HORIZONTAL_SPACING_MM.min}–${HORIZONTAL_SPACING_MM.max})`, met: true },
      ],
    };
  }
  return null;
}

/** Group completed (non-torn) passes, in order, into recognised stitches. */
export function recognisePatterns(passes: readonly PatternPass[]): RecognisedStitch[] {
  const done = passes.filter((p) => p.exit && !p.torn);
  const result: RecognisedStitch[] = [];
  for (let i = 0; i < done.length; i++) {
    const pair = i + 1 < done.length ? asMattress(done[i], done[i + 1]) : null;
    if (pair) {
      result.push({ ...pair, passes: [i + 1, i + 2] });
      i++;
    } else result.push({ pattern: 'simple', passes: [i + 1], checks: [] });
  }
  return result;
}

export function describePatterns(stitches: readonly RecognisedStitch[]) {
  if (!stitches.length) return 'Stitch patterns: simple, vertical or horizontal mattress are recognised from your passes.';
  const simple = stitches.filter((s) => s.pattern === 'simple').length;
  const mattresses = stitches
    .filter((s) => s.pattern !== 'simple')
    .map((s) => `${s.pattern} (passes ${s.passes.join('+')}: ${s.checks.map((c) => `${c.met ? '✓' : '✗'} ${c.label}`).join(', ')})`);
  return `Stitch patterns: ${simple} simple${mattresses.length ? ' · ' + mattresses.join(' · ') : ''}`;
}
