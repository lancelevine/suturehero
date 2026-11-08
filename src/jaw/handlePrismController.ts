import type { Quaternion } from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import { solvePrismPose, type PrismPose, type TrackerType } from '../input/prismPose';
import type { TrackedInstrument } from '../input/trackingMessages';
import { readStoredJson, writeStored } from '../input/trackingStorage';
import {
  averageRotation,
  correctedRelative,
  faceCorrection,
  snapFaceCorrection,
  newFaceLayout,
  parseFaceLayout,
  serializeFaceLayout,
  type FaceLayout,
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
/** Learned prism face layouts per instrument (Align prism faces). */
export const HANDLE_FACES_STORAGE_KEY = 'suturehero.handlePrismFaces.v1';
/** Readings needed per face (and for the reference face) to align it. */
const ALIGN_SAMPLES = 12;
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
  /** Camera 2's view, to confirm Camera 1 or stand in when Camera 1's view is blocked. */
  second?: {
    overlay: HTMLCanvasElement;
    markers(instrument: TrackedInstrument, now: number): MarkerObservation[];
    handleMarkers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  };
}

interface FaceReading {
  /** Prism face index (order of HANDLE_PRISM_IDS). */
  face: number;
  relative: Quaternion;
}

interface HandleCamera {
  index: 1 | 2;
  overlay: HTMLCanvasElement;
  markers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  handleMarkers(instrument: TrackedInstrument, now: number): MarkerObservation[];
}

/** Two cameras' relative rotations within this angle are averaged (radians). */
const CAMERAS_AGREE_RADIANS = (8 * Math.PI) / 180;

