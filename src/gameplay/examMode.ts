/** Exam mode (roadmap: "Exam mode scored like OSATS"). A timed Sandbox run with no hints: the
 * coaching text and guide overlays are hidden, and only the clock is shown until the time is up or
 * the trainee finishes; then the OSATS-style rubric is the result. */
export const EXAM_SECONDS = 10 * 60;

export function examClock(elapsedSeconds: number, limit = EXAM_SECONDS) {
  const left = Math.max(0, limit - elapsedSeconds);
  const minutes = Math.floor(left / 60);
  const seconds = Math.floor(left % 60);
  return { left, over: left <= 0, label: `${minutes}:${String(seconds).padStart(2, '0')}` };
}

export function examReadout(elapsedSeconds: number, finished: boolean, rubric: string) {
  const clock = examClock(elapsedSeconds);
  if (finished || clock.over) return `Exam finished · ${rubric || 'no passes made'}`;
  return `Exam · ${clock.label} left · no hints · press Finish exam when done`;
}
