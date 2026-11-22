import { BleHallSensorSource, knownHallDevice, webBluetooth, type BluetoothDeviceLike } from '../input/BleHallSensorSource';
import { HallJawMapper, type HallCalibration, type HallInstrument } from '../input/HallJawInput';
import { readStoredJson, writeStored } from '../input/trackingStorage';
import { sweepCalibration } from '../input/hallCalibrationSweep';

/**
 * Bluetooth jaw sensor panel (2026-11-21; two sensors since 2026-11-22). Each slot
 * connects one Hall-sensor board, names the instrument it is on, and is calibrated with
 * one closed and one open reading. Openings are sent like the former camera jaw
 * openings. Synthetic browser test only (fake Bluetooth devices).
 */
export const HALL_SETTINGS_KEY = 'suturehero.hallJaw.v2';
/** Single-sensor settings from build 0.204; migrated into the first slot. */
export const LEGACY_HALL_SETTINGS_KEY = 'suturehero.hallJaw.v1';
/** How many sensor boards the panel can use at once. */
export const HALL_SENSOR_SLOTS = 2;
/** With "Add a third sensor" (scissors or a spare board). */
export const MAX_HALL_SENSOR_SLOTS = 3;
/** Length of the guided calibration sweep (ms). */
export const CALIBRATION_SWEEP_MS = 5000;
/** Seconds of readings shown in each sensor's graph. */
const GRAPH_SECONDS = 5;
/** Smallest closed–open raw difference accepted as a calibration (12-bit units). */
export const MIN_CALIBRATION_SPAN = 40;
/** How often the live reading text refreshes (ms). */
const DISPLAY_INTERVAL_MS = 150;
/** Wait between attempts to reconnect a remembered board that dropped out or is not in range yet (ms). */
export const RECONNECT_INTERVAL_MS = 4000;
/** Battery level at or below which the panel suggests charging (%). */
const LOW_BATTERY_PERCENT = 15;

const INSTRUMENTS: Array<[HallInstrument, string]> = [['needleDriver', 'Needle driver'], ['forceps', 'Forceps'], ['scissors', 'Scissors']];
/** Instrument each slot starts on: the needle driver, then the forceps. */
const DEFAULT_INSTRUMENTS: HallInstrument[] = ['needleDriver', 'forceps', 'scissors'];

export interface HallSettings {
  instrument: HallInstrument;
  closed: number | null;
  open: number | null;
  /** Chrome's id for the board last connected in this slot, to reconnect without the chooser. */
  deviceId?: string;
}

const isInstrument = (value: unknown): value is HallInstrument => INSTRUMENTS.some(([id]) => id === value);
const rawOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const instrumentLabel = (instrument: HallInstrument) => INSTRUMENTS.find(([id]) => id === instrument)![1];

/** One slot's saved settings, with defaults for anything missing or invalid. */
export function parseHallSettings(data: unknown, defaultInstrument: HallInstrument = 'needleDriver'): HallSettings {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const settings: HallSettings = {
    instrument: isInstrument(record.instrument) ? record.instrument : defaultInstrument,
    closed: rawOrNull(record.closed),
    open: rawOrNull(record.open),
  };
  if (typeof record.deviceId === 'string' && record.deviceId) settings.deviceId = record.deviceId;
  return settings;
}

/**
 * All slots' settings from the current key, or from the single-sensor key of build 0.204
 * (which becomes the first slot), with defaults for the rest.
 */
export function parseAllHallSettings(current: unknown, legacy: unknown): HallSettings[] {
  const saved = current && typeof current === 'object' && Array.isArray((current as { sensors?: unknown }).sensors)
    ? (current as { sensors: unknown[] }).sensors
    : legacy ? [legacy] : [];
  const slots = Math.min(MAX_HALL_SENSOR_SLOTS, Math.max(HALL_SENSOR_SLOTS, saved.length));
  return DEFAULT_INSTRUMENTS.slice(0, slots).map((instrument, slot) => parseHallSettings(saved[slot], instrument));
}

/** The calibration, or null until both readings are set and far enough apart. */
export function hallCalibration(settings: HallSettings): HallCalibration | null {
  if (settings.closed === null || settings.open === null) return null;
  if (Math.abs(settings.open - settings.closed) < MIN_CALIBRATION_SPAN) return null;
  return { closed: settings.closed, open: settings.open };
}

