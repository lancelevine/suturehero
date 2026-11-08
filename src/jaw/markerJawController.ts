import {cameraImage,cameraImageId} from '../trackingLab/runtime';
import type { MarkerObservation } from '../input/arucoTracking';
import { solvePrismPose, trackerGeometry, type PrismPose, type TrackerType } from '../input/prismPose';
import { readStored, readStoredJson, TRACKING_STORAGE_KEYS, writeStored } from '../input/trackingStorage';
import type { TrackedInstrument } from '../input/trackingMessages';
import type { StereoCalibration } from '../input/stereoGeometry';
import { expectedSpacing, median, openingFromDistance, stereoBallPair } from './stereoBallDistance';
import { findBrightBalls, grayFromRGBA, maskFromQuads, type GrayImage } from './brightBalls';
import { defaultIntrinsics, projectBodyPoint, type Pixel } from './jawGeometry';
import {
  ballRadiusPx,
  buildJawModel,
  DEFAULT_BALL_DIAMETER_MM,
  HOLD_MS,
  SMOOTHING,
  JawCapture,
  JawTracker,
  MIN_CAPTURE_SAMPLES,
  MIN_CAPTURE_SPREAD_DEG,
  parseJawModel,
  serializeJawModel,
  type JawFrame,
  type JawModel,
  type JawPose,
  type JawReading,
  type Region,
  type SampledRegion,
} from './JawTracker';

/**
 * Page glue for marker-relative white-ball jaw tracking (camera 1).
 *
 * It only *reads* marker observations and solves its own copy of the tracker
 * pose, so it cannot change instrument tracking. Openings are delivered
 * through `publish`, the same path the classic jaw tracker uses.
 */
export interface MarkerJawHost {
  video: HTMLVideoElement;
  /** Marker overlay canvas; its size defines the marker coordinate space. */
  overlay: HTMLCanvasElement;
  trackerType(): TrackerType;
  /** Fresh camera-1 markers of one instrument, in overlay pixels. */
  markers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  /** ArUco ID of the instrument's face 0. */
  firstMarkerId(instrument: TrackedInstrument): number;
  /** Deliver an opening (0 closed … 1 open) to the scene and previews. */
  publish(instrument: TrackedInstrument, opening: number): void;
  /** Camera 2, for measuring the 3D ball-to-ball distance in stereo. */
  second?: {
    video: HTMLVideoElement;
    overlay: HTMLCanvasElement;
    markers(instrument: TrackedInstrument, now: number): MarkerObservation[];
  };
  /** The stereo calibration while stereo tracking is active, else null. */
  stereoCalibration?(): StereoCalibration | null;
}

export interface MarkerJawSnapshot {current:boolean;width:number;height:number;readings:Array<{instrument:TrackedInstrument;reading:JawReading}>;}

export type JawEngine = 'marker' | 'classic';

const INSTRUMENTS: TrackedInstrument[] = ['needleDriver', 'forceps', 'scissors'];
const LABELS: Record<TrackedInstrument, string> = { needleDriver: 'Needle driver', forceps: 'Forceps', scissors: 'Scissors' };
/** Ring side faces 0–5 give the most precise pose; the angled faces 6–7 are used when no side face is visible. */
const RING_SIDE_FACES = 6;
/** Skip frames whose tracker pose fits the markers worse than this, px. */
const MAX_POSE_ERROR_PX = 4;
/** Markers' white borders look like bright blobs; ignore a margin around them. */
const MARKER_MASK_GROWTH = 1.25;
const BALLS_PER_INSTRUMENT = 2;
/** Search this many marker sides around the ring for jaw balls in stereo. */
const STEREO_SEARCH_MARKER_SIDES = 6;
const MAX_STEREO_CANDIDATES = 6;
/** Minimum time between stereo ball searches, ms. */
const STEREO_INTERVAL_MS = 66;
/** The closed/open 3D ball distances must differ by at least this much. */
const MIN_STEREO_SPAN_MM = 2;
/** Ball sizes tried when snapping a click, relative to the diameter setting (each try accepts ~0.55–1.5×). */
const SNAP_SIZE_GUESSES = [1, 0.6, 0.4, 1.6];

type Mode =
  | { kind: 'idle' }
  | { kind: 'picking'; instrument: TrackedInstrument; jaw: JawPose; seeds: Pixel[] }
  | { kind: 'capturing'; instrument: TrackedInstrument; capture: JawCapture };

