import type { HallInstrument, HallReadingListener, HallSensorSource } from './HallJawInput';

/**
 * Web Bluetooth source for the SutureHero jaw sensor (firmware/hall-jaw/hall-jaw.ino):
 * a Seeed XIAO nRF52840 reading an OH49E/SS49E linear Hall sensor. Chrome or Edge on a
 * computer or Android only; Safari (iPhone) has no Web Bluetooth.
 */
export const HALL_SERVICE_UUID = '5a1e0001-8f6c-4b8e-9d2a-3c4b5e6f7a80';
export const HALL_READING_UUID = '5a1e0002-8f6c-4b8e-9d2a-3c4b5e6f7a80';
export const HALL_DEVICE_NAME = 'SutureHero Jaw';
/** Bytes per notification: raw uint16 + board time uint32, little-endian. */
export const HALL_PACKET_BYTES = 6;
/** Highest raw value of the board's 12-bit analog input. */
export const HALL_RAW_MAX = 4095;
/** Standard Bluetooth battery service and level (percent) characteristic. */
export const BATTERY_SERVICE = 'battery_service';
export const BATTERY_LEVEL = 'battery_level';

export interface HallPacket { raw: number; boardMs: number }

/** Decodes one notification, or null if it is not a valid packet. */
export function parseHallPacket(view: DataView): HallPacket | null {
  if (view.byteLength !== HALL_PACKET_BYTES) return null;
  const raw = view.getUint16(0, true);
  if (raw > HALL_RAW_MAX) return null;
  return { raw, boardMs: view.getUint32(2, true) };
}

/** Minimal Web Bluetooth types (not in TypeScript's DOM library). */
interface BluetoothCharacteristic extends EventTarget {
  value?: DataView;
  readValue?(): Promise<DataView>;
  startNotifications(): Promise<BluetoothCharacteristic>;
  stopNotifications(): Promise<BluetoothCharacteristic>;
}
interface BluetoothServer {
  connected: boolean;
  getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<BluetoothCharacteristic> }>;
  disconnect(): void;
}
export interface BluetoothDeviceLike extends EventTarget {
  id?: string;
  name?: string;
  gatt?: { connect(): Promise<BluetoothServer> };
  /** Chrome: report advertisements from an already permitted device (used to reconnect when it is back in range). */
  watchAdvertisements?(): Promise<void>;
}
interface BluetoothLike {
  requestDevice(options: { filters: Array<{ services: string[] }>; optionalServices?: string[] }): Promise<BluetoothDeviceLike>;
  /** Chrome: devices this site was already allowed to use (no device chooser needed). */
  getDevices?(): Promise<BluetoothDeviceLike[]>;
}

export function webBluetooth(): BluetoothLike | null {
  return (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth ?? null;
}

/** A board this site was allowed to use before, by Chrome's device id, or null (not remembered, or the browser cannot list devices). */
export async function knownHallDevice(id: string | undefined): Promise<BluetoothDeviceLike | null> {
  const bluetooth = webBluetooth();
  if (!id || !bluetooth?.getDevices) return null;
  try {
    return (await bluetooth.getDevices()).find((device) => device.id === id) ?? null;
  } catch {
    return null;
  }
}

/** Streams one sensor's readings for one instrument. `start` must run from a click (browser rule). */
export class BleHallSensorSource implements HallSensorSource {
  private server: BluetoothServer | null = null;
  private characteristic: BluetoothCharacteristic | null = null;
  private _device: BluetoothDeviceLike | null = null;
  /** The board this source was last connected to. */
  get device() { return this._device; }
  private readonly onValue = () => {
    const view = this.characteristic?.value;
    const packet = view ? parseHallPacket(view) : null;
    if (packet && this.listener) this.listener({ instrument: this.instrument(), raw: packet.raw, at: packet.boardMs });
  };
  private readonly onDisconnect = () => this.disconnected?.();
  private listener: HallReadingListener | null = null;

  constructor(private readonly instrument: () => HallInstrument, private readonly disconnected?: () => void) {}

  get deviceName() { return this._device?.name ?? HALL_DEVICE_NAME; }
  /** Chrome's id for the connected board, remembered to reconnect to it later. */
  get deviceId() { return this._device?.id; }

  /** Ask the user to choose a board (must run from a click), then connect. */
  async start(listener: HallReadingListener) {
    const bluetooth = webBluetooth();
    if (!bluetooth) throw new Error('This browser has no Bluetooth support · use Chrome or Edge on a computer');
    await this.startWith(await bluetooth.requestDevice({ filters: [{ services: [HALL_SERVICE_UUID] }], optionalServices: [BATTERY_SERVICE] }), listener);
  }

  /** Connect to a board the site may already use (from `knownHallDevice`), without the chooser. */
  async startWith(device: BluetoothDeviceLike, listener: HallReadingListener) {
    this.listener = listener;
    if (this._device !== device) {
      this._device?.removeEventListener('gattserverdisconnected', this.onDisconnect);
      this._device = device;
      this._device.addEventListener('gattserverdisconnected', this.onDisconnect);
    }
    if (!this._device.gatt) throw new Error('The sensor offers no Bluetooth services');
    this.server = await this._device.gatt.connect();
    const service = await this.server.getPrimaryService(HALL_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(HALL_READING_UUID);
    this.characteristic.addEventListener('characteristicvaluechanged', this.onValue);
    await this.characteristic.startNotifications();
    void this.watchBattery(this.server);
  }

  /** Battery charge (0–100 %) when the board reports it (firmware since 2026-11-23), else null. */
  batteryPercent: number | null = null;
  /** Called when the battery level changes. */
  onBattery?: (percent: number) => void;
  private async watchBattery(server: BluetoothServer) {
    try {
      const level = await (await server.getPrimaryService(BATTERY_SERVICE)).getCharacteristic(BATTERY_LEVEL);
      const update = (view?: DataView) => {
        if (!view || view.byteLength < 1) return;
        this.batteryPercent = Math.min(100, view.getUint8(0));
        this.onBattery?.(this.batteryPercent);
      };
      level.addEventListener('characteristicvaluechanged', () => update(level.value));
      if (level.readValue) update(await level.readValue());
      await level.startNotifications();
    } catch {
      // Older firmware, or a board first allowed before battery access was requested: no level.
    }
  }

  stop() {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.onValue);
    this._device?.removeEventListener('gattserverdisconnected', this.onDisconnect);
    if (this.server?.connected) this.server.disconnect();
    this.characteristic = null;
    this.server = null;
    this.listener = null;
  }
}