/** Instruments assigned to more than one slot (their jaws would fight). */
export function duplicateInstruments(all: HallSettings[]): HallInstrument[] {
  return INSTRUMENTS.map(([id]) => id).filter((id) => all.filter((settings) => settings.instrument === id).length > 1);
}

export function mountHallSensorPanel(host: HTMLElement, onOpening: (instrument: HallInstrument, opening: number) => void) {
  const all = parseAllHallSettings(readStoredJson(HALL_SETTINGS_KEY), readStoredJson(LEGACY_HALL_SETTINGS_KEY));
  const save = () => writeStored(HALL_SETTINGS_KEY, JSON.stringify({ sensors: all }));
  const panel = document.createElement('details');
  panel.className = 'tracking-details hall-sensor-panel';
  panel.open = true;
  panel.innerHTML = `<summary>Jaw sensors (Bluetooth)</summary><div class="tracking-details-body">
<p>Each Hall-sensor board measures one instrument's jaw opening. Needs Chrome or Edge on a computer. Give each board its own name in its firmware (for example "SutureHero Jaw" and "SutureHero Jaw 2") to tell them apart when connecting.</p>
<p data-hall-warning class="tracking-message" role="alert" hidden></p></div>`;
  host.append(panel);
  const body = panel.querySelector<HTMLElement>('.tracking-details-body')!;
  const warning = panel.querySelector<HTMLElement>('[data-hall-warning]')!;
  const checkDuplicates = () => {
    const duplicates = duplicateInstruments(all);
    warning.hidden = !duplicates.length;
    warning.textContent = duplicates.length ? `Two sensors are set to ${duplicates.map(instrumentLabel).join(', ')} · choose a different instrument for one of them` : '';
  };
  const changed = () => { save(); checkDuplicates(); };
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = 'Add a third sensor';
  addButton.dataset.hallAdd = '';
  for (let slot = 0; slot < all.length; slot++) body.append(mountSensorSlot(slot, all[slot], changed, onOpening));
  addButton.hidden = all.length >= MAX_HALL_SENSOR_SLOTS;
  addButton.addEventListener('click', () => {
    if (all.length >= MAX_HALL_SENSOR_SLOTS) return;
    const slot = all.length;
    all.push(parseHallSettings(undefined, DEFAULT_INSTRUMENTS[slot]));
    addButton.before(mountSensorSlot(slot, all[slot], changed, onOpening));
    addButton.hidden = all.length >= MAX_HALL_SENSOR_SLOTS;
    changed();
  });
  body.append(addButton);
  checkDuplicates();
  return panel;
}