const TEMPLATE = `
<p class="tracking-message">Uses Camera 1, the ring tracker and the triangular marker prism on the moving handle
(seen by Camera 1 and, when running, Camera 2; needle driver IDs ${HANDLE_PRISM_IDS.needleDriver.join(', ')}; forceps ${HANDLE_PRISM_IDS.forceps.join(', ')}; scissors ${HANDLE_PRISM_IDS.scissors.join(', ')}).
<strong>1.</strong> Hold the jaws closed with the ring and one prism face visible, press <em>Calibrate closed</em> and hold still.
<strong>2.</strong> Keep the jaws closed, press <em>Align prism faces</em> and slowly roll the instrument so each prism face is seen by a camera (press again to stop early).
<strong>3.</strong> Open the jaws fully and press <em>Calibrate open</em>.</p>
<div class="tracking-actions">
 <label>Instrument <select data-handle-instrument>${INSTRUMENTS.map((n) => `<option value="${n}">${LABELS[n]}</option>`).join('')}</select></label>
 <button type="button" data-handle-capture="closed">Calibrate closed</button>
 <button type="button" data-handle-align>Align prism faces</button>
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
  const ringPoses = new Map<string, PrismPose>();
  const sources = new Map<TrackedInstrument, string>();
  const handlePoses = new Map<string, { pose: PrismPose; at: number }>();
  const cameras: HandleCamera[] = [
    { index: 1, overlay: host.overlay, markers: host.markers, handleMarkers: host.handleMarkers },
    ...(host.second ? [{ index: 2 as const, ...host.second }] : []),
  ];
  const lastRelative = new Map<TrackedInstrument, Quaternion>();
  const openings = new Map<TrackedInstrument, number>();
  const filters = new Map<TrackedInstrument, OpeningFilter>();
  let capture: { instrument: TrackedInstrument; jaw: 'closed' | 'open'; samples: Quaternion[] } | null = null;
  let aligning: { instrument: TrackedInstrument; samples: Quaternion[][] } | null = null;
  const layouts = new Map<TrackedInstrument, FaceLayout>();
  const failures = new Map<TrackedInstrument, string>();

  const saved = readStoredJson(HANDLE_HINGE_STORAGE_KEY);
  if (saved && typeof saved === 'object') {
    for (const name of INSTRUMENTS) {
      const model = parseHinge((saved as Record<string, unknown>)[name]);
      if (model) models.set(name, model);
    }
  }
  const savedLayouts = readStoredJson(HANDLE_FACES_STORAGE_KEY);
  if (savedLayouts && typeof savedLayouts === 'object') {
    for (const name of INSTRUMENTS) {
      const layout = parseFaceLayout((savedLayouts as Record<string, unknown>)[name]);
      if (layout) layouts.set(name, layout);
    }
  }
  const saveLayouts = () => {
    const out: Record<string, unknown> = {};
    for (const [name, layout] of layouts) out[name] = serializeFaceLayout(layout);
    writeStored(HANDLE_FACES_STORAGE_KEY, JSON.stringify(out));
  };
  const faceId = (name: TrackedInstrument, face: number) => HANDLE_PRISM_IDS[name][face];
  const layoutSummary = (name: TrackedInstrument) => {
    const layout = layouts.get(name);
    if (!layout) return 'faces not aligned';
    const aligned = layout.corrections.map((c, face) => (c ? faceId(name, face) : null)).filter((id) => id !== null);
    return aligned.length === 3 ? 'all prism faces aligned' : `aligned faces: ${aligned.join(', ')} (reference ${faceId(name, layout.reference)}) — use Align prism faces for the rest`;
  };
  const save = () => {
    const out: Record<string, unknown> = {};
    for (const [name, model] of models) out[name] = serializeHinge(model);
    if (!writeStored(HANDLE_HINGE_STORAGE_KEY, JSON.stringify(out))) status.textContent += ' (Could not save in this browser; calibration lasts until reload.)';
  };
  const describe = () => {
    const name = selected();
    status.textContent = models.has(name)
      ? `${LABELS[name]} calibrated (handle turns ${((models.get(name)!.openAngle * 180) / Math.PI).toFixed(0)}° closed → open) · ${layoutSummary(name)}.`
      : closedCaptures.has(name)
        ? `${LABELS[name]}: closed captured. Open the jaws fully and press Calibrate open.`
        : `${LABELS[name]}: not calibrated.`;
  };

  /**
   * One camera's handle rotation(s) relative to the ring, or why there are
   * none. 'corrected': the clearest aligned face, mapped onto the reference
   * face (unaligned faces skipped). 'raw': every reliable face, uncorrected
   * (for Align prism faces).
   */
  function cameraRelative(name: TrackedInstrument, now: number, camera: HandleCamera, mode: 'corrected' | 'raw' = 'corrected'): FaceReading[] | string {
    const { width, height } = camera.overlay;
    if (!width || !height) return `Camera ${camera.index} is not running.`;
    const type = host.trackerType();
    const first = host.firstMarkerId(name);
    const visible = camera.markers(name, now);
    const area = (m: MarkerObservation) => Math.abs(m.corners.reduce((s, p, i) => { const n = m.corners[(i + 1) % 4]; return s + p.x * n.y - n.x * p.y; }, 0)) / 2;
    const side = type === 'ring8' ? visible.filter((m) => m.id - first < RING_SIDE_FACES) : visible;
    const candidates = side.length ? side : visible;
    // Faces seen nearly edge-on have unreliable corners and skew the ring rotation.
    const largest = Math.max(0, ...candidates.map(area));
    const ringMarkers = candidates.filter((m) => area(m) >= largest * MIN_RING_FACE_AREA_RATIO);
    if (!ringMarkers.length) return `ring not visible to Camera ${camera.index}`;
    const ringKey = `${name}:${camera.index}`;
    const ring = solvePrismPose(ringMarkers, first, width, height, ringPoses.get(ringKey), undefined, type);
    if (!ring || ring.error > MAX_RING_ERROR_PX) return `ring pose not reliable in Camera ${camera.index}`;
    ringPoses.set(ringKey, ring);
    const ids: readonly number[] = HANDLE_PRISM_IDS[name];
    // Largest visible face: most pixels, most precise single-marker pose.
    const faces = camera.handleMarkers(name, now).filter((m) => ids.includes(m.id)).sort((a, b) => area(b) - area(a));
    const layout = layouts.get(name);
    const readings: FaceReading[] = [];
    let unaligned: number[] = [];
    for (const marker of faces) {
      // One face at a time through the iterative prism solver (3-face layout,
      // 12 mm markers): its rotation is exact for any prism width, which is
      // all the hinge needs. (The closed-form single-marker pose was off by
      // 2–5 px on synthetic 48 px markers.)
      const face = ids.indexOf(marker.id);
      const correction = layout?.corrections[face] ?? null;
      if (mode === 'corrected' && layout && !correction) {
        unaligned.push(marker.id);
        continue;
      }
      // A single small marker has two mirror-image pose solutions that fit
      // almost equally well. The handle's rotation relative to the ring
      // changes little between frames, so seed with ring × last relative
      // rotation (or the closed calibration), expressed in this face's own
      // (uncorrected) frame, and keep that solution unless it fits clearly worse.
      const free = solvePrismPose([{ ...marker, id: face }], 0, width, height, undefined, undefined, 'prism');
      const expectedCorrected = lastRelative.get(name) ?? models.get(name)?.closed ?? closedCaptures.get(name);
      const expected = expectedCorrected && correction ? expectedCorrected.clone().multiply(correction.clone().invert()) : expectedCorrected;
      const seeded = expected && free
        ? solvePrismPose([{ ...marker, id: face }], 0, width, height, { ...free, quaternion: ring.quaternion.clone().multiply(expected) }, undefined, 'prism')
        : null;
      const body = seeded && free && seeded.error <= free.error + SEED_ERROR_MARGIN_PX ? seeded : free;
      if (!body || body.error > MAX_HANDLE_ERROR_PX) continue;
      const raw = handleRelativeToRing(ring.quaternion, body.quaternion);
      const relative = mode === 'raw' || !layout ? raw : correctedRelative(layout, face, raw)!;
      if (!readings.length) handlePoses.set(`${name}:${camera.index}`, { pose: body, at: now });
      readings.push({ face, relative });
      // The corrected reading needs only the clearest usable face; alignment wants every face.
      if (mode === 'corrected') break;
    }
    if (readings.length) return readings;
    if (unaligned.length && !faces.some((m) => !unaligned.includes(m.id))) return `prism face ${unaligned.join(', ')} not aligned yet (Align prism faces)`;
    return faces.length ? `prism seen by Camera ${camera.index} but its pose is not reliable` : `prism not visible to Camera ${camera.index}`;
  }

  /**
   * The handle's rotation relative to the ring is a property of the
   * instrument, so each camera measures it independently with the same
   * calibration (no stereo calibration needed). Two agreeing cameras are
   * averaged; on disagreement the one nearer the last good reading wins (the
   * other is likely a mirror-ambiguity flip); one camera alone is used when
   * the other's view is blocked.
   */
  function relativeRotation(name: TrackedInstrument, now: number): Quaternion | null {
    const results = cameras.map((camera) => {
      const result = cameraRelative(name, now, camera);
      return { camera, result: typeof result === 'string' ? result : result[0].relative };
    });
    const good = results.filter((r): r is { camera: HandleCamera; result: Quaternion } => typeof r.result !== 'string');
    const previous = lastRelative.get(name);
    let relative: Quaternion | null = null;
    let source = '';
    if (good.length === 2) {
      const [a, b] = good;
      if (a.result.angleTo(b.result) <= CAMERAS_AGREE_RADIANS) {
        relative = a.result.clone().slerp(b.result, 0.5);
        source = 'Cameras 1 + 2 agree';
      } else {
        const pick = previous && b.result.angleTo(previous) < a.result.angleTo(previous) ? b : a;
        relative = pick.result;
        source = `Camera ${pick.camera.index} (cameras disagree by ${((a.result.angleTo(b.result) * 180) / Math.PI).toFixed(0)}°)`;
      }
    } else if (good.length === 1) {
      relative = good[0].result;
      source = `Camera ${good[0].camera.index} only`;
    }
    const reasons = results.filter((r) => typeof r.result === 'string').map((r) => r.result as string);
    if (!relative) {
      failures.set(name, reasons.join('; ') || 'no camera view');
      sources.delete(name);
      return null;
    }
    lastRelative.set(name, relative);
    failures.delete(name);
    sources.set(name, source + (reasons.length && good.length === 1 && cameras.length > 1 ? ` · ${reasons.join('; ')}` : ''));
    return relative;
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
      aligning = null;
      capture = { instrument: name, jaw, samples: [] };
      status.textContent = `Hold the jaws ${jaw} and keep the instrument still…`;
    });
  });
  panel.querySelector('[data-handle-align]')!.addEventListener('click', () => {
    const name = selected();
    if (aligning) {
      finishAlignment();
      return;
    }
    if (host.running && !host.running()) {
      status.textContent = 'Turn on “Jaw tracking” at the top of the Jaws tab first.';
      return;
    }
    if (!layouts.has(name)) {
      status.textContent = 'Calibrate closed first (it picks the reference face).';
      return;
    }
    capture = null;
    aligning = { instrument: name, samples: [[], [], []] };
    status.textContent = `Keep the jaws closed. Show reference face ${faceId(name, layouts.get(name)!.reference)} first, then roll slowly so each other face is seen…`;
  });

  /** Correction per face from readings taken with the jaws still: each face must match the reference face. */
  function finishAlignment() {
    const a = aligning!;
    aligning = null;
    const layout = layouts.get(a.instrument)!;
    const reference = averageRotation(a.samples[layout.reference]).mean;
    if (!reference || a.samples[layout.reference].length < ALIGN_SAMPLES) {
      status.textContent = `Not enough steady readings of reference face ${faceId(a.instrument, layout.reference)}. Show it to a camera with the jaws closed and try again.`;
      return;
    }
    const done: number[] = [];
    for (const face of [0, 1, 2]) {
      if (face === layout.reference || a.samples[face].length < ALIGN_SAMPLES) continue;
      const mean = averageRotation(a.samples[face]).mean;
      if (!mean) continue;
      // Snapped to the nearest physically possible sticker layout, removing pose noise from the correction.
      layout.corrections[face] = snapFaceCorrection(faceCorrection(mean, reference), face, layout.reference);
      done.push(faceId(a.instrument, face));
    }
    saveLayouts();
    filters.delete(a.instrument);
    status.textContent = done.length
      ? `Aligned face${done.length > 1 ? 's' : ''} ${done.join(', ')} · ${layoutSummary(a.instrument)}.`
      : `No other face was seen steadily enough. Roll more slowly, keeping the jaws closed · ${layoutSummary(a.instrument)}.`;
  }

  /** One alignment step: collect every reliable face's uncorrected reading from both cameras. */
  function alignStep(now: number) {
    const a = aligning!;
    for (const camera of cameras) {
      const readings = cameraRelative(a.instrument, now, camera, 'raw');
      if (typeof readings === 'string') continue;
      for (const r of readings) if (a.samples[r.face].length < ALIGN_SAMPLES * 3) a.samples[r.face].push(r.relative);
    }
    const layout = layouts.get(a.instrument)!;
    const progress = [0, 1, 2].map((face) => `${faceId(a.instrument, face)}${face === layout.reference ? ' (reference)' : ''}: ${Math.min(ALIGN_SAMPLES, a.samples[face].length)}/${ALIGN_SAMPLES}`).join(' · ');
    status.textContent = `Aligning, jaws closed — roll slowly · ${progress} · press Align prism faces again to stop.`;
    if ([0, 1, 2].every((face) => a.samples[face].length >= ALIGN_SAMPLES)) finishAlignment();
  }

  panel.querySelector('[data-handle-reset]')!.addEventListener('click', () => {
    layouts.delete(selected());
    saveLayouts();
    aligning = null;
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
    /** Latest handle-prism body pose seen by Camera 1 or 2 (within maxAgeMs), for drawing. */
    handlePose(name: TrackedInstrument, camera: 1 | 2, now: number, maxAgeMs = 250): PrismPose | null {
      const entry = handlePoses.get(`${name}:${camera}`);
      return entry && now - entry.at <= maxAgeMs ? entry.pose : null;
    },
    /** Call once per processed camera-1 frame. */
    update(now: number) {
      if (aligning) alignStep(now);
      for (const name of INSTRUMENTS) {
        if (aligning?.instrument === name) continue;
        const capturing = capture?.instrument === name;
        const model = models.get(name);
        if (!capturing && !model) continue;
        if (capturing && capture!.jaw === 'closed' && !layouts.has(name)) {
          // The first face seen while capturing closed becomes the reference face; others need aligning.
          const first = cameras.map((camera) => cameraRelative(name, now, camera, 'raw')).find((r) => typeof r !== 'string');
          if (first && typeof first !== 'string') {
            layouts.set(name, newFaceLayout(first[0].face));
            saveLayouts();
          }
        }
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
        ? failure ? `Holding last reading · ${failure}` : `${Math.round(Math.min(1, opening ?? 0) * 100)}% open · ${sources.get(name) ?? ''}`
        : failure;
    },
  };
}
