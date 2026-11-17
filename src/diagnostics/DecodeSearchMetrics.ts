import type { DecodeRegion } from '../input/PredictiveDecodeSearch';

export interface CounterSink { count(name: string, amount?: number): void }

/** Shared accounting for Camera 1/2 decode regions. */
export function recordDecodeSearch(sink: CounterSink, camera: 1 | 2, region: DecodeRegion): void {
  const prefix = `Camera ${camera}`;
  sink.count(`${prefix} search ${region.kind}`);
  if (region.kind === 'full') sink.count(`${prefix} full reason: ${region.reason}`);
  sink.count(`${prefix} searched pixels`, region.width * region.height);
}
