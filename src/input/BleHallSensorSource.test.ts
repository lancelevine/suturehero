import { expect, it } from 'vitest';
import { HALL_PACKET_BYTES, parseHallPacket } from './BleHallSensorSource';

const packet = (raw: number, boardMs: number) => {
  const view = new DataView(new ArrayBuffer(HALL_PACKET_BYTES));
  view.setUint16(0, raw, true);
  view.setUint32(2, boardMs, true);
  return view;
};

it('decodes the firmware packet (raw uint16 + board ms uint32, little-endian)', () => {
  expect(parseHallPacket(packet(1923, 123456))).toEqual({ raw: 1923, boardMs: 123456 });
  expect(parseHallPacket(packet(0, 0xffffffff))).toEqual({ raw: 0, boardMs: 0xffffffff });
});

it('rejects packets of the wrong size or out of the 12-bit range', () => {
  expect(parseHallPacket(new DataView(new ArrayBuffer(4)))).toBeNull();
  expect(parseHallPacket(packet(4096, 1))).toBeNull();
});
