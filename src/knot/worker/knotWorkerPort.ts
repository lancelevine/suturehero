import { KnotHost } from './KnotHost';
import type { KnotRequest, KnotSnapshot } from './protocol';
import { LocalKnotPort, type KnotPort } from './WorkerKnotEngine';

/**
 * A port to the knot worker (src/knot/worker/knotWorker.ts), or to an in-thread host
 * where Web Workers are not available (unit tests). The worker is named after the page's
 * query string so it reads the same practice setup (suture material, skin type).
 */
export function createKnotWorkerPort(): KnotPort {
  if (typeof Worker === 'undefined' || typeof window === 'undefined') return new LocalKnotPort(new KnotHost());
  const worker = new Worker(new URL('./knotWorker.ts', import.meta.url), { type: 'module', name: window.location.search || '?' });
  return {
    post: (request: KnotRequest) => worker.postMessage(request),
    listen: (receive: (snapshot: KnotSnapshot) => void) => {
      worker.onmessage = (event: MessageEvent<KnotSnapshot>) => receive(event.data);
    },
  };
}
