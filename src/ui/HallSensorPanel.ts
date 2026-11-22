import { BleHallSensorSource, webBluetooth } from '../input/BleHallSensorSource';
import { HallJawMapper, type HallCalibration, type HallInstrument } from '../input/HallJawInput';
import { readStoredJson, writeStored } from '../input/trackingStorage';

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
/** Smallest closed–open raw difference accepted as a calibration (12-bit units). */
export const MIN_CALIBRATION_SPAN = 40;
/** How often the live reading text refreshes (ms). */
const DISPLAY_INTERVAL_MS = 150;

const INSTRUMENTS: Array<[HallInstrument, string]> = [['needleDriver', 'Needle driver'], ['forceps', 'Forceps'], ['scissors', 'Scissors']];
/** Instrument each slot starts on: the needle driver, then the forceps. */
const DEFAULT_INSTRUMENTS: HallInstrument[] = ['needleDriver', 'forceps'];

export interface HallSettings { instrument: HallInstrument; closed: number | null; open: number | null }

const isInstrument = (value: unknown): value is HallInstrument => INSTRUMENTS.some(([id]) => id === value);
const rawOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const instrumentLabel = (instrument: HallInstrument) => INSTRUMENTS.find(([id]) => id === instrument)![1];

/** One slot's saved settings, with defaults for anything missing or invalid. */
export function parseHallSettings(data: unknown, defaultInstrument: HallInstrument = 'needleDriver'): HallSettings {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    instrument: isInstrument(record.instrument) ? record.instrument : defaultInstrument,
    closed: rawOrNull(record.closed),
    open: rawOrNull(record.open),
  };
}

/**
 * All slots' settings from the current key, or from the single-sensor key of build 0.204
 * (which becomes the first slot), with defaults for the rest.
 */
export function parseAllHallSettings(current: unknown, legacy: unknown): HallSettings[] {
  const saved = current && typeof current === 'object' && Array.isArray((current as { sensors?: unknown }).sensors)
    ? (current as { sensors: unknown[] }).sensors
    : legacy ? [legacy] : [];
  return DEFAULT_INSTRUMENTS.map((instrument, slot) => parseHallSettings(saved[slot], instrument));
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
    warning.textContent = duplicates.length ? `Both sensors are set to ${duplicates.map(instrumentLabel).join(', ')} · choose a different instrument for one of them` : '';
  };
  for (let slot = 0; slot < HALL_SENSOR_SLOTS; slot++) {
    body.append(mountSensorSlot(slot, all[slot], () => { save(); checkDuplicates(); }, onOpening));
  }
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
<p><button type="button" data-hall-closed disabled>Set closed (jaws shut)</button> <button type="button" data-hall-open disabled>Set open (jaws fully open)</button></p>
<p data-hall-calibration></p>`;
  const instrumentSelect = section.querySelector<HTMLSelectElement>('[data-hall-instrument]')!;
  const connectButton = section.querySelector<HTMLButtonElement>('[data-hall-connect]')!;
  const reading = section.querySelector<HTMLElement>('[data-hall-reading]')!;
  const closedButton = section.querySelector<HTMLButtonElement>('[data-hall-closed]')!;
  const openButton = section.querySelector<HTMLButtonElement>('[data-hall-open]')!;
  const calibrationNote = section.querySelector<HTMLElement>('[data-hall-calibration]')!;
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
    reading.textContent = `Connected · ${name}raw ${latestRaw}` + (latestOpening === null ? '' : ` · opening ${Math.round(latestOpening * 100)}%`);
  };
  const setConnected = (connected: boolean) => {
    connectButton.textContent = connected ? `Disconnect sensor ${slot + 1}` : `Connect sensor ${slot + 1}`;
    closedButton.disabled = !connected;
    openButton.disabled = !connected;
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

  connectButton.addEventListener('click', async () => {
    if (source) {
      source.stop();
      source = null;
      setConnected(false);
      return;
    }
    if (!webBluetooth()) {
      reading.textContent = 'This browser has no Bluetooth support · use Chrome or Edge on a computer';
      return;
    }
    const next = new BleHallSensorSource(() => settings.instrument, () => {
      if (source !== next) return;
      source = null;
      setConnected(false);
      reading.textContent = 'Sensor disconnected · check its battery, then connect again';
    });
    connectButton.disabled = true;
    reading.textContent = `Choose the board for sensor ${slot + 1} in the Chrome window…`;
    try {
      // Board time restarts when it resets, so each connection gets a fresh filter.
      rebuildMapper();
      await next.start((sample) => {
        latestRaw = sample.raw;
        const value = mapper?.update(sample);
        if (value) {
          latestOpening = value.openness;
          onOpening(value.instrument, value.openness);
        }
        if (performance.now() - lastDisplay > DISPLAY_INTERVAL_MS) {
          lastDisplay = performance.now();
          showReading();
        }
      });
      source = next;
      setConnected(true);
      reading.textContent = `Connected · ${next.deviceName} · waiting for readings…`;
    } catch (error) {
      next.stop();
      const message = error instanceof Error ? error.message : String(error);
      reading.textContent = /cancel/i.test(message) ? 'Not connected' : `Could not connect: ${message}`;
    } finally {
      connectButton.disabled = false;
    }
  });

  rebuildMapper();
  describeCalibration();
  return section;
}