export function parseJawEngine(value: unknown): JawEngine {
  return value === 'classic' ? 'classic' : 'marker';
}

function insideConvex(point: Pixel, corners: Pixel[]) {
  let sign = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function grownQuad(corners: Pixel[]) {
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  return corners.map((p) => ({ x: cx + (p.x - cx) * MARKER_MASK_GROWTH, y: cy + (p.y - cy) * MARKER_MASK_GROWTH }));
}

const TEMPLATE = `
<div class="tracking-actions"><label>Jaw tracker <select data-jaw-engine>
 <option value="marker">White balls (new)</option>
 <option value="classic">Classic (previous)</option>
</select></label></div>
<div data-jaw-marker>
 <p class="tracking-message">Uses Camera 1 and two white balls. <strong>1.</strong> Hold the jaws closed, press <em>Calibrate closed</em>, click each ball in the camera image, then turn the instrument about 15–20° <em>slowly or in small steps with brief pauses</em>, keeping the jaws closed and the ring markers visible. <strong>2.</strong> Repeat with the jaws fully open. The balls can be anywhere on the jaws or handles, as long as at least one moves when the jaws open.</p>
 <div class="tracking-actions">
  <label>Instrument <select data-jaw-instrument>${INSTRUMENTS.map((name) => `<option value="${name}">${LABELS[name]}</option>`).join('')}</select></label>
  <label>Ball diameter (mm) <input data-jaw-diameter type="number" min="3" max="30" step="0.5" value="${DEFAULT_BALL_DIAMETER_MM}" style="width:5em"></label>
  <button type="button" data-jaw-capture="closed">Calibrate closed</button>
  <button type="button" data-jaw-capture="open">Calibrate open</button>
  <button type="button" data-jaw-cancel>Cancel</button>
  <button type="button" data-jaw-reset>Reset instrument</button>
 </div>
 <p class="tracking-message" role="status" data-jaw-status></p>
 <div class="tracking-message" data-jaw-readout>Not calibrated</div>
</div>`;

export function mountMarkerJaws(details: HTMLElement, host: MarkerJawHost) {
  const section = document.createElement('div');
  section.className = 'marker-jaw-tracking';
  section.innerHTML = TEMPLATE;
  details.querySelector('summary')?.after(section);
  const classicParts = Array.from(details.children).filter((child) => child !== section && child.tagName !== 'SUMMARY') as HTMLElement[];

  const $ = <T extends Element>(selector: string) => section.querySelector<T>(selector)!;
  const engineSelect = $<HTMLSelectElement>('[data-jaw-engine]');
  const markerPanel = $<HTMLElement>('[data-jaw-marker]');
  const instrumentSelect = $<HTMLSelectElement>('[data-jaw-instrument]');
  const diameterInput = $<HTMLInputElement>('[data-jaw-diameter]');
  const status = $<HTMLElement>('[data-jaw-status]');
  const readout = $<HTMLElement>('[data-jaw-readout]');
  instrumentSelect.value = 'needleDriver';

  // Drawing and click target, layered over the camera image.
  const canvas = document.createElement('canvas');
  canvas.id = 'marker-jaw-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:3';
  host.video.parentElement!.append(canvas);
  const context = canvas.getContext('2d')!;

  const crop = document.createElement('canvas');
  const cropContext = crop.getContext('2d', { willReadFrequently: true })!;

  let engine: JawEngine = parseJawEngine(readStored(TRACKING_STORAGE_KEYS.jawEngine));
  let mode: Mode = { kind: 'idle' };
  const captured = new Map<TrackedInstrument, Partial<Record<JawPose, ReturnType<JawCapture['solve']>>>>();
  const trackers = new Map<TrackedInstrument, JawTracker>();
  const poses = new Map<TrackedInstrument, PrismPose>();
  const readings = new Map<TrackedInstrument, JawReading>();
  /** Ball diameters measured at the closed/open clicks, mm. */
  const measuredDiameters = new Map<TrackedInstrument, Partial<Record<JawPose, number>>>();
  /** 3D ball distances sampled during the closed/open captures, and their medians. */
  const stereoSamples: number[] = [];
  const stereoCaptured = new Map<TrackedInstrument, Partial<Record<JawPose, number>>>();
  const stereoOpenings = new Map<TrackedInstrument, { opening: number; at: number }>();
  const trackerGeometryMarkerMm = () => trackerGeometry(host.trackerType()).markerSizeMm;
  let lastVideoTime = -1;
  let lastImageId=-1;
  let lastReadAt=-Infinity;

  const selected = () => instrumentSelect.value as TrackedInstrument;
  const diameter = () => {
    const value = Number(diameterInput.value);
    return value >= 3 && value <= 30 ? value : DEFAULT_BALL_DIAMETER_MM;
  };

  function loadModels() {
    trackers.clear();
    const saved = readStoredJson(TRACKING_STORAGE_KEYS.markerJawModels);
    if (!saved || typeof saved !== 'object') return;
    for (const name of INSTRUMENTS) {
      const model = parseJawModel((saved as Record<string, unknown>)[name], host.trackerType());
      if (model) trackers.set(name, new JawTracker(model));
    }
  }

  function saveModel(name: TrackedInstrument, model: JawModel | null) {
    const saved = readStoredJson(TRACKING_STORAGE_KEYS.markerJawModels);
    const all = saved && typeof saved === 'object' ? { ...(saved as Record<string, unknown>) } : {};
    if (model) all[name] = serializeJawModel(model, host.trackerType());
    else delete all[name];
    if (!writeStored(TRACKING_STORAGE_KEYS.markerJawModels, JSON.stringify(all))) {
      status.textContent += ' (Could not save in this browser; calibration lasts until reload.)';
    }
  }

  function applyEngine() {
    markerPanel.hidden = engine !== 'marker';
    for (const part of classicParts) part.hidden = engine === 'marker';
    canvas.style.display = engine === 'marker' ? '' : 'none';
    if (engine !== 'marker') cancel('');
  }

  function cancel(message: string) {
    mode = { kind: 'idle' };
    canvas.style.pointerEvents = 'none';
    if (message) status.textContent = message;
  }

  /** The tracker pose from this instrument's markers, solved independently of instrument tracking. */
  /** Why the last solvePose returned null, shown to the user when a click fails. */
  let poseFailure = '';
  function solvePose(name: TrackedInstrument, now: number): PrismPose | null {
    const type = host.trackerType();
    const first = host.firstMarkerId(name);
    const visible = host.markers(name, now);
    // Prefer side faces: on recorded frames they fit within ~1 px, while mixing
    // in an angled face sometimes adds ~5 px. Angled faces alone fit well
    // since the measured pad layout was corrected (build 0.85).
    const side = type === 'ring8' ? visible.filter((m) => m.id - first < RING_SIDE_FACES) : visible;
    const markers = side.length ? side : visible;
    if (!host.overlay.width) {
      poseFailure = 'Camera 1 is not running.';
      return null;
    }
    if (!markers.length) {
      poseFailure = `No ${LABELS[name].toLowerCase()} ring markers are visible to Camera 1.`;
      return null;
    }
    const pose = solvePrismPose(markers, first, host.overlay.width, host.overlay.height, poses.get(name), undefined, type);
    if (!pose || pose.error > MAX_POSE_ERROR_PX) {
      poseFailure = pose
        ? `The ring markers (IDs ${markers.map((m) => m.id).join(', ')}) don't fit the tracker model (${pose.error.toFixed(1)} px, limit ${MAX_POSE_ERROR_PX}). Try an angle showing one flat-side marker.`
        : 'The ring position could not be solved from the visible markers.';
      return null;
    }
    poseFailure = '';
    poses.set(name, pose);
    return pose;
  }

  /**
   * One grayscale copy of each camera's current frame, at overlay resolution.
   * Reading pixels back from a video is the expensive part of jaw tracking,
   * so it happens once per camera per frame; every search region is then cut
   * from this copy in JavaScript.
   */
  const frameCache = new Map<HTMLVideoElement, { id: number; image: GrayImage }>();
  function cameraGray(camera: { video: HTMLVideoElement; overlay: HTMLCanvasElement }): GrayImage | null {
    const { video, overlay } = camera;
    if (!video.videoWidth || !overlay.width) return null;
    const id = cameraImageId(video);
    const cached = frameCache.get(video);
    if (cached && cached.id === id && cached.image.width === overlay.width && cached.image.height === overlay.height) return cached.image;
    const { width, height } = overlay;
    if (crop.width !== width || crop.height !== height) {
      crop.width = width;
      crop.height = height;
    }
    cropContext.drawImage(cameraImage(video), 0, 0, width, height);
    const image = grayFromRGBA(cropContext.getImageData(0, 0, width, height).data, width, height);
    frameCache.set(video, { id, image });
    return image;
  }

  function sample(region: Region, camera: { video: HTMLVideoElement; overlay: HTMLCanvasElement } = host): SampledRegion | null {
    const frame = cameraGray(camera);
    if (!frame) return null;
    const x0 = Math.max(0, Math.floor(region.x));
    const y0 = Math.max(0, Math.floor(region.y));
    const x1 = Math.min(frame.width, Math.ceil(region.x + region.width));
    const y1 = Math.min(frame.height, Math.ceil(region.y + region.height));
    if (x1 - x0 < 4 || y1 - y0 < 4) return null;
    const width = x1 - x0;
    const data = new Uint8Array(width * (y1 - y0));
    for (let y = y0; y < y1; y++) data.set(frame.data.subarray(y * frame.width + x0, y * frame.width + x1), (y - y0) * width);
    return { image: { width, height: y1 - y0, data }, region: { x: x0, y: y0, width, height: y1 - y0 }, scale: 1 };
  }

  /** White-ball candidates near one camera's view of an instrument's ring, in that camera's overlay pixels. */
  function ballCandidates(camera: { video: HTMLVideoElement; overlay: HTMLCanvasElement }, markers: MarkerObservation[], diameterMm: number): Pixel[] {
    if (!markers.length) return [];
    const corners = markers.flatMap((m) => m.corners);
    const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
    const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
    const side = Math.max(...markers.map((m) => Math.hypot(m.corners[1].x - m.corners[0].x, m.corners[1].y - m.corners[0].y)));
    const half = side * STEREO_SEARCH_MARKER_SIDES;
    const region = sample({ x: cx - half, y: cy - half, width: half * 2, height: half * 2 }, camera);
    if (!region) return [];
    const { scale } = region;
    const mask = maskFromQuads(region.image.width, region.image.height,
      markers.map((m) => grownQuad(m.corners).map((p) => ({ x: (p.x - region.region.x) * scale, y: (p.y - region.region.y) * scale }))));
    // Ball radius from the marker's apparent size (12 mm square) and the ball diameter.
    const radius = (side * diameterMm) / 2 / trackerGeometryMarkerMm();
    return findBrightBalls(region.image, radius * scale, { mask, sizeFactors: [1, 0.6, 1.6] })
      .slice(0, MAX_STEREO_CANDIDATES)
      .map((ball) => ({ x: region.region.x + ball.x / scale, y: region.region.y + ball.y / scale }));
  }

  /**
   * 3D distance between the two jaw balls from both cameras, or null.
   * `known` gives camera-1 ball positions already being followed (during
   * calibration), and `range` the plausible spacing (during tracking), so
   * steel highlights or other bright spots cannot pair up by mistake.
   */
  const lastStereo = new Map<TrackedInstrument, { at: number; distance: number | null }>();
  function stereoDistance(name: TrackedInstrument, now: number, diameterMm: number, known?: readonly Pixel[], range?: { minMm: number; maxMm: number }): number | null {
    // At most ~15 times a second: it searches both cameras.
    const previous = lastStereo.get(name);
    if (previous && now - previous.at < STEREO_INTERVAL_MS) return previous.distance;
    const distance = measureStereoDistance(name, now, diameterMm, known, range);
    lastStereo.set(name, { at: now, distance });
    return distance;
  }
  function measureStereoDistance(name: TrackedInstrument, now: number, diameterMm: number, known?: readonly Pixel[], range?: { minMm: number; maxMm: number }): number | null {
    const calibration = host.stereoCalibration?.();
    const second = host.second;
    if (!calibration || !second || !second.video.videoWidth || !second.overlay.width) return null;
    const first = known ? [...known] : ballCandidates(host, host.markers(name, now), diameterMm);
    const other = ballCandidates(second, second.markers(name, now), diameterMm);
    if (first.length < 2 || other.length < 2) return null;
    const pair = stereoBallPair(calibration, first, other, host.overlay, second.overlay, undefined, range);
    return pair ? pair.distanceMm : null;
  }

  function frameFor(name: TrackedInstrument, now: number): JawFrame | null {
    const pose = solvePose(name, now);
    if (!pose) return null;
    const masks = host.markers(name, now).map((marker) => grownQuad(marker.corners));
    return {
      now,
      pose: { quaternion: pose.quaternion, translation: pose.translation },
      intrinsics: defaultIntrinsics(host.overlay.width, host.overlay.height),
      sample,
      ignore: masks.length ? (x, y) => masks.some((quad) => insideConvex({ x, y }, quad)) : undefined,
      ignoreQuads: masks,
    };
  }

  /** Snap clicks to the nearest bright ball, using the current frame. */
  /** Why the last snapSeeds returned null. */
  let snapFailure = '';
  /**
   * Snap clicks to the nearest bright ball and measure the balls' real size.
   * The size setting is only a starting guess: balls are searched over a wide
   * range of sizes, and the measured diameter (from each ball's apparent
   * radius and the ring's distance) is used from then on.
   */
  function snapSeeds(name: TrackedInstrument, seeds: Pixel[], now: number): { points: Pixel[]; diameterMm: number } | null {
    const frame = frameFor(name, now);
    if (!frame) {
      snapFailure = poseFailure || 'The ring markers are not visible.';
      return null;
    }
    const radius = ballRadiusPx(diameter(), frame.pose.translation.z, frame.intrinsics);
    const snapped: Pixel[] = [];
    const measured: number[] = [];
    for (const [index, seed] of seeds.entries()) {
      const half = radius * 3 + 12;
      const region = sample({ x: seed.x - half, y: seed.y - half, width: half * 2, height: half * 2 });
      if (!region) {
        snapFailure = `Click ${index + 1} is outside the camera image.`;
        return null;
      }
      const { scale } = region;
      const ignore = frame.ignore;
      let ball: { x: number; y: number; radius: number } | undefined;
      for (const sizeGuess of SNAP_SIZE_GUESSES) {
        ball = findBrightBalls(region.image, radius * sizeGuess * scale, {
          ignore: ignore ? (x, y) => ignore(region.region.x + x / scale, region.region.y + y / scale) : undefined,
        })
          .map((b) => ({ x: region.region.x + b.x / scale, y: region.region.y + b.y / scale, radius: b.radius / scale }))
          .filter((b) => Math.hypot(b.x - seed.x, b.y - seed.y) <= b.radius * 2.5 + 10)
          .sort((a, b) => Math.hypot(a.x - seed.x, a.y - seed.y) - Math.hypot(b.x - seed.x, b.y - seed.y))[0];
        if (ball) break;
      }
      if (!ball) {
        snapFailure = `No white ball found at click ${index + 1}. Click the center of the ball, against a darker background.`;
        return null;
      }
      snapped.push({ x: ball.x, y: ball.y });
      measured.push(diameter() * (ball.radius / radius));
    }
    const diameterMm = Math.min(30, Math.max(3, measured.reduce((sum, d) => sum + d, 0) / measured.length));
    return { points: snapped, diameterMm };
  }

  function finishCapture(name: TrackedInstrument, capture: JawCapture) {
    const result = capture.solve();
    const entry = captured.get(name) ?? {};
    entry[capture.jaw] = result;
    captured.set(name, entry);
    const distance = median(stereoSamples);
    stereoSamples.length = 0;
    if (distance !== null) stereoCaptured.set(name, { ...stereoCaptured.get(name), [capture.jaw]: distance });
    cancel('');
    if ('error' in result) {
      status.textContent = `${LABELS[name]} ${capture.jaw}: ${result.error}`;
      return;
    }
    const closed = entry.closed;
    const open = entry.open;
    if (closed && open && 'points' in closed && 'points' in open) {
      const captures = measuredDiameters.get(name) ?? {};
      const sizes = [captures.closed, captures.open].filter((d): d is number => d !== undefined);
      const model = buildJawModel(closed.points, open.points, sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : diameter());
      if ('error' in model) {
        status.textContent = `${LABELS[name]}: ${model.error}`;
        return;
      }
      const distances = stereoCaptured.get(name);
      if (distances?.closed !== undefined && distances.open !== undefined && Math.abs(distances.open - distances.closed) >= MIN_STEREO_SPAN_MM) {
        model.stereo = { closedMm: distances.closed, openMm: distances.open };
      }
      trackers.set(name, new JawTracker(model));
      saveModel(name, model);
      captured.delete(name);
      status.textContent = `${LABELS[name]} calibrated. Open and close the jaws to check the reading.`;
    } else {
      const next = capture.jaw === 'closed' ? 'open' : 'closed';
      status.textContent = `${LABELS[name]} ${capture.jaw} captured. Now hold the jaws ${next} and press Calibrate ${next}.`;
    }
  }

  section.querySelectorAll<HTMLButtonElement>('[data-jaw-capture]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!host.video.videoWidth) {
        status.textContent = 'Start Camera 1 first.';
        return;
      }
      const jaw = button.dataset.jawCapture as JawPose;
      mode = { kind: 'picking', instrument: selected(), jaw, seeds: [] };
      canvas.style.pointerEvents = 'auto';
      canvas.style.cursor = 'crosshair';
      status.textContent = `Jaws ${jaw}: click ball 1 of ${BALLS_PER_INSTRUMENT} in the camera image.`;
    });
  });
  $<HTMLButtonElement>('[data-jaw-cancel]').addEventListener('click', () => cancel('Cancelled.'));
  $<HTMLButtonElement>('[data-jaw-reset]').addEventListener('click', () => {
    const name = selected();
    trackers.delete(name);
    captured.delete(name);
    measuredDiameters.delete(name);
    saveModel(name, null);
    cancel(`${LABELS[name]} jaw calibration removed.`);
  });
  instrumentSelect.addEventListener('change', () => cancel(''));
  engineSelect.value = engine;
  engineSelect.addEventListener('change', () => {
    engine = parseJawEngine(engineSelect.value);
    writeStored(TRACKING_STORAGE_KEYS.jawEngine, engine);
    applyEngine();
  });

  canvas.addEventListener('click', (event) => {
    if (mode.kind !== 'picking') return;
    const rect = canvas.getBoundingClientRect();
    const fit = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const x = (event.clientX - rect.left - (rect.width - canvas.width * fit) / 2) / fit;
    const y = (event.clientY - rect.top - (rect.height - canvas.height * fit) / 2) / fit;
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    mode.seeds.push({ x, y });
    if (mode.seeds.length < BALLS_PER_INSTRUMENT) {
      status.textContent = `Jaws ${mode.jaw}: click ball ${mode.seeds.length + 1} of ${BALLS_PER_INSTRUMENT}.`;
      return;
    }
    const now = performance.now();
    const seeds = snapSeeds(mode.instrument, mode.seeds, now);
    if (!seeds) {
      const { instrument, jaw } = mode;
      mode = { kind: 'picking', instrument, jaw, seeds: [] };
      status.textContent = `${snapFailure} Click ball 1 again.`;
      return;
    }
    const instrument = mode.instrument;
    measuredDiameters.set(instrument, { ...measuredDiameters.get(instrument), [mode.jaw]: seeds.diameterMm });
    diameterInput.value = seeds.diameterMm.toFixed(1);
    mode = { kind: 'capturing', instrument, capture: new JawCapture(mode.jaw, seeds.points, seeds.diameterMm, now) };
    canvas.style.pointerEvents = 'none';
    status.textContent = 'Now turn the instrument slowly (or in small steps with pauses), keeping the jaws still…';
  });

  function draw() {
    if (canvas.width !== host.overlay.width || canvas.height !== host.overlay.height) {
      canvas.width = host.overlay.width;
      canvas.height = host.overlay.height;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (engine !== 'marker') return;
    context.lineWidth = 2;
    if (mode.kind === 'picking') {
      context.fillStyle = '#ffb000';
      for (const seed of mode.seeds) context.fillRect(seed.x - 3, seed.y - 3, 6, 6);
    }
    if (mode.kind === 'capturing') {
      context.strokeStyle = '#ffb000';
      for (const p of mode.capture.positions) {
        context.beginPath();
        context.arc(p.x, p.y, 8, 0, Math.PI * 2);
        context.stroke();
      }
    }
    const reading = readings.get(selected());
    if (!reading) return;
    for (const ball of reading.balls) {
      if (!ball.moving) continue;
      context.strokeStyle = 'rgba(200,200,200,.8)';
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(ball.closed.x, ball.closed.y);
      context.lineTo(ball.open.x, ball.open.y);
      context.stroke();
      context.setLineDash([]);
      if (ball.found) {
        context.strokeStyle = '#34d399';
        context.beginPath();
        context.arc(ball.found.x, ball.found.y, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }

  function describe(name: TrackedInstrument) {
    if (mode.kind === 'capturing' && mode.instrument === name) {
      const progress = mode.capture.progress;
      return (stereoSamples.length ? `Stereo ball distance ${median(stereoSamples)!.toFixed(1)} mm · ` : '') + `Capturing ${mode.capture.jaw}: ${Math.min(progress.samples, MIN_CAPTURE_SAMPLES)}/${MIN_CAPTURE_SAMPLES} frames · turned ${progress.spreadDeg.toFixed(0)}°/${MIN_CAPTURE_SPREAD_DEG}°`;
    }
    if (!trackers.has(name)) {
      const entry = captured.get(name);
      return entry?.closed && 'points' in entry.closed ? 'Closed captured; capture open next' : 'Not calibrated';
    }
    const reading = readings.get(name);
    const stereo = stereoOpenings.get(name);
    if (stereo && performance.now() - stereo.at < HOLD_MS) return `${Math.round(stereo.opening * 100)}% open · stereo 3D ball distance`;
    if (!reading || reading.opening === null) return 'Calibrated · balls or ring markers not visible';
    return `${Math.round(reading.opening * 100)}% open · ${Math.round(reading.confidence * 100)}% of moving balls seen`;
  }

  /** Call once per processed camera-1 frame. */
  function update(now: number) {
    if (engine !== 'marker' || !host.video.videoWidth || host.video.paused) {
      if (engine === 'marker') draw();
      return;
    }
    if (host.video.currentTime === lastVideoTime) return;
    lastVideoTime = host.video.currentTime;
    lastImageId=cameraImageId(host.video);
    lastReadAt=now;

    if (mode.kind === 'capturing') {
      const frame = frameFor(mode.instrument, now);
      const distance = stereoDistance(mode.instrument, now, mode.capture.ballDiameterMm, mode.capture.positions);
      if (distance !== null) stereoSamples.push(distance);
      if (frame) {
        const progress = mode.capture.update(frame);
        if (progress.failed) {
          status.textContent = progress.failed;
          cancel('');
        } else if (progress.ready) finishCapture(mode.instrument, mode.capture);
      }
    }
    for (const [name, tracker] of trackers) {
      if (mode.kind === 'capturing' && mode.instrument === name) continue;
      // Stereo: the 3D distance between the balls, independent of the ring pose.
      const stereo = tracker.model.stereo;
      const distance = stereo ? stereoDistance(name, now, tracker.model.ballDiameterMm, undefined, expectedSpacing(tracker.model.balls) ?? undefined) : null;
      let published = false;
      if (stereo && distance !== null) {
        const raw = openingFromDistance(distance, stereo.closedMm, stereo.openMm);
        const previous = stereoOpenings.get(name);
        const opening = previous && now - previous.at < HOLD_MS ? previous.opening + (raw - previous.opening) * SMOOTHING : raw;
        stereoOpenings.set(name, { opening, at: now });
        host.publish(name, opening);
        published = true;
      }
      // Otherwise (single camera, or a ball hidden in one camera): ring-relative tracking.
      const frame = frameFor(name, now);
      if (!frame) {
        readings.delete(name);
        continue;
      }
      const reading = tracker.update(frame);
      readings.set(name, reading);
      if (!published && reading.opening !== null) host.publish(name, reading.opening);
    }
    readout.textContent = describe(selected());
    draw();
  }

  /** Recompute after a tracker geometry change (saved models are per geometry). */
  function reloadModels() {
    loadModels();
    poses.clear();
    readings.clear();
  }

  loadModels();
  applyEngine();
  return {
    update,
    reloadModels,
    /** Read-only diagnostics; held readings cannot masquerade as new image detections. */
    snapshot(now=performance.now()):MarkerJawSnapshot {
      return {current:engine==='marker'&&!host.video.paused&&now-lastReadAt<220&&lastImageId===cameraImageId(host.video),width:host.overlay.width,height:host.overlay.height,readings:structuredClone([...readings].map(([instrument,reading])=>({instrument,reading})))};
    },
    /** Whether the classic jaw tracker should run. */
    classicActive: () => engine === 'classic',
  };
}
