import * as THREE from 'three';

/**
 * Live tension heatmap (roadmap, 2026-11-28): the held suture strands glow by how hard they are
 * pulled. Slack or released thread keeps its colour; as it draws taut it glows green (good, gentle
 * tension), and pulling too hard (the model's "excessive" demand) turns it red. Relative feedback
 * from the thread model, not a force measurement.
 */
const GOOD = new THREE.Color(0x2fe08a);
const TOO_HARD = new THREE.Color(0xff3b30);
/** Strongest glow added to the strand colour (0–1). */
const MAX_GLOW = 0.6;

export function tensionGlow(tension: { state: string; tautness: number; demand: number }, target = new THREE.Color()) {
  if (tension.state === 'released' || tension.state === 'slack') return target.setRGB(0, 0, 0);
  if (tension.state === 'excessive') return target.copy(TOO_HARD).multiplyScalar(MAX_GLOW * Math.min(1, 0.5 + tension.demand));
  return target.copy(GOOD).multiplyScalar(MAX_GLOW * tension.tautness);
}
