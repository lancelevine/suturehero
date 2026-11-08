import type { Quaternion } from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import { solvePrismPose, type PrismPose, type TrackerType } from '../input/prismPose';
import type { TrackedInstrument } from '../input/trackingMessages';
import { readStoredJson, writeStored } from '../input/trackingStorage';
import {
  averageRotation,
  CAPTURE_INLIER_RADIANS,
  handleRelativeToRing,
  hingeOpening,
  HANDLE_PRISM_IDS,
  parseHinge,
  serializeHinge,
  solveHinge,
  OpeningFilter,
  type HingeModel,
} from './handleHinge';

/** Saved hinge models per instrument (src/jaw/handleHinge.ts). */
export const HANDLE_HINGE_STORAGE_KEY = 'suturehero.handleHinge.v1';
/** Relative rotations averaged per closed/open capture. */
const CAPTURE_SAMPLES = 20;
/** Ring and single-marker fits worse than this are not used (px). */
const MAX_RING_ERROR_PX = 4;
const MAX_HANDLE_ERROR_PX = 3;
/** Keep the seeded (continuity) handle solution unless it fits worse than the unseeded one by more than this (px). */
const SEED_ERROR_MARGIN_PX = 1;
/** Ring side faces 0–5 give the most precise pose; angled faces 6–7 only when no side face is visible. */
const RING_SIDE_FACES = 6;
/** Ring faces smaller than this fraction of the largest visible face (nearly edge-on) are left out. */
const MIN_RING_FACE_AREA_RATIO = 0.35;

const INSTRUMENTS: TrackedInstrument[] = ['needleDriver', 'forceps', 'scissors'];
const LABELS: Record<TrackedInstrument, string> = { needleDriver: 'Needle driver', forceps: 'Forceps', scissors: 'Scissors' };

export interface HandlePrismHost {
  overlay: HTMLCanvasElement;
  trackerType(): TrackerType;
  /** Fresh camera-1 ring markers of one instrument, overlay pixels. */
  markers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  /** Fresh camera-1 handle prism markers of one instrument, overlay pixels. */
  handleMarkers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  firstMarkerId(instrument: TrackedInstrument): number;
  publish(instrument: TrackedInstrument, opening: number): void;
  /** False while the Jaws tab's "Jaw tracking" switch is off (no updates run). */
  running?(): boolean;
}

const TEMPLATE = `
<p class="tracking-message">Uses Camera 1, the ring tracker and the triangular marker prism on the moving handle
(needle driver IDs ${HANDLE_PRISM_IDS.needleDriver.join(', ')}; forceps ${HANDLE_PRISM_IDS.forceps.join(', ')}; scissors ${HANDLE_PRISM_IDS.scissors.join(', ')}).
<strong>1.</strong> Hold the jaws closed with the ring and one prism face visible, press <em>Calibrate closed</em> and hold still.
<strong>2.</strong> Open the jaws fully and press <em>Calibrate open</em>.</p>
<div class="tracking-actions">
 <label>Instrument <select data-handle-instrument>${INSTRUMENTS.map((n) => `<option value="${n}">${LABELS[n]}</option>`).join('')}</select></label>
 <button type="button" data-handle-capture="closed">Calibrate closed</button>
 <button type="button" data-handle-capture="open">Calibrate open</button>
 <button type="button" data-handle-reset>Remove calibration</button>
</div>
<p class="tracking-message" role="status" data-handle-status></p>
<p class="tracking-message" data-handle-readout></p>`;

/**
 * Jaw opening from a marker prism on the moving handle, relative to the ring
 * (src/jaw/handleHinge.ts). Uses the marker detector that already runs, so it
 * adds almost no per-frame cost. Approximate; synthetic tests only so far.
 */
