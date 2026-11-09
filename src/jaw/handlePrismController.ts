import type { Quaternion } from 'three';
import type { MarkerObservation } from '../input/arucoTracking';
import type { StereoCalibration } from '../input/stereoGeometry';
import { Vector3 } from 'three';
import {
  DEFAULT_PRISM_FACE_WIDTH_MM,
  inRingFrame,
  parseStereoHandle,
  prismApothem,
  prismAxisPoint,
  robustPoint,
  serializeStereoHandle,
  stereoOpening,
  triangulateMarker,
  MIN_STEREO_TRAVEL_MM,
  type StereoHandleModel,
} from './stereoHandle';
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
/** Stereo prism positions per instrument (closed/open, ring frame). */
export const HANDLE_STEREO_STORAGE_KEY = 'suturehero.handleStereo.v1';
export const HANDLE_FACE_WIDTH_STORAGE_KEY = 'suturehero.handlePrismFaceWidth.v1';
/** Stereo positions per closed/open capture. */
const STEREO_CAPTURE_SAMPLES = 15;
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
  /** Stereo: calibration while stereo tracking is active, and the ring's latest stereo pose (camera-1 mm). */
  stereo?: {
    calibration(): StereoCalibration | null;
    ringPose(instrument: TrackedInstrument, now: number): { quaternion: Quaternion; translation: Vector3 } | null;
  };
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
With both cameras running and stereo active, the jaw reading uses the prism's 3D position from both cameras (far more reliable than one camera's view of a small face).
<strong>1.</strong> Hold the jaws closed with the ring and one prism face visible, press <em>Calibrate closed</em> and hold still.
<strong>2.</strong> Keep the jaws closed, press <em>Align prism faces</em> and slowly roll the instrument so each prism face is seen by a camera (press again to stop early).
<strong>3.</strong> Open the jaws fully and press <em>Calibrate open</em>.</p>
<div class="tracking-actions">
 <label>Instrument <select data-handle-instrument>${INSTRUMENTS.map((n) => `<option value="${n}">${LABELS[n]}</option>`).join('')}</select></label>
 <button type="button" data-handle-capture="closed">Calibrate closed</button>
 <button type="button" data-handle-align>Align prism faces</button>
 <button type="button" data-handle-capture="open">Calibrate open</button>
 <button type="button" data-handle-reset>Remove calibration</button>
 <label title="Width of each prism face (the 12 mm square plus its white border). Used with both cameras to find the prism's centre line.">Prism face width (mm) <input data-handle-face-width type="number" min="12" max="40" step="0.5" value="${DEFAULT_PRISM_FACE_WIDTH_MM}" style="width:5em"></label>
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
  let capture: { instrument: TrackedInstrument; jaw: 'closed' | 'open'; samples: Quaternion[]; stereoSamples: Vector3[] } | null = null;
  const stereoModels = new Map<TrackedInstrument, StereoHandleModel>();
  const stereoClosed = new Map<TrackedInstrument, Vector3>();
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
  const savedStereo = readStoredJson(HANDLE_STEREO_STORAGE_KEY);
  if (savedStereo && typeof savedStereo === 'object') {
    for (const name of INSTRUMENTS) {
      const model = parseStereoHandle((savedStereo as Record<string, unknown>)[name]);
      if (model) stereoModels.set(name, model);
    }
  }
  const saveStereo = () => {
    const out: Record<string, unknown> = {};
    for (const [name, model] of stereoModels) out[name] = serializeStereoHandle(model);
    writeStored(HANDLE_STEREO_STORAGE_KEY, JSON.stringify(out));
  };
  const faceWidthInput = panel.querySelector<HTMLInputElement>('[data-handle-face-width]')!;
  {
    const stored = Number(readStoredJson(HANDLE_FACE_WIDTH_STORAGE_KEY));
    if (stored >= 12 && stored <= 40) faceWidthInput.value = String(stored);
  }
  faceWidthInput.addEventListener('change', () => {
    const value = Number(faceWidthInput.value);
    if (!(value >= 12 && value <= 40)) { faceWidthInput.value = String(DEFAULT_PRISM_FACE_WIDTH_MM); return; }
    writeStored(HANDLE_FACE_WIDTH_STORAGE_KEY, JSON.stringify(value));
  });
  /**
   * The prism's centre line in the ring frame from both cameras: each prism
   * face seen by both is triangulated, moved inward by the prism's apothem,
   * and averaged. Null without stereo, a fresh stereo ring pose, or a face in both views.
   */
  function stereoPoint(name: TrackedInstrument, now: number): { point: Vector3; ids: number[] } | null {
    const calibration = host.stereo?.calibration();
    const ring = calibration ? host.stereo!.ringPose(name, now) : null;
    if (!calibration || !ring || cameras.length < 2) return null;
    const [one, two] = cameras;
    const second = new Map(two.handleMarkers(name, now).map((m) => [m.id, m]));
    const apothem = prismApothem(Number(faceWidthInput.value) || DEFAULT_PRISM_FACE_WIDTH_MM);
    const points: Vector3[] = [], ids: number[] = [];
    for (const marker of one.handleMarkers(name, now)) {
      const other = second.get(marker.id);
      if (!other) continue;
      const corners = triangulateMarker(calibration, marker.corners, other.corners, { width: one.overlay.width, height: one.overlay.height }, { width: two.overlay.width, height: two.overlay.height });
      if (!corners) continue;
      points.push(inRingFrame(prismAxisPoint(corners, apothem), ring));
      ids.push(marker.id);
    }
    if (!points.length) return null;
    return { point: points.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / points.length), ids };
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
    const stereoNote = stereoModels.has(name) ? ' · stereo (both cameras) calibrated' : stereoClosed.has(name) ? ' · stereo closed captured' : '';
    status.textContent = (models.has(name)
      ? `${LABELS[name]} calibrated (handle turns ${((models.get(name)!.openAngle * 180) / Math.PI).toFixed(0)}° closed → open) · ${layoutSummary(name)}.`
      : closedCaptures.has(name)
        ? `${LABELS[name]}: closed captured. Open the jaws fully and press Calibrate open.`
        : `${LABELS[name]}: not calibrated.`) + stereoNote;
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
      if (jaw === 'open' && !closedCaptures.has(name) && !stereoClosed.has(name)) {
        status.textContent = 'Calibrate closed first.';
        return;
      }
      aligning = null;
      capture = { instrument: name, jaw, samples: [], stereoSamples: [] };
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
    stereoModels.delete(selected());
    stereoClosed.delete(selected());
    saveStereo();
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

  /** Stereo half of a capture; returns a message, or '' if there were too few stereo readings. */
  function finishStereoCapture(c: NonNullable<typeof capture>): string {
    if (c.stereoSamples.length < STEREO_CAPTURE_SAMPLES * 0.6) return '';
    const robust = robustPoint(c.stereoSamples);
    if (!robust) return 'Stereo: the prism position varied too much; hold still and try again.';
    if (c.jaw === 'closed') {
      stereoClosed.set(c.instrument, robust.point);
      stereoModels.delete(c.instrument);
      return 'Stereo closed position captured.';
    }
    const closed = stereoClosed.get(c.instrument);
    if (!closed) return '';
    const travel = robust.point.distanceTo(closed);
    if (travel < MIN_STEREO_TRAVEL_MM) return `Stereo: the prism only moved ${travel.toFixed(1)} mm between closed and open; open the jaws fully.`;
    stereoModels.set(c.instrument, { closed, open: robust.point });
    filters.delete(c.instrument);
    saveStereo();
    return `Stereo calibrated: the prism moves ${travel.toFixed(1)} mm from closed to open.`;
  }

  function finishCapture(c: NonNullable<typeof capture>) {
    capture = null;
    const stereoMessage = finishStereoCapture(c);
    const usedStereo = stereoMessage.startsWith('Stereo calibrated') || stereoMessage.startsWith('Stereo closed');
    if (c.samples.length < CAPTURE_SAMPLES * 0.6) {
      // Not enough single-camera readings: fine if stereo succeeded.
      if (usedStereo) describe();
      status.textContent = stereoMessage || 'Not enough readings; keep the ring and a prism face in view of both cameras and try again.';
      if (usedStereo) status.textContent = `${LABELS[c.instrument]}: ${stereoMessage}`;
      return;
    }
    const average = averageRotation(c.samples);
    const mean = average.mean;
    if (!mean) {
      if (usedStereo) {
        status.textContent = `${LABELS[c.instrument]}: ${stereoMessage} (single-camera readings were too noisy and were not used.)`;
        return;
      }
      status.textContent = `The readings spread ${((average.spread * 180) / Math.PI).toFixed(1)}° (only ${average.inliers} of ${c.samples.length} within ${((CAPTURE_INLIER_RADIANS * 180) / Math.PI).toFixed(0)}°). Hold still, keep one prism face and a flat ring face toward Camera 1, and try again.`;
      return;
    }
    if (c.jaw === 'closed') {
      closedCaptures.set(c.instrument, mean);
      models.delete(c.instrument);
      describe();
      if (stereoMessage) status.textContent += ' ' + stereoMessage;
      return;
    }
    const closedMono = closedCaptures.get(c.instrument);
    const model = closedMono ? solveHinge(closedMono, mean) : { error: '' };
    if ('error' in model) {
      status.textContent = usedStereo ? `${LABELS[c.instrument]}: ${stereoMessage}` : model.error || 'Calibrate closed first.';
      return;
    }
    models.set(c.instrument, model);
    filters.delete(c.instrument);
    save();
    status.textContent = `${LABELS[c.instrument]} calibrated. Open and close the jaws to check the reading.` + (stereoMessage ? ' ' + stereoMessage : '');
  }

  describe();
  return {
    panel,
    /** Whether this instrument's handle prism has a closed/open calibration (one or two cameras). */
    calibrated: (name: TrackedInstrument) => models.has(name) || stereoModels.has(name),
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
        const stereoModel = stereoModels.get(name);
        if (!capturing && !model && !stereoModel) continue;
        const stereo = stereoPoint(name, now);
        if (capturing && capture!.jaw === 'closed' && !layouts.has(name)) {
          // The first face seen while capturing closed becomes the reference face; others need aligning.
          const first = cameras.map((camera) => cameraRelative(name, now, camera, 'raw')).find((r) => typeof r !== 'string');
          if (first && typeof first !== 'string') {
            layouts.set(name, newFaceLayout(first[0].face));
            saveLayouts();
          }
        }
        const relative = relativeRotation(name, now);
        if (capturing) {
          if (relative) capture!.samples.push(relative);
          if (stereo) capture!.stereoSamples.push(stereo.point);
          if (capture!.samples.length >= CAPTURE_SAMPLES || capture!.stereoSamples.length >= STEREO_CAPTURE_SAMPLES) finishCapture(capture!);
          continue;
        }
        let filter = filters.get(name);
        if (!filter) {
          filter = new OpeningFilter();
          filters.set(name, filter);
        }
        // Prefer the stereo (both-camera) position; fall back to one camera's face rotation.
        let raw: number | null = null;
        if (stereoModel && stereo) {
          raw = stereoOpening(stereoModel, stereo.point);
          sources.set(name, `stereo 3D, face${stereo.ids.length > 1 ? 's' : ''} ${stereo.ids.join(', ')}`);
          failures.delete(name);
        } else if (model && relative) raw = hingeOpening(model, relative);
        if (raw === null) continue;
        const opening = filter.update(raw);
        openings.set(name, opening);
        host.publish(name, Math.min(1, opening));
      }
      const name = selected();
      const opening = openings.get(name);
      const failure = failures.get(name) ?? '';
      readout.textContent = models.has(name) || stereoModels.has(name)
        ? failure ? `Holding last reading · ${failure}` : `${Math.round(Math.min(1, opening ?? 0) * 100)}% open · ${sources.get(name) ?? ''}`
        : failure;
    },
  };
}
