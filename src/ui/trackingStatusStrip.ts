import { mountStatusStrip } from './StatusStrip';
import { holdingReasons, setupChecklist, type HealthInput, type InstrumentHealth } from './trackingHealth';

/**
 * The tracking page's status strip (setup checklist, camera-moved warning, holding reasons),
 * wired to its buttons and refreshed twice a second (moved out of src/tracking.ts, 2026-11-27).
 */
export const STATUS_STRIP_INTERVAL_MS = 500;

export type InstrumentName = 'needleDriver' | 'forceps' | 'scissors';
const LABELS: Record<InstrumentName, string> = { needleDriver: 'Needle driver', forceps: 'Forceps', scissors: 'Scissors' };

/** What the tracking page knows about one instrument right now. */
export interface InstrumentState {
  /** performance.now() when it was last tracked, or undefined. */
  lastSeen: number | undefined;
  neutralSaved: boolean;
  /** Where its single-camera depth came from (e.g. "… depth held"). */
  depthSource: string | undefined;
  markerSidePx: number | undefined;
  stereoRejection: string | undefined;
  tipCalibrated: boolean;
}

export interface TrackingState {
  stereoMode: boolean;
  camera1Running: boolean;
  camera2Running: boolean;
  stereoCalibrated: boolean;
  /** Why the loaded stereo calibration does not match the cameras, or null. */
  calibrationMismatch: string | null;
  pairingFailure: string | null;
  workspaceSet: boolean;
  tableSet: boolean;
  instruments: Record<InstrumentName, InstrumentState>;
}

/** The health checks' input from the page state (src/ui/trackingHealth.ts). */
export function healthInput(state: TrackingState, now: number): HealthInput {
  const { stereoMode, camera1Running } = state;
  const stereoReady = stereoMode && state.stereoCalibrated;
  const instrument = (name: InstrumentName): InstrumentHealth => {
    const s = state.instruments[name];
    return {
      label: LABELS[name],
      lastSeenAgoMs: s.lastSeen !== undefined && camera1Running ? Math.max(0, now - s.lastSeen) : null,
      neutralSaved: s.neutralSaved,
      jawsCalibrated: null,
      depthHeld: !stereoMode && /depth held/.test(s.depthSource ?? ''),
      markerSidePx: s.markerSidePx ?? null,
      stereoRejection: stereoMode ? (s.stereoRejection ?? null) : null,
      tipCalibrated: stereoMode && name !== 'scissors' ? s.tipCalibrated : undefined,
    };
  };
  return {
    stereoMode,
    camera1Running,
    camera2Running: state.camera2Running,
    stereoCalibrationProblem: !state.stereoCalibrated ? 'No stereo calibration loaded' : state.calibrationMismatch,
    pairingFailure: stereoMode ? state.pairingFailure : null,
    workspaceSet: stereoReady ? state.workspaceSet : undefined,
    tableSet: stereoReady ? state.tableSet : undefined,
    instruments: (['needleDriver', 'forceps', 'scissors'] as const).map(instrument),
  };
}

/** Mount the strip before the practice stage (embedded) or at the top of the tracking page. */
export function mountTrackingStatusStrip(state: () => TrackingState, cameraMovedWarning: (now: number) => string | null) {
  const workspaceStage = document.querySelector('.workspace-stage');
  const stripParent = (workspaceStage?.parentElement ?? document.querySelector<HTMLElement>('#tracking-app'))!;
  const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)?.click();
  const openCalibration = (pane: 'pose' | 'jaws') => {
    const toggle = document.querySelector<HTMLButtonElement>('#workspace-calibrate-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    click(`[data-calibration-pane="${pane}"]`);
  };
  // Below the page header (standalone tracking page), or before the practice stage (embedded).
  const afterHeader = stripParent.querySelector(':scope > header')?.nextElementSibling ?? null;
  const strip = mountStatusStrip(stripParent, workspaceStage ?? afterHeader ?? stripParent.firstElementChild, {
    cameras: () => click(state().stereoMode ? '#start-stereo-all' : '#start-camera'),
    stereo: () => click('#tracking-setup-panel-toggle'),
    neutral: () => openCalibration('pose'),
    jaws: () => openCalibration('jaws'),
    // Guided stereo steps (trackingHealth.ts): workspace in Tracking setup; tips and table in Calibrate's tip section.
    workspace: () => click('#tracking-setup-panel-toggle'),
    tips: () => openCalibration('pose'),
    table: () => openCalibration('pose'),
  });
  setInterval(() => {
    const now = performance.now();
    const current = state();
    const health = healthInput(current, now);
    const bothCameras = current.stereoMode && current.camera1Running && current.camera2Running;
    strip.update({ checklist: setupChecklist(health), warning: bothCameras ? cameraMovedWarning(now) : null, holding: current.camera1Running ? holdingReasons(health) : [] });
  }, STATUS_STRIP_INTERVAL_MS);
}
