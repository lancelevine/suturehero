/// <reference lib="webworker" />
import { KnotHost } from './KnotHost';
import type { KnotRequest } from './protocol';

/** Web Worker running the classic knot model (2026-11-15); see WorkerKnotEngine. */
const host = new KnotHost();
self.onmessage = (event: MessageEvent<KnotRequest>) => {
  const snapshot = host.handle(event.data);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(snapshot, snapshot.strands.map((strand) => strand.points.buffer));
};
