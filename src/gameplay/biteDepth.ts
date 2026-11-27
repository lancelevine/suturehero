import type { PassLayer } from '../tissue/FreeNeedlePass';

/**
 * Bite depth gauge (roadmap, 2026-11-27): each completed pass's deepest layer and depth below the
 * skin. A skin stitch should hold dermis: staying in the epidermis is too shallow, reaching the
 * subcutaneous fat is too deep. Approximate millimetres from the practice scene.
 */
export type DepthVerdict = 'too shallow' | 'dermis' | 'too deep';

export function depthVerdict(layer: PassLayer): DepthVerdict {
  return layer === 'epidermis' ? 'too shallow' : layer === 'dermis' ? 'dermis' : 'too deep';
}

/** One line for the Sandbox summary: counts per verdict and the passes that missed the dermis. */
export function describeBiteDepths(passes: ReadonlyArray<{ deepestLayer: PassLayer; depthMm: number }>) {
  if (!passes.length) return 'Bite depth: make a pass to see which layer it reached.';
  const verdicts = passes.map((p) => depthVerdict(p.deepestLayer));
  const inDermis = verdicts.filter((v) => v === 'dermis').length;
  const misses = passes
    .map((p, i) => ({ pass: i + 1, verdict: verdicts[i], depthMm: p.depthMm }))
    .filter((p) => p.verdict !== 'dermis')
    .slice(0, 3)
    .map((p) => `pass ${p.pass} ${p.verdict} (${p.depthMm.toFixed(1)} mm)`);
  return `Bite depth: ${inDermis}/${passes.length} in dermis${misses.length ? ' · ' + misses.join(', ') : ''}`;
}
