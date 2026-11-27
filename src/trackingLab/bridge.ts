import type * as THREE from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import { snapshotTrackingStorage } from './configuration';
import type { Diagnostics } from './model';

/** Markers and poses older than this (ms) are left out of a Lab snapshot. */
const SNAPSHOT_MAX_AGE_MS = 220;
/** A recorded frame's workers must finish within this (ms). */
const PROCESS_TIMEOUT_MS = 20000;

/** A detector worker as the Lab reads it (WorkerDetector). */
interface LabWorker {
  lastResultAt: number;
  lastDetectedIds: number[];
}

/** One instrument's live target (tracking.ts liveTargets). */
interface LabTarget {
  id: number;
  lastSeen: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  pose: { position: THREE.Vector3; quaternion: THREE.Quaternion; reprojectionError: number };
}

/** What the Lab bridge needs from the tracking page; camera is 0 (camera 1) or 1 (camera 2). */
export interface TrackingLabBridgeDeps {
  videos(): [HTMLVideoElement, HTMLVideoElement];
  running(camera: number): boolean;
  startPrimary(): Promise<void>;
  startSecondary(): Promise<void>;
  stereoMode(): boolean;
  /** The camera selectors (camera 2's value is changed when it would duplicate camera 1). */
  primaryDeviceId(): string;
  secondarySelect: HTMLSelectElement;
  availableCameras(): Promise<MediaDeviceInfo[]>;
  instrumentProfiles(): Record<string, unknown>;
  observationsAt(camera: number): number;
  workers(camera: number): LabWorker[];
  /** When the video's current frame was presented (performance.now()), if known. */
  presentedAt(camera: number): number | undefined;
  liveMarkers(camera: number): MarkerObservation[];
  overlaySize(camera: number): { width: number; height: number };
  /** Stereo status line, plus the triangulation notes when stereo is active. */
  statusText(): string;
  stereoActive(): boolean;
  liveTargets(): Iterable<[string, LabTarget]>;
  recordedInput(): boolean;
  detect(camera: number, at: number): Promise<void>;
  busy(): boolean;
  updateLiveTargets(): void;
  animate(at: number): void;
}

/** Narrow lab bridge (moved out of src/tracking.ts, 2026-11-27): images and timestamps change; live tracking algorithms do not. */
export function createTrackingLabBridge(deps: TrackingLabBridgeDeps) {
  return {
    videos: () => deps.videos(),
    async start(cameras?: number[]) {
      if (!deps.running(0)) await deps.startPrimary();
      if ((cameras?.includes(1) ?? deps.stereoMode()) && !deps.running(1)) {
        const primary = deps.primaryDeviceId();
        const select2 = deps.secondarySelect;
        if (!select2.value || select2.value === primary) {
          const other = (await deps.availableCameras()).find((device) => device.deviceId !== primary);
          if (!other) throw new Error('Two-camera mode needs a second available camera');
          select2.value = other.deviceId;
        }
        await deps.startSecondary();
        if (!deps.running(1)) throw new Error('Camera 2 did not start');
      }
    },
    configuration() {
      const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]'))
        .filter((element) => element.type !== 'file' && element.closest('#tracking-app,.tracking-tools-panel,#instrument-calibration'))
        .map((element) => ({ id: element.id, value: element.value, checked: element instanceof HTMLInputElement ? element.checked : undefined }));
      return {
        storage: snapshotTrackingStorage({
          'suturehero.instrument-calibration.v1': JSON.stringify(deps.instrumentProfiles()),
        }),
        controls,
        activeInstrument: document.querySelector('[data-calibration-tool][aria-pressed="true"]')?.getAttribute('data-calibration-tool') ?? 'needleDriver',
      };
    },
    snapshot(camera: number) {
      const now = performance.now();
      const at = deps.observationsAt(camera);
      const currentWorkers = deps.workers(camera).filter((worker) => worker.lastResultAt >= (deps.presentedAt(camera) ?? now) - 1);
      const markers = deps.liveMarkers(camera).map((marker) => ({
        ...marker,
        current: currentWorkers.some((worker) => worker.lastDetectedIds.includes(marker.id)),
        corners: marker.corners.map((point) => ({ ...point })),
      }));
      const size = deps.overlaySize(camera);
      return {
        // Camera jaw tracking was removed (build 0.205; jaws come from the Hall sensor): ball fields stay empty for the Lab.
        at,
        ballProcessed: true,
        markerCurrent: markers.some((marker) => marker.current),
        markers: now - at < SNAPSHOT_MAX_AGE_MS ? markers : [],
        width: size.width,
        height: size.height,
        ballWidth: 640,
        ballHeight: 0,
        // In stereo, add why each instrument did or did not get a stereo pose this frame.
        balls: [] as Diagnostics['balls'],
        status: deps.statusText(),
        confidence: null,
        jawEngine: 'classic',
        ballSupported: false,
        poses: [...deps.liveTargets()]
          .filter(([, target]) => now - target.lastSeen < SNAPSHOT_MAX_AGE_MS)
          .map(([instrument, target]) => ({
            instrument,
            markerId: target.id,
            markerPose: { camera: 0, translationMm: target.pose.position.toArray(), quaternion: target.pose.quaternion.toArray(), reprojectionErrorPx: target.pose.reprojectionError },
            position: target.position.toArray(),
            quaternion: target.quaternion.toArray(),
            at: target.lastSeen,
          })),
        stereo: deps.stereoActive(),
      };
    },
    async process(camera: number, at: number) {
      if (!deps.recordedInput()) throw new Error('Recorded frame input is required');
      await deps.detect(camera, at);
      const started = Date.now();
      while (deps.busy()) {
        if (Date.now() - started > PROCESS_TIMEOUT_MS) throw new Error('Tracking worker timed out');
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      deps.updateLiveTargets();
      deps.animate(at);
      return this.snapshot(camera);
    },
  };
}
