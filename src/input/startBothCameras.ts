/**
 * "Start 2 cameras + metric 3D" (moved out of src/tracking.ts, 2026-11-27): switch to two-camera
 * mode with simulated input off and metric 3D on, then start both cameras, explaining what is
 * still needed. Changing a control fires its change event, so the page reacts as to a click.
 */
export interface StartBothCamerasDeps {
  trackingMode: HTMLSelectElement;
  simulation: HTMLInputElement;
  stereoEnabled: HTMLInputElement;
  refreshCameraLists(): Promise<void>;
  /** The two selected camera device IDs. */
  selectedCameras(): { first: string; second: string };
  running(camera: 0 | 1): boolean;
  startPrimary(): Promise<void>;
  startSecondary(): Promise<void>;
  calibrated(): boolean;
  setStatus(text: string): void;
}

function setControl(control: HTMLInputElement | HTMLSelectElement, value: string | boolean) {
  if (typeof value === 'boolean') (control as HTMLInputElement).checked = value;
  else control.value = value;
  control.dispatchEvent(new Event('change'));
}

export async function startBothCameras(deps: StartBothCamerasDeps) {
  try {
    setControl(deps.trackingMode, 'stereo');
    setControl(deps.simulation, false);
    setControl(deps.stereoEnabled, true);
    deps.setStatus('Starting both cameras…');
    await deps.refreshCameraLists();
    const { first, second } = deps.selectedCameras();
    if (!second || (first && first === second)) {
      deps.setStatus('Select a second camera distinct from camera 1, then press this button again.');
      return;
    }
    if (!deps.running(0)) await deps.startPrimary();
    if (!deps.running(1)) await deps.startSecondary();
    deps.setStatus(deps.calibrated() ? 'Both cameras started; metric 3D enabled. Waiting for valid stereo marker matches.' : 'Both cameras started. Import a solved stereo calibration to enable metric triangulation.');
  } catch (error) {
    deps.setStatus('Stereo start failed: ' + String(error));
  }
}
