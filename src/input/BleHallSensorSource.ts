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
  startNotifications(): Promise<BluetoothCharacteristic>;
  stopNotifications(): Promise<BluetoothCharacteristic>;
}
interface BluetoothServer {
  connected: boolean;
  getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<BluetoothCharacteristic> }>;
  disconnect(): void;
}
interface BluetoothDeviceLike extends EventTarget {
  name?: string;
  gatt?: { connect(): Promise<BluetoothServer> };
}
interface BluetoothLike {
  requestDevice(options: { filters: Array<{ services: string[] }>; optionalServices?: string[] }): Promise<BluetoothDeviceLike>;
}

export function webBluetooth(): BluetoothLike | null {
  return (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth ?? null;
}

/** Streams one sensor's readings for one instrument. `start` must run from a click (browser rule). */
export class BleHallSensorSource implements HallSensorSource {
  private server: BluetoothServer | null = null;
  private characteristic: BluetoothCharacteristic | null = null;
  private device: BluetoothDeviceLike | null = null;
  private readonly onValue = () => {
    const view = this.characteristic?.value;
    const packet = view ? parseHallPacket(view) : null;
    if (packet && this.listener) this.listener({ instrument: this.instrument(), raw: packet.raw, at: packet.boardMs });
  };
  private readonly onDisconnect = () => this.disconnected?.();
  private listener: HallReadingListener | null = null;

  constructor(private readonly instrument: () => HallInstrument, private readonly disconnected?: () => void) {}

  get deviceName() { return this.device?.name ?? HALL_DEVICE_NAME; }

  async start(listener: HallReadingListener) {
    const bluetooth = webBluetooth();
    if (!bluetooth) throw new Error('This browser has no Bluetooth support · use Chrome or Edge on a computer');
    this.listener = listener;
    this.device = await bluetooth.requestDevice({ filters: [{ services: [HALL_SERVICE_UUID] }] });
    this.device.addEventListener('gattserverdisconnected', this.onDisconnect);
    if (!this.device.gatt) throw new Error('The sensor offers no Bluetooth services');
    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(HALL_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(HALL_READING_UUID);
    this.characteristic.addEventListener('characteristicvaluechanged', this.onValue);
    await this.characteristic.startNotifications();
  }

  stop() {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.onValue);
    this.device?.removeEventListener('gattserverdisconnected', this.onDisconnect);
    if (this.server?.connected) this.server.disconnect();
    this.characteristic = null;
    this.server = null;
    this.listener = null;
  }
}
