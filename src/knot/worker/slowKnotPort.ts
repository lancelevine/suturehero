import type { KnotRequest, KnotSnapshot } from './protocol';
import type { KnotPort } from './WorkerKnotEngine';

/**
 * A port to a KnotHost that answers like a worker slower than the display (tests,
 * 2026-11-26): it handles one request every `framesPerRequest` display frames (call `tick`
 * once per frame), so the engine falls behind and has to send a backlog.
 */
export class SlowKnotPort implements KnotPort {
  private receive: ((snapshot: KnotSnapshot) => void) | null = null;
  private readonly queue: KnotRequest[] = [];
  private frames = 0;
  constructor(private readonly host: { handle(request: KnotRequest): KnotSnapshot }, private readonly framesPerRequest: number) {}
  post(request: KnotRequest) {
    // Begin, reset and cut are answered at once (rare, and the engine does not count them in flight).
    if (request.type !== 'update') this.receive?.(this.host.handle(request));
    else this.queue.push(request);
  }
  listen(receive: (snapshot: KnotSnapshot) => void) {
    this.receive = receive;
  }
  tick() {
    this.frames++;
    if (this.frames % this.framesPerRequest !== 0) return;
    const request = this.queue.shift();
    if (request) this.receive?.(this.host.handle(request));
  }
}