export function mountHandlePrismJaws(container: HTMLElement, host: HandlePrismHost) {
  const panel = document.createElement('div');
  panel.dataset.jawHandle = '';
  panel.innerHTML = TEMPLATE;
  container.append(panel);
  const instrumentSelect = panel.querySelector<HTMLSelectElement>('[data-handle-instrument]')!;
  const status = panel.querySelector<HTMLElement>('[data-handle-status]')!;
  const readout = panel.querySelector<HTMLElement>('[data-handle-readout]')!;
  const selected = () => instrumentSelect.value as TrackedInstrument;

  const models = new Map<TrackedInstrument, HingeModel>();
  const closedCaptures = new Map<TrackedInstrument, Quaternion>();
  const ringPoses = new Map<TrackedInstrument, PrismPose>();
  const lastRelative = new Map<TrackedInstrument, Quaternion>();
  const openings = new Map<TrackedInstrument, number>();
  const filters = new Map<TrackedInstrument, OpeningFilter>();
  let capture: { instrument: TrackedInstrument; jaw: 'closed' | 'open'; samples: Quaternion[] } | null = null;
  const failures = new Map<TrackedInstrument, string>();

  const saved = readStoredJson(HANDLE_HINGE_STORAGE_KEY);
  if (saved && typeof saved === 'object') {
    for (const name of INSTRUMENTS) {
      const model = parseHinge((saved as Record<string, unknown>)[name]);
      if (model) models.set(name, model);
    }
  }
  const save = () => {
    const out: Record<string, unknown> = {};
    for (const [name, model] of models) out[name] = serializeHinge(model);
    if (!writeStored(HANDLE_HINGE_STORAGE_KEY, JSON.stringify(out))) status.textContent += ' (Could not save in this browser; calibration lasts until reload.)';
  };
  const describe = () => {
    const name = selected();
    status.textContent = models.has(name)
      ? `${LABELS[name]} calibrated (handle turns ${((models.get(name)!.openAngle * 180) / Math.PI).toFixed(0)}° closed → open).`
      : closedCaptures.has(name)
        ? `${LABELS[name]}: closed captured. Open the jaws fully and press Calibrate open.`
        : `${LABELS[name]}: not calibrated.`;
  };

  /** Handle orientation relative to the ring, or null with a reason in `failures`. */
  function relativeRotation(name: TrackedInstrument, now: number): Quaternion | null {
    const { width, height } = host.overlay;
    const type = host.trackerType();
    const first = host.firstMarkerId(name);
    const visible = host.markers(name, now);
    const area = (m: MarkerObservation) => Math.abs(m.corners.reduce((s, p, i) => { const n = m.corners[(i + 1) % 4]; return s + p.x * n.y - n.x * p.y; }, 0)) / 2;
    const side = type === 'ring8' ? visible.filter((m) => m.id - first < RING_SIDE_FACES) : visible;
    const candidates = side.length ? side : visible;
    // Faces seen nearly edge-on have unreliable corners and skew the ring rotation.
    const largest = Math.max(0, ...candidates.map(area));
    const ringMarkers = candidates.filter((m) => area(m) >= largest * MIN_RING_FACE_AREA_RATIO);
    if (!ringMarkers.length) {
      failures.set(name, 'Ring markers not visible to Camera 1.');
      return null;
    }
    const ring = solvePrismPose(ringMarkers, first, width, height, ringPoses.get(name), undefined, type);
    if (!ring || ring.error > MAX_RING_ERROR_PX) {
      failures.set(name, 'Ring pose not reliable in this view.');
      return null;
    }
    ringPoses.set(name, ring);
    const ids: readonly number[] = HANDLE_PRISM_IDS[name];
    // Largest visible face: most pixels, most precise single-marker pose.
    const faces = host.handleMarkers(name, now).filter((m) => ids.includes(m.id)).sort((a, b) => area(b) - area(a));
    for (const marker of faces) {
      // One face at a time through the iterative prism solver (3-face layout,
      // 12 mm markers): its rotation is exact for any prism width, which is
      // all the hinge needs. (The closed-form single-marker pose was off by
      // 2–5 px on synthetic 48 px markers.)
      const face = ids.indexOf(marker.id);
      // A single small marker has two mirror-image pose solutions that fit
      // almost equally well. The handle's rotation relative to the ring
      // changes little between frames, so seed with ring × last relative
      // rotation (or the closed calibration) and keep that solution unless it
      // fits clearly worse.
      const free = solvePrismPose([{ ...marker, id: face }], 0, width, height, undefined, undefined, 'prism');
      const expected = lastRelative.get(name) ?? models.get(name)?.closed ?? closedCaptures.get(name);
      const seeded = expected && free
        ? solvePrismPose([{ ...marker, id: face }], 0, width, height, { ...free, quaternion: ring.quaternion.clone().multiply(expected) }, undefined, 'prism')
        : null;
      const body = seeded && free && seeded.error <= free.error + SEED_ERROR_MARGIN_PX ? seeded : free;
      if (!body || body.error > MAX_HANDLE_ERROR_PX) continue;
      const relative = handleRelativeToRing(ring.quaternion, body.quaternion);
      lastRelative.set(name, relative);
      failures.delete(name);
      return relative;
    }
    failures.set(name, faces.length ? 'Handle prism seen but its pose is not reliable in this view.' : 'Handle prism not visible to Camera 1.');
    return null;
  }

  panel.querySelectorAll<HTMLButtonElement>('[data-handle-capture]').forEach((button) => {
    button.addEventListener('click', () => {
      const jaw = button.dataset.handleCapture as 'closed' | 'open';
      const name = selected();
      if (host.running && !host.running()) {
        status.textContent = 'Turn on “Jaw tracking” at the top of the Jaws tab first.';
        return;
      }
      if (jaw === 'open' && !closedCaptures.has(name)) {
        status.textContent = 'Calibrate closed first.';
        return;
      }
      capture = { instrument: name, jaw, samples: [] };
      status.textContent = `Hold the jaws ${jaw} and keep the instrument still…`;
    });
  });
  panel.querySelector('[data-handle-reset]')!.addEventListener('click', () => {
    models.delete(selected());
    closedCaptures.delete(selected());
    capture = null;
    save();
    describe();
  });
  instrumentSelect.addEventListener('change', () => {
    capture = null;
    describe();
  });

  function finishCapture(c: NonNullable<typeof capture>) {
    const average = averageRotation(c.samples);
    const mean = average.mean;
    capture = null;
    if (!mean) {
      status.textContent = `The readings spread ${((average.spread * 180) / Math.PI).toFixed(1)}° (only ${average.inliers} of ${c.samples.length} within ${((CAPTURE_INLIER_RADIANS * 180) / Math.PI).toFixed(0)}°). Hold still, keep one prism face and a flat ring face toward Camera 1, and try again.`;
      return;
    }
    if (c.jaw === 'closed') {
      closedCaptures.set(c.instrument, mean);
      models.delete(c.instrument);
      describe();
      return;
    }
    const model = solveHinge(closedCaptures.get(c.instrument)!, mean);
    if ('error' in model) {
      status.textContent = model.error;
      return;
    }
    models.set(c.instrument, model);
    filters.delete(c.instrument);
    save();
    status.textContent = `${LABELS[c.instrument]} calibrated. Open and close the jaws to check the reading.`;
  }

  describe();
  return {
    panel,
    /** Call once per processed camera-1 frame. */
    update(now: number) {
      for (const name of INSTRUMENTS) {
        const capturing = capture?.instrument === name;
        const model = models.get(name);
        if (!capturing && !model) continue;
        const relative = relativeRotation(name, now);
        if (!relative) continue;
        if (capturing) {
          capture!.samples.push(relative);
          if (capture!.samples.length >= CAPTURE_SAMPLES) finishCapture(capture!);
          continue;
        }
        let filter = filters.get(name);
        if (!filter) {
          filter = new OpeningFilter();
          filters.set(name, filter);
        }
        const opening = filter.update(hingeOpening(model!, relative));
        openings.set(name, opening);
        host.publish(name, Math.min(1, opening));
      }
      const name = selected();
      const opening = openings.get(name);
      const failure = failures.get(name) ?? '';
      readout.textContent = models.has(name)
        ? failure ? `Holding last reading · ${failure}` : `${Math.round(Math.min(1, opening ?? 0) * 100)}% open`
        : failure;
    },
  };
}
