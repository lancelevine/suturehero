import { Vector3 } from 'three';
import { solveWorkspaceAxes, sweepScale, DEFAULT_UNITS_PER_MM, type GuideCaptures, type StereoWorkspace } from '../input/stereoWorkspace';

/** Stereo positions averaged per guided capture. */
const CAPTURE_SAMPLES = 15;
/** A stereo position older than this is not used for capturing, ms. */
const MAX_SAMPLE_AGE_MS = 200;

type Step = keyof GuideCaptures;
const STEPS: Array<{ step: Step; label: string; prompt: string }> = [
  { step: 'neutral', label: '1. Neutral', prompt: 'Hold the needle driver still at the centre of your work area.' },
  { step: 'right', label: '2. Right', prompt: 'From neutral, move about 10 cm to your right and hold still.' },
  { step: 'forward', label: '3. Forward', prompt: 'From neutral, move about 10 cm away from you and hold still.' },
  { step: 'up', label: '4. Up', prompt: 'From neutral, lift about 10 cm and hold still.' },
];

/**
 * "Workspace (stereo)" controls: guided neutral/right/forward/up captures set
 * the axes, then a sweep through the working space sets the scale.
 */
export function mountStereoWorkspacePanel(
  container: HTMLElement,
  onChange: (workspace: StereoWorkspace | null) => void,
  current: () => StereoWorkspace | null,
) {
  const section = document.createElement('div');
  section.className = 'stereo-workspace';
  section.innerHTML = `
<p class="tracking-message"><strong>Workspace (stereo).</strong> Lines up movement with your desk and fits your working space to the virtual pad. Uses the needle driver with stereo tracking active. Do steps 1–4, returning to neutral before each move, then sweep.</p>
<div class="tracking-actions">
 ${STEPS.map((s) => `<button type="button" data-workspace-step="${s.step}">${s.label}</button>`).join('')}
 <button type="button" data-workspace-sweep>5. Start sweep</button>
 <button type="button" data-workspace-reset>Reset workspace</button>
</div>
<p class="tracking-message" role="status" data-workspace-status></p>`;
  container.append(section);
  const status = section.querySelector<HTMLElement>('[data-workspace-status]')!;
  const sweepButton = section.querySelector<HTMLButtonElement>('[data-workspace-sweep]')!;

  const captures: Partial<GuideCaptures> = {};
  let collecting: { step: Step; samples: Vector3[] } | null = null;
  let sweep: Vector3[] | null = null;
  let latest: { mm: Vector3; at: number } | null = null;

  const describe = () => {
    const w = current();
    status.textContent = w
      ? `Workspace set · ${(1 / w.unitsPerMm).toFixed(0)} mm per scene unit.`
      : `Not set (using camera axes). Captured: ${STEPS.filter((s) => captures[s.step]).map((s) => s.step).join(', ') || 'none'}.`;
  };

  for (const { step, prompt } of STEPS) {
    section.querySelector<HTMLButtonElement>(`[data-workspace-step="${step}"]`)!.addEventListener('click', () => {
      collecting = { step, samples: [] };
      status.textContent = `${prompt} Capturing…`;
    });
  }

  sweepButton.addEventListener('click', () => {
    if (sweep) {
      finishSweep();
      return;
    }
    const axes = axesFromCaptures();
    if (!axes) return;
    sweep = [];
    sweepButton.textContent = '5. Finish sweep';
    status.textContent = 'Sweep: move slowly through the whole space you will use (left/right, near/far, up/down), then press Finish sweep.';
  });

  section.querySelector<HTMLButtonElement>('[data-workspace-reset]')!.addEventListener('click', () => {
    for (const key of Object.keys(captures) as Step[]) delete captures[key];
    collecting = null;
    sweep = null;
    sweepButton.textContent = '5. Start sweep';
    onChange(null);
    describe();
  });

  function axesFromCaptures() {
    const missing = STEPS.filter((s) => !captures[s.step]).map((s) => s.label);
    if (missing.length) {
      status.textContent = `Capture ${missing.join(', ')} first.`;
      return null;
    }
    const axes = solveWorkspaceAxes(captures as GuideCaptures);
    if ('error' in axes) {
      status.textContent = axes.error;
      return null;
    }
    return axes;
  }

  function finishSweep() {
    const points = sweep ?? [];
    sweep = null;
    sweepButton.textContent = '5. Start sweep';
    const axes = axesFromCaptures();
    if (!axes) return;
    const scale = sweepScale(axes, points);
    if (typeof scale !== 'number') {
      status.textContent = scale.error;
      return;
    }
    onChange({ ...axes, unitsPerMm: scale });
    describe();
  }

  describe();
  return {
    /** Call with each new stereo needle-driver position (camera-1 mm). */
    feed(mm: Vector3, now: number) {
      latest = { mm: mm.clone(), at: now };
      if (sweep) sweep.push(mm.clone());
      if (!collecting) return;
      collecting.samples.push(mm.clone());
      if (collecting.samples.length < CAPTURE_SAMPLES) return;
      const mean = collecting.samples.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / collecting.samples.length);
      captures[collecting.step] = mean;
      status.textContent = `${STEPS.find((s) => s.step === collecting!.step)!.label} captured.`;
      collecting = null;
      // With all four captured, apply the axes right away at the default scale.
      if (STEPS.every((s) => captures[s.step]) && !current()) {
        const axes = solveWorkspaceAxes(captures as GuideCaptures);
        if ('error' in axes) status.textContent = axes.error;
        else {
          onChange({ ...axes, unitsPerMm: DEFAULT_UNITS_PER_MM });
          status.textContent = 'Axes set. Now press 5. Start sweep to fit your working space to the pad.';
        }
      }
    },
    /** Shown when captures are waiting for stereo positions. */
    stale(now: number) {
      if (collecting && (!latest || now - latest.at > MAX_SAMPLE_AGE_MS)) status.textContent = 'Waiting for a stereo needle-driver position…';
    },
    refresh: describe,
  };
}
