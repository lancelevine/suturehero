/**
 * Guided first run (roadmap, 2026-11-28): a four-step card on the first visit: camera setup,
 * tracking check, one guided stitch, first score. Each step's button opens the matching control.
 * Dismissed for good with Skip or Done (suturehero.firstRun.v1). Not shown to automated browsers,
 * so the browser checks see the page as before.
 */
export const FIRST_RUN_KEY = 'suturehero.firstRun.v1';

export const FIRST_RUN_STEPS = [
  { title: 'Set up the camera', text: 'Open Camera and start your camera so the instruments can be tracked.', target: '#camera-tracking-toggle', action: 'Open Camera' },
  { title: 'Check instrument tracking', text: 'Open Calibrate, show each instrument’s marker and set its neutral pose.', target: '#workspace-calibrate-toggle', action: 'Open Calibrate' },
  { title: 'Place one guided stitch', text: 'Start the guided exercise and follow the instructions under the scene.', target: '#begin-pass', action: 'Start guided exercise' },
  { title: 'See your first score', text: 'Open Analysis for time, path, smoothness, accuracy and more.', target: '#workspace-analysis-toggle', action: 'Open Analysis' },
] as const;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function shouldShowFirstRun(storage: StorageLike | null, automated: boolean) {
  if (automated) return false;
  try {
    return storage?.getItem(FIRST_RUN_KEY) !== 'done';
  } catch {
    return false;
  }
}

export function finishFirstRun(storage: StorageLike | null) {
  try {
    storage?.setItem(FIRST_RUN_KEY, 'done');
  } catch {
    // Blocked storage: the card returns next visit.
  }
}

/** Mount the card in `host`; returns it, or null when it should not show. */
export function mountFirstRun(host: HTMLElement, storage: StorageLike | null, automated: boolean) {
  if (!shouldShowFirstRun(storage, automated)) return null;
  const card = document.createElement('section');
  card.className = 'first-run';
  card.setAttribute('aria-label', 'First run walkthrough');
  let step = 0;
  const render = () => {
    const s = FIRST_RUN_STEPS[step];
    card.innerHTML = `<span class="hud-eyebrow">WELCOME · STEP ${step + 1} OF ${FIRST_RUN_STEPS.length}</span><strong>${s.title}</strong><p>${s.text}</p><div><button type="button" data-first-run="go">${s.action}</button><button type="button" data-first-run="next">${step + 1 < FIRST_RUN_STEPS.length ? 'Next' : 'Done'}</button><button type="button" data-first-run="skip">Skip</button></div>`;
  };
  card.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest('button')?.dataset.firstRun;
    if (action === 'go') document.querySelector<HTMLElement>(FIRST_RUN_STEPS[step].target)?.click();
    if (action === 'next' && step + 1 < FIRST_RUN_STEPS.length) {
      step++;
      render();
      return;
    }
    if (action === 'skip' || action === 'next') {
      finishFirstRun(storage);
      card.remove();
    }
  });
  render();
  host.append(card);
  return card;
}
