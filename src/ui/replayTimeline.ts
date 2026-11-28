/**
 * Self-review replay timeline (roadmap, 2026-11-28): while a replay plays, a bar under the scene
 * shows the playback position and a red tick at each mistake recorded in the replayed window
 * (tears, tip collisions, blind exits, tip regrasps, air knots, snapped sutures).
 */
export interface Mistake {
  /** Same clock as the replay recording (s). */
  t: number;
  label: string;
}

/** Keeps recent mistakes (older than `keepSeconds` are dropped). */
export class MistakeLog {
  readonly mistakes: Mistake[] = [];
  constructor(private readonly keepSeconds = 30) {}

  add(t: number, label: string) {
    this.mistakes.push({ t, label });
    while (this.mistakes.length && this.mistakes[0].t < t - this.keepSeconds) this.mistakes.shift();
  }

  /** Mistakes inside [start, end] as 0–1 positions along the window. */
  within(window: { start: number; end: number } | null) {
    if (!window || window.end <= window.start) return [];
    return this.mistakes.filter((m) => m.t >= window.start && m.t <= window.end).map((m) => ({ at: (m.t - window.start) / (window.end - window.start), label: m.label }));
  }
}

export function mountReplayTimeline(host: HTMLElement) {
  const bar = document.createElement('div');
  bar.className = 'replay-timeline';
  bar.hidden = true;
  bar.innerHTML = '<i class="replay-cursor"></i>';
  host.append(bar);
  const cursor = bar.querySelector<HTMLElement>('.replay-cursor')!;
  let marksKey = '';
  return {
    update(replaying: boolean, progress: number, marks: ReadonlyArray<{ at: number; label: string }>) {
      if (bar.hidden !== !replaying) bar.hidden = !replaying;
      if (!replaying) return;
      const left = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(1)}%`;
      if (cursor.style.left !== left) cursor.style.left = left;
      const key = marks.map((m) => `${m.at.toFixed(3)}:${m.label}`).join('|');
      if (key === marksKey) return;
      marksKey = key;
      bar.querySelectorAll('.replay-mistake').forEach((old) => old.remove());
      for (const mark of marks) {
        const tick = document.createElement('b');
        tick.className = 'replay-mistake';
        tick.style.left = `${(mark.at * 100).toFixed(1)}%`;
        tick.title = mark.label;
        bar.append(tick);
      }
    },
  };
}
