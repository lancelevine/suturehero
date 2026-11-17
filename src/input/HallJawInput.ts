export type HallInstrument = 'needleDriver' | 'forceps' | 'scissors';

export interface HallReading { instrument: HallInstrument; raw: number; at: number }
export interface HallCalibration { closed: number; open: number }
export interface HallJawValue { instrument: HallInstrument; openness: number; raw: number; at: number }
export type HallReadingListener = (reading: HallReading) => void;

/** Hardware/protocol boundary. USB serial, WebHID, Bluetooth, and tests can implement this. */
export interface HallSensorSource {
  start(listener: HallReadingListener): void | Promise<void>;
  stop(): void | Promise<void>;
}

const FILTER_TIME_MS = 30;

export class HallJawMapper {
  private value: HallJawValue | null = null;
  constructor(readonly instrument: HallInstrument, private calibration: HallCalibration) {}

  recalibrate(calibration: HallCalibration) { this.calibration = calibration; this.value = null; }

  update(reading: HallReading): HallJawValue | null {
    if (reading.instrument !== this.instrument || !Number.isFinite(reading.raw) || !Number.isFinite(reading.at)) return null;
    if (this.value && reading.at <= this.value.at) return this.value;
    const span = this.calibration.open - this.calibration.closed;
    if (!Number.isFinite(span) || Math.abs(span) < 1e-6) return null;
    const measured = Math.max(0, Math.min(1, (reading.raw - this.calibration.closed) / span));
    const dt = this.value ? Math.min(250, reading.at - this.value.at) : Infinity;
    const alpha = this.value ? 1 - Math.exp(-dt / FILTER_TIME_MS) : 1;
    const openness = this.value ? this.value.openness + (measured - this.value.openness) * alpha : measured;
    this.value = { instrument: this.instrument, openness, raw: reading.raw, at: reading.at };
    return { ...this.value };
  }

  current() { return this.value ? { ...this.value } : null; }
}

/** Routes one multi-channel source into calibrated, normalized instrument jaw values. */
export class HallJawInput {
  private mappers = new Map<HallInstrument, HallJawMapper>();
  private listeners = new Set<(value: HallJawValue) => void>();
  constructor(private source: HallSensorSource, calibrations: Partial<Record<HallInstrument, HallCalibration>>) {
    for (const [instrument, calibration] of Object.entries(calibrations) as Array<[HallInstrument, HallCalibration]>) this.mappers.set(instrument, new HallJawMapper(instrument, calibration));
  }
  async start() { await this.source.start((reading) => { const value = this.mappers.get(reading.instrument)?.update(reading); if (value) for (const listener of this.listeners) listener(value); }); }
  async stop() { await this.source.stop(); }
  subscribe(listener: (value: HallJawValue) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  value(instrument: HallInstrument) { return this.mappers.get(instrument)?.current() ?? null; }
  recalibrate(instrument: HallInstrument, calibration: HallCalibration) {
    const mapper = this.mappers.get(instrument);
    if (mapper) mapper.recalibrate(calibration); else this.mappers.set(instrument, new HallJawMapper(instrument, calibration));
  }
}

/** Deterministic source for UI, mapping, and future replay tests without hardware. */
export class SyntheticHallSensorSource implements HallSensorSource {
  private listener: HallReadingListener | null = null;
  start(listener: HallReadingListener) { this.listener = listener; }
  stop() { this.listener = null; }
  emit(instrument: HallInstrument, raw: number, at: number) { this.listener?.({ instrument, raw, at }); }
}