function mountSensorSlot(slot: number, settings: HallSettings, saved: () => void, onOpening: (instrument: HallInstrument, opening: number) => void) {
  const section = document.createElement('fieldset');
  section.className = 'hall-sensor-slot';
  section.dataset.hallSlot = String(slot + 1);
  section.innerHTML = `<legend>Sensor ${slot + 1}</legend>
<label>Sensor is on <select data-hall-instrument>${INSTRUMENTS.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
<p><button type="button" data-hall-connect>Connect sensor ${slot + 1}</button></p>
<p data-hall-reading role="status">Not connected</p>
<p><button type="button" data-hall-sweep disabled>Calibrate (guided)</button></p>
<canvas data-hall-graph width="320" height="70" aria-label="Sensor ${slot + 1} readings, last ${GRAPH_SECONDS} seconds"></canvas>
<details><summary>Set closed and open by hand</summary><p><button type="button" data-hall-closed disabled>Set closed (jaws shut)</button> <button type="button" data-hall-open disabled>Set open (jaws fully open)</button></p></details>
<p data-hall-calibration></p>`;
  const instrumentSelect = section.querySelector<HTMLSelectElement>('[data-hall-instrument]')!;
  const connectButton = section.querySelector<HTMLButtonElement>('[data-hall-connect]')!;
  const reading = section.querySelector<HTMLElement>('[data-hall-reading]')!;
  const closedButton = section.querySelector<HTMLButtonElement>('[data-hall-closed]')!;
  const openButton = section.querySelector<HTMLButtonElement>('[data-hall-open]')!;
  const calibrationNote = section.querySelector<HTMLElement>('[data-hall-calibration]')!;
  const sweepButton = section.querySelector<HTMLButtonElement>('[data-hall-sweep]')!;
  const graph = section.querySelector<HTMLCanvasElement>('[data-hall-graph]')!;
  instrumentSelect.value = settings.instrument;

  let latestRaw: number | null = null;
  let latestOpening: number | null = null;
  let mapper: HallJawMapper | null = null;
  let source: BleHallSensorSource | null = null;
  let lastDisplay = 0;

  const rebuildMapper = () => {
    const calibration = hallCalibration(settings);
    mapper = calibration ? new HallJawMapper(settings.instrument, calibration) : null;
    latestOpening = null;
  };
  const describeCalibration = () => {
    const calibration = hallCalibration(settings);
    if (calibration) calibrationNote.textContent = `Calibrated · closed ${calibration.closed} · open ${calibration.open}`;
    else if (settings.closed !== null && settings.open !== null) calibrationNote.textContent = `Closed and open readings are too close (${settings.closed} vs ${settings.open}) · move the magnet nearer the sensor and set both again`;
    else calibrationNote.textContent = 'Not calibrated · set closed and open';
  };
  const showReading = () => {
    if (latestRaw === null) return;
    const name = source ? `${source.deviceName} · ` : '';
    const battery = source?.batteryPercent ?? null;
    reading.textContent = `Connected · ${name}raw ${latestRaw}` + (latestOpening === null ? '' : ` · opening ${Math.round(latestOpening * 100)}%`) + (battery === null ? '' : ` · battery ${battery}%${battery <= LOW_BATTERY_PERCENT ? ' (low · charge soon)' : ''}`);
  };
  const setConnected = (connected: boolean) => {
    connectButton.textContent = connected ? `Disconnect sensor ${slot + 1}` : wanted ? `Stop reconnecting sensor ${slot + 1}` : `Connect sensor ${slot + 1}`;
    closedButton.disabled = !connected;
    openButton.disabled = !connected;
    sweepButton.disabled = !connected;
    if (!connected) {
      latestRaw = null;
      reading.textContent = 'Not connected';
    }
  };

  instrumentSelect.addEventListener('change', () => {
    settings.instrument = isInstrument(instrumentSelect.value) ? instrumentSelect.value : DEFAULT_INSTRUMENTS[slot];
    saved();
    rebuildMapper();
  });
  const calibrate = (side: 'closed' | 'open') => {
    if (latestRaw === null) return;
    settings[side] = latestRaw;
    saved();
    rebuildMapper();
    describeCalibration();
  };
  closedButton.addEventListener('click', () => calibrate('closed'));
  openButton.addEventListener('click', () => calibrate('open'));

  // Recent readings for the graph, and the guided sweep's readings while it runs.
  const history: { at: number; raw: number }[] = [];
  let sweep: number[] | null = null;
  const drawGraph = () => {
    const context = graph.getContext('2d');
    if (!context) return;
    const now = performance.now();
    while (history.length && now - history[0].at > GRAPH_SECONDS * 1000) history.shift();
    const { width, height } = graph;
    context.clearRect(0, 0, width, height);
    const calibration = hallCalibration(settings);
    const values = [...history.map((h) => h.raw), ...(calibration ? [calibration.closed, calibration.open] : [])];
    if (!values.length) return;
    const pad = 30;
    const low = Math.min(...values) - pad, high = Math.max(...values) + pad;
    const y = (raw: number) => height - ((raw - low) / (high - low)) * height;
    if (calibration) {
      for (const [raw, label] of [[calibration.closed, 'closed'], [calibration.open, 'open']] as const) {
        context.strokeStyle = '#8a8f98';
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(0, y(raw));
        context.lineTo(width, y(raw));
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = '#8a8f98';
        context.fillText(label, 4, Math.min(height - 2, Math.max(10, y(raw) - 3)));
      }
    }
    context.strokeStyle = '#2f9e6f';
    context.lineWidth = 2;
    context.beginPath();
    history.forEach((h, i) => {
      const x = width - ((now - h.at) / (GRAPH_SECONDS * 1000)) * width;
      if (i) context.lineTo(x, y(h.raw)); else context.moveTo(x, y(h.raw));
    });
    context.stroke();
  };
  sweepButton.addEventListener('click', () => {
    if (sweep) return;
    sweep = [];
    sweepButton.disabled = true;
    const started = performance.now();
    const prompt = () => {
      if (!sweep) return;
      const elapsed = performance.now() - started;
      if (elapsed >= CALIBRATION_SWEEP_MS) {
        const result = sweepCalibration(sweep, MIN_CALIBRATION_SPAN);
        sweep = null;
        sweepButton.disabled = !source;
        if (result.ok) {
          settings.closed = result.calibration.closed;
          settings.open = result.calibration.open;
          saved();
          rebuildMapper();
          describeCalibration();
        } else {
          calibrationNote.textContent = `Calibration not changed · ${result.reason}`;
        }
        return;
      }
      const seconds = Math.ceil((CALIBRATION_SWEEP_MS - elapsed) / 1000);
      calibrationNote.textContent = elapsed < CALIBRATION_SWEEP_MS * 0.15
        ? 'Hold the jaws fully closed…'
        : `Now open and close the jaws fully, 2–3 times · ${seconds} s`;
      window.setTimeout(prompt, 100);
    };
    prompt();
  });

  let wanted = false;
  /** The board last connected in this slot this session (reconnects even where Chrome cannot list remembered devices). */
  let lastDevice: BluetoothDeviceLike | null = null;
  let reconnectTimer: number | undefined;
  const onSample = (sample: { instrument: HallInstrument; raw: number; at: number }) => {
    latestRaw = sample.raw;
    history.push({ at: performance.now(), raw: sample.raw });
    sweep?.push(sample.raw);
    const value = mapper?.update(sample);
    if (value) {
      latestOpening = value.openness;
      onOpening(value.instrument, value.openness);
    }
    if (performance.now() - lastDisplay > DISPLAY_INTERVAL_MS) {
      lastDisplay = performance.now();
      showReading();
      drawGraph();
    }
  };
  const scheduleReconnect = () => {
    window.clearTimeout(reconnectTimer);
    if (wanted && !source) reconnectTimer = window.setTimeout(() => void reconnect(), RECONNECT_INTERVAL_MS);
  };
  /** Connect to `device`, or let the user choose one when it is not given. */
  const connect = async (device?: BluetoothDeviceLike) => {
    const next = new BleHallSensorSource(() => settings.instrument, () => {
      if (source !== next) return;
      source = null;
      setConnected(false);
      reading.textContent = `Sensor ${slot + 1} dropped out · reconnecting when it is back (check its battery)`;
      scheduleReconnect();
    });
    // Board time restarts when it resets, so each connection gets a fresh filter.
    rebuildMapper();
    try {
      if (device) await next.startWith(device, onSample);
      else await next.start(onSample);
    } catch (error) {
      next.stop();
      throw error;
    }
    source = next;
    wanted = true;
    lastDevice = device ?? next.device;
    setConnected(true);
    reading.textContent = `Connected · ${next.deviceName} · waiting for readings…`;
    if (next.deviceId && next.deviceId !== settings.deviceId) {
      settings.deviceId = next.deviceId;
      saved();
    }
  };
  /** Quietly reconnect to the remembered board; keep trying while it is wanted. */
  const reconnect = async () => {
    if (source || !wanted) return;
    const device = lastDevice ?? await knownHallDevice(settings.deviceId);
    if (!device) {
      reading.textContent = `Sensor ${slot + 1} not remembered by this browser · click Connect sensor ${slot + 1}`;
      wanted = false;
      return;
    }
    reading.textContent = `Reconnecting to ${device.name ?? 'the jaw sensor'}…`;
    try {
      await connect(device);
    } catch {
      reading.textContent = `Waiting for ${device.name ?? 'the jaw sensor'} · switched on and in range?`;
      scheduleReconnect();
    }
  };

  connectButton.addEventListener('click', async () => {
    window.clearTimeout(reconnectTimer);
    if (source || wanted) {
      wanted = false;
      source?.stop();
      source = null;
      setConnected(false);
      return;
    }
    if (!webBluetooth()) {
      reading.textContent = 'This browser has no Bluetooth support · use Chrome or Edge on a computer';
      return;
    }
    connectButton.disabled = true;
    reading.textContent = `Choose the board for sensor ${slot + 1} in the Chrome window…`;
    try {
      await connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reading.textContent = /cancel/i.test(message) ? 'Not connected' : `Could not connect: ${message}`;
    } finally {
      connectButton.disabled = false;
    }
  });

  // A board connected here before reconnects by itself when the page opens.
  if (settings.deviceId && webBluetooth()?.getDevices) {
    wanted = true;
    setConnected(false);
    void reconnect();
  }

  rebuildMapper();
  describeCalibration();
  return section;
}
