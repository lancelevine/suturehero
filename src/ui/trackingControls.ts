/** Tracking-page control wiring (moved out of src/tracking.ts, 2026-11-27). */

const INSTRUMENTS = ['forceps', 'needleDriver', 'scissors'] as const;
type Instrument = (typeof INSTRUMENTS)[number];

/** Show each slider's value next to it; `onDepthSensitivity` runs after the depth slider moves. */
export function bindSliderReadouts(
  controls: {
    rotationSensitivity: HTMLInputElement;
    rotationSensitivityValue: HTMLElement;
    rotationGain: HTMLInputElement;
    rotationGainValue: HTMLElement;
    depthSensitivity: HTMLInputElement;
    depthSensitivityValue: HTMLElement;
  },
  onDepthSensitivity: () => void,
) {
  controls.rotationSensitivity.addEventListener('input', () => {
    controls.rotationSensitivityValue.textContent = `${controls.rotationSensitivity.value}°`;
  });
  controls.rotationGain.addEventListener('input', () => {
    controls.rotationGainValue.textContent = `${Number(controls.rotationGain.value).toFixed(2)}×`;
  });
  controls.depthSensitivity.addEventListener('input', () => {
    controls.depthSensitivityValue.textContent = `${controls.depthSensitivity.value}×`;
    onDepthSensitivity();
  });
}

/** Checkbox state for the per-instrument depth locks: checked when all are on, mixed when some are. */
export function depthLockState(locks: readonly boolean[]) {
  const all = locks.every(Boolean);
  return { checked: all, indeterminate: locks.some(Boolean) && !all };
}

/**
 * One "Lock depth" checkbox for all instruments: it follows the saved per-instrument locks and sets
 * them all when changed (then `onChange`).
 */
export function bindDepthLock(
  checkbox: HTMLInputElement,
  calibration: { profile(name: Instrument): { depthLock: boolean }; update(name: Instrument, change: { depthLock: boolean }): void; subscribe(listener: () => void): unknown },
  onChange: () => void,
) {
  const sync = () => Object.assign(checkbox, depthLockState(INSTRUMENTS.map((name) => calibration.profile(name).depthLock)));
  calibration.subscribe(sync);
  sync();
  checkbox.addEventListener('change', () => {
    const checked = checkbox.checked;
    for (const name of INSTRUMENTS) calibration.update(name, { depthLock: checked });
    onChange();
  });
}
