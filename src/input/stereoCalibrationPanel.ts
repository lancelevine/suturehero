import { tableHeight } from './tableHeight';
import { acceptStereoCalibration, stereoCalibrationSummary, type SelectedCameras } from './stereoCalibrationImport';
import { stereoCalibrationIdentity } from './stereoCalibrationIdentity';
import type { StereoCalibration } from './stereoGeometry';
import { parseWorkspace, serializeWorkspace, type StereoWorkspace } from './stereoWorkspace';
import { readStored, readStoredJson, removeStored, TRACKING_STORAGE_KEYS, writeStored } from './trackingStorage';
import { mountStereoWorkspacePanel } from '../ui/StereoWorkspacePanel';

/**
 * The calibrated-stereo panel (moved out of tracking.ts, 2026-11-26): the imported or
 * in-app-solved stereo calibration, its workspace axes, their saved copies, and the
 * import/remove controls. The tracking page reads `calibration` and `workspace`.
 */
export interface StereoCalibrationPanelOptions {
  /** The two cameras currently selected. */
  cameras(): SelectedCameras;
  /** A new calibration (restore = from storage at start-up) or workspace was applied: tracking state must restart. */
  reset(restore: boolean): void;
}

const PANEL_HTML = '<div class="eyebrow">CALIBRATED STEREO · METRIC 3D</div><p class="tracking-message">Import a solved stereo calibration JSON. Replace it after moving either camera, changing focus/zoom, or changing resolution/aspect ratio. Raw checkerboard captures are not solved parameters.</p><div class="tracking-actions"><label>Import calibration <input id="stereo-import" type="file" accept=".json,application/json"></label><button id="stereo-remove" type="button">Remove calibration</button><label><input id="stereo-enable" type="checkbox"> Enable metric 3D</label></div><p class="tracking-message" id="stereo-geometry-status">No calibration loaded.</p><p class="tracking-message" id="stereo-3d-points">No triangulated markers.</p>';

export function mountStereoCalibrationPanel(anchor: Element, options: StereoCalibrationPanelOptions) {
  const panel = document.createElement('section');
  panel.className = 'tracking-panel';
  panel.style.cssText = 'padding:12px;margin:12px 0';
  panel.innerHTML = PANEL_HTML;
  anchor.after(panel);
  const geometryStatus = panel.querySelector<HTMLElement>('#stereo-geometry-status')!;
  const triangulationStatus = panel.querySelector<HTMLElement>('#stereo-3d-points')!;
  const enabled = panel.querySelector<HTMLInputElement>('#stereo-enable')!;
  let calibration: StereoCalibration | null = null;
  // Stereo workspace: user-defined right/up/forward axes and scale (stereoWorkspace.ts).
  let workspace: StereoWorkspace | null = null;
  const key = () => (calibration ? stereoCalibrationIdentity(calibration) : '');
  const loadWorkspace = () => {
    workspace = calibration ? parseWorkspace(readStoredJson(TRACKING_STORAGE_KEYS.stereoWorkspace), key()) : null;
    tableHeight.setCalibrationKey(calibration ? key() : null);
  };
  const workspacePanel = mountStereoWorkspacePanel(panel, (next) => {
    workspace = next;
    if (next) writeStored(TRACKING_STORAGE_KEYS.stereoWorkspace, JSON.stringify(serializeWorkspace(next, key())));
    else removeStored(TRACKING_STORAGE_KEYS.stereoWorkspace);
    options.reset(false);
  }, () => workspace);

  const load = (raw: unknown, restore = false) => {
    const parsed = acceptStereoCalibration(raw, options.cameras(), restore);
    calibration = parsed;
    enabled.checked = false;
    options.reset(restore);
    loadWorkspace();
    workspacePanel.refresh();
    writeStored(TRACKING_STORAGE_KEYS.stereoCalibration, JSON.stringify(parsed));
    geometryStatus.textContent = stereoCalibrationSummary(parsed);
  };
  // In-app solve (stereoAutoCapture.ts → src/input/stereoCalibrationSolver.ts): same checks and storage as an import.
  window.addEventListener('suturehero:stereo-calibration-solved', (event) => {
    try { load((event as CustomEvent).detail); } catch (e) { geometryStatus.textContent = 'Solved calibration rejected: ' + String(e); }
  });
  panel.querySelector<HTMLInputElement>('#stereo-import')!.addEventListener('change', async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try { load(JSON.parse(await file.text())); } catch (e) { geometryStatus.textContent = 'Import rejected: ' + String(e); }
    input.value = '';
  });
  panel.querySelector<HTMLButtonElement>('#stereo-remove')!.addEventListener('click', () => {
    calibration = null;
    workspace = null;
    workspacePanel.refresh();
    enabled.checked = false;
    options.reset(true);
    removeStored(TRACKING_STORAGE_KEYS.stereoCalibration);
    geometryStatus.textContent = 'Calibration removed.';
    triangulationStatus.textContent = 'No triangulated markers.';
  });

  return {
    panel,
    enabled,
    geometryStatus,
    triangulationStatus,
    get calibration() { return calibration; },
    get workspace() { return workspace; },
    /** Live needle-driver positions for capturing the workspace axes. */
    feedWorkspace: workspacePanel.feed,
    /**
     * Restore the saved calibration (call once tracking state exists). One that no longer
     * parses is discarded; blocked storage must not stop the page loading.
     */
    restoreSaved() {
      const saved = readStoredJson(TRACKING_STORAGE_KEYS.stereoCalibration);
      if (saved !== undefined) {
        try { load(saved, true); } catch { removeStored(TRACKING_STORAGE_KEYS.stereoCalibration); }
      } else if (readStored(TRACKING_STORAGE_KEYS.stereoCalibration)) {
        removeStored(TRACKING_STORAGE_KEYS.stereoCalibration);
      }
    },
  };
}
