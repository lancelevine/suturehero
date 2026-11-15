import * as THREE from 'three';

/**
 * Knot topology, step 1 (2026-11-15, shadow research; not used by gameplay): the
 * crossing diagram of a closed 3D polyline. The curve is projected along a viewing
 * direction; wherever two non-adjacent segments cross in the projection, the crossing
 * records which segment passes over (nearer the viewer) and its sign (right-handed +1,
 * left-handed −1). Later steps simplify the diagram and compute knot invariants from it.
 */

export interface Crossing {
  /** Arc-length position of the over and under passes, as segment index + fraction. */
  over: number;
  under: number;
  /** +1 right-handed, −1 left-handed (the standard oriented-crossing convention). */
  sign: 1 | -1;
}

export interface CrossingDiagram {
  crossings: Crossing[];
  /** Sum of crossing signs (not a knot invariant, but useful as a check). */
  writhe: number;
}

/** A slightly oblique default view, so straight, axis-aligned test shapes do not line up exactly. */
export const DEFAULT_VIEW = new THREE.Vector3(0.0137, 0.0291, 1).normalize();

/** Crossings of the closed polyline `points` (last point joins the first) seen along `view`. */
export function crossingDiagram(points: readonly THREE.Vector3[], view: THREE.Vector3 = DEFAULT_VIEW): CrossingDiagram {
  const n = points.length;
  // A 2D basis of the picture plane; depth increases toward the viewer.
  const toward = view.clone().normalize();
  const helper = Math.abs(toward.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = helper.clone().cross(toward).normalize();
  const v = toward.clone().cross(u).normalize();
  const flat = points.map((p) => ({ x: p.dot(u), y: p.dot(v), depth: p.dot(toward) }));
  const crossings: Crossing[] = [];
  for (let i = 0; i < n; i++) {
    const a = flat[i], b = flat[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // Adjacent segments (sharing an end) cannot cross; the last segment is adjacent to the first.
      if (i === 0 && j === n - 1) continue;
      const c = flat[j], d = flat[(j + 1) % n];
      const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
      const denominator = rx * sy - ry * sx;
      if (Math.abs(denominator) < 1e-14) continue;
      const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator;
      const s = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator;
      if (t < 0 || t >= 1 || s < 0 || s >= 1) continue;
      const depthI = a.depth + (b.depth - a.depth) * t;
      const depthJ = c.depth + (d.depth - c.depth) * s;
      const iOver = depthI > depthJ;
      // Sign: (over direction × under direction) · toward-viewer, in the picture plane.
      const overDir = iOver ? [rx, ry] : [sx, sy];
      const underDir = iOver ? [sx, sy] : [rx, ry];
      const cross = overDir[0] * underDir[1] - overDir[1] * underDir[0];
      crossings.push({ over: iOver ? i + t : j + s, under: iOver ? j + s : i + t, sign: cross > 0 ? -1 : 1 });
    }
  }
  return { crossings, writhe: crossings.reduce((sum, c) => sum + c.sign, 0) };
}
