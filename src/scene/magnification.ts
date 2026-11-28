/** Loupe and microscope view (roadmap). Steps the practice camera's zoom about the orbit target,
 * relative to the normal view, with a round vignette for the microscope eyepiece. Real tremor is
 * magnified on screen by the same factor because the instruments follow the hand 1:1. */
export interface MagnificationStep { label: string; zoom: number; eyepiece: boolean }

export const MAGNIFICATION_STEPS: readonly MagnificationStep[] = [
  { label: 'Naked eye', zoom: 1, eyepiece: false },
  { label: 'Loupe ×2.5', zoom: 2.5, eyepiece: false },
  { label: 'Microscope ×4', zoom: 4, eyepiece: true },
];

export function nextMagnification(index: number) {
  return (index + 1) % MAGNIFICATION_STEPS.length;
}
