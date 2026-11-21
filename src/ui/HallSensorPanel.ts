import { BleHallSensorSource, webBluetooth } from '../input/BleHallSensorSource';
import { HallJawMapper, type HallCalibration, type HallInstrument } from '../input/HallJawInput';
import { readStoredJson, writeStored } from '../input/trackingStorage';

/**
 * Bluetooth jaw sensor panel (2026-11-21): connect the Hall-sensor board, choose the
 * instrument it is on, and calibrate with one closed and one open reading. The
 * opening is sent like a camera-measured jaw opening. Untested with real hardware.
 */
export const HALL_SETTINGS_KEY = 'suturehero.hallJaw.v1';
/** Smallest closed–open raw difference accepted as a calibration (12-bit units). */
export const MIN_CALIBRATION_SPAN = 40;
/** How often the live reading text refreshes (ms). */
const DISPLAY_INTERVAL_MS = 150;

const INSTRUMENTS: Array<[HallInstrument, string]> = [['needleDriver', 'Needle driver'], ['forceps', 'Forceps'], ['scissors', 'Scissors']];

export interface HallSettings { instrument: HallInstrument; closed: number | null; open: number | null }

const isInstrument = (value: unknown): value is HallInstrument => INSTRUMENTS.some(([id]) => id === value);
const rawOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Saved settings, with defaults for anything missing or invalid. */
export function parseHallSettings(data: unknown): HallSettings {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    instrument: isInstrument(record.instrument) ? record.instrument : 'needleDriver',
    closed: rawOrNull(record.closed),
    open: rawOrNull(record.open),
  };
}

/** The calibration, or null until both readings are set and far enough apart. */
export function hallCalibration(settings: HallSettings): HallCalibration | null {
  if (settings.closed === null || settings.open === null) return null;
  if (Math.abs(settings.open - settings.closed) < MIN_CALIBRATION_SPAN) return null;
  return { closed: settings.closed, open: settings.open };
}

export function mountHallSensorPanel(host: HTMLElement, onOpening: (instrument: HallInstrument, opening: number) => void) {
  const settings = parseHallSettings(readStoredJson(HALL_SETTINGS_KEY));
  const panel = document.createElement('details');
  panel.className = 'tracking-details hall-sensor-panel';
  panel.innerHTML = `<summary>Jaw sensor (Bluetooth)</summary><div class="tracking-details-body">
<p>A Hall-sensor board on one instrument measures its jaw opening. Needs Chrome or Edge on a computer.</p>
<label>Sensor is on <select data-hall-instrument>${INSTRUMENTS.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
<p><button type="button" data-hall-connect>Connect sensor</button></p>
<p data-hall-reading role="status">Not connected</p>
<p><button type="button" data-hall-closed disabled>Set closed (jaws shut)</button> <button type="button" data-hall-open disabled>Set open (jaws fully open)</button></p>
<p data-hall-calibration></p></div>`;
  host.append(panel);
  const instrumentSelect = panel.querySelector<HTMLSelectElement>('[data-hall-instrument]')!;
  const connectButton = panel.querySelector<HTMLButtonElement>('[data-hall-connect]')!;
  const reading = panel.querySelector<HTMLElement>('[data-hall-reading]')!;
  const closedButton = panel.querySelector<HTMLButtonElement>('[data-hall-closed]')!;
  const openButton = panel.querySelector<HTMLButtonElement>('[data-hall-open]')!;
  const calibrationNote = panel.querySelector<HTMLElement>('[data-hall-calibration]')!;
  instrumentSelect.value = settings.instrument;

  let latestRaw: number | null = null;
  let latestOpening: number | null = null;
  let mapper: HallJawMapper | null = null;
  let source: BleHallSensorSource | null = null;
  let lastDisplay = 0;

  const save = () => writeStored(HALL_SETTINGS_KEY, JSON.stringify(settings));
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
    reading.textContent = `Connected · raw ${latestRaw}` + (latestOpening === null ? '' : ` · opening ${Math.round(latestOpening * 100)}%`);
  };
  const setConnected = (connected: boolean) => {
    connectButton.textContent = connected ? 'Disconnect' : 'Connect sensor';
    closedButton.disabled = !connected;
    openButton.disabled = !connected;
    if (!connected) {
      latestRaw = null;
      reading.textContent = 'Not connected';
    }
  };

  instrumentSelect.addEventListener('change', () => {
    settings.instrument = isInstrument(instrumentSelect.value) ? instrumentSelect.value : 'needleDriver';
    save();
    rebuildMapper();
  });
  const calibrate = (side: 'closed' | 'open') => {
    if (latestRaw === null) return;
    settings[side] = latestRaw;
    save();
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
    reading.textContent = 'Choose "SutureHero Jaw" in the Chrome window…';
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
      reading.textContent = 'Connected · waiting for readings…';
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
  return panel;
}
