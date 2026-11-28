/**
 * Nerve repair (roadmap, 2026-11-28): line up the fascicle bundles of the two nerve ends before the
 * epineurial stitches, so the repair has no twist. The right end starts turned by a random angle;
 * the trainee turns it back. Aligned within ALIGNED_DEGREES. Practice model only.
 */
export const ALIGNED_DEGREES = 5;
/** Starting twist range (degrees, either direction). */
export const START_TWIST = { min: 12, max: 30 } as const;
export const TWIST_STEP_DEGREES = 10;

export function startingTwist(random: () => number = Math.random) {
  const size = START_TWIST.min + random() * (START_TWIST.max - START_TWIST.min);
  return random() < 0.5 ? -size : size;
}

/** Twist folded into −180…180 degrees. */
export function normaliseTwist(degrees: number) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

export function describeNerveAlignment(twistDegrees: number) {
  const twist = Math.abs(normaliseTwist(twistDegrees));
  return twist <= ALIGNED_DEGREES
    ? `Fascicles aligned (${twist.toFixed(0)}° twist) ✓ · place the epineurial stitches`
    : `Fascicles ${twist.toFixed(0)}° out of line · turn the right nerve end to match the bundles before stitching`;
}

/** Vessel twist check (roadmap, 2026-11-28): the same alignment, read from the ink stripe on each end. */
export function describeVesselTwist(twistDegrees: number) {
  const twist = Math.abs(normaliseTwist(twistDegrees));
  return twist <= ALIGNED_DEGREES
    ? `Vessel ends in line (${twist.toFixed(0)}° twist) ✓`
    : `Vessel ends twisted ${twist.toFixed(0)}° · line up the stripes before the stay sutures`;
}
