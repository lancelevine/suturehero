import * as THREE from 'three';
import { FreeKnotPractice } from '../../gameplay/FreeKnotPractice';
import type { Instrument } from '../../instruments/Instrument';
import type { KnotTechnique } from '../../suture/KnotTechnique';
import { ThreadStrand } from '../../suture/ThreadStrand';
import { threadSurfaceAt } from '../../suture/TissueThreadGuide';
import { TRACT_HALF_WIDTH } from '../../tissue/sutureTract';
import type { KnotEngine, KnotGrip, StrandTensionView } from '../engines';
import type { KnotTissue } from '../knotTissue';
import { snapshotOf } from './KnotHost';
import type { KnotFrame, KnotRequest, KnotSnapshot } from './protocol';

/** Where knot requests go and snapshots come from: a Web Worker, or (tests) a host in the same thread. */
export interface KnotPort {
  post(request: KnotRequest): void;
  listen(receive: (snapshot: KnotSnapshot) => void): void;
}

/** Most knot updates waiting for the remote model at once (see WorkerKnotEngine.inFlight). */
export const MAX_IN_FLIGHT = 3;

const IDLE_TENSION: StrandTensionView = { state: 'released', tautness: 0, demand: 0, peakDemand: 0 };

/**
 * The classic knot model running elsewhere (2026-11-15), usually in a Web Worker so the
 * thread physics does not hold up drawing. This stand-in sends the instruments and the
 * tissue each frame and shows the latest snapshot it received: the knot state is one
 * frame behind the instruments. Tool moves the knot model makes (keeping the driver off
 * the skin) stay in the remote model's copies; they are not applied to the drawn instruments.
 */
export class WorkerKnotEngine implements KnotEngine {
  active = false;
  readonly entry = new THREE.Vector3();
  readonly exit = new THREE.Vector3();
  long = new ThreadStrand(2.1, 64);
  short = new ThreadStrand(1.2, 40);
  fragments: ThreadStrand[] = [];
  readonly grips = new Map<string, KnotGrip>();
  sequence?: KnotEngine['sequence'];
  retainedThrow = { active: false, tightness: 0, phase: 'idle' };
  passage = { hasOpening: false };
  lockSeated = false;
  seatedThrows = 0;
  closureLoad = 0;
  pullDemand = 0;
  instruction = 'Free first throw';
  handlingHint = '';
  tensionHint = '';
  tension: Record<'long' | 'short', StrandTensionView> = { long: IDLE_TENSION, short: IDLE_TENSION };
  reachLimited = false;
  winding = 0;
  driverOnTissue = false;
  knotAtTissue = false;
  cutMessage = '';
  trimmedTails = new Set<ThreadStrand>();
  nextTrimTarget: ThreadStrand | undefined;
  surfaceAt: (p: THREE.Vector3) => number = threadSurfaceAt;
  threadFloorAt?: KnotEngine['threadFloorAt'];
  tissueContact?: KnotEngine['tissueContact'];
  driverObstacle?: KnotEngine['driverObstacle'];
  padOffsetZ = 0;
  tractHalfWidth = TRACT_HALF_WIDTH;
  private labels = new Map<string, string>();
  private minimumCuts: number[] = [];
  private tissue: KnotTissue = { environment: 'skin', siteZ: 0, field: [] };
  private latest: KnotSnapshot | null = null;
  /** How the remote model last moved each tool (shown for diagnostics; not applied). */
  lastCorrections: KnotSnapshot['corrections'] = [];
  /** The remote model's latest diagnostics (knot/skin contact, model time). */
  diagnostics: KnotSnapshot['diagnostics'] | null = null;
  /**
   * Updates sent and not yet answered. Up to MAX_IN_FLIGHT, every update is sent with its own
   * instrument poses (the remote model sees exactly what the classic engine would); beyond
   * that, frames add their time to the next update instead of queueing behind a slow model.
   */
  private inFlight = 0;
  private pendingDt = 0;
  /** Places the instruments at the start of tying exactly as the remote model does. */
  private readonly placer = new FreeKnotPractice();

  constructor(private readonly port: KnotPort) {
    // Start from the same wound points and tract width as the model itself.
    this.entry.copy(this.placer.entry);
    this.exit.copy(this.placer.exit);
    this.tractHalfWidth = this.placer.tractHalfWidth;
    port.listen((snapshot) => {
      this.latest = snapshot;
      this.inFlight = Math.max(0, this.inFlight - 1);
    });
  }

  get strands() {
    return [this.long, this.short, ...this.fragments];
  }

  gripLabel(id: string) {
    return this.labels.get(id) ?? 'free';
  }

  minimumCut(strand: ThreadStrand) {
    return this.minimumCuts[this.strands.indexOf(strand)] ?? 2;
  }

  configureTissue(tissue: KnotTissue) {
    this.tissue = tissue;
  }

  begin(tools: readonly Instrument[], technique?: KnotTechnique | 'auto') {
    const sent = tools.map((tool) => tool.root.position.clone());
    this.port.post({ type: 'begin', technique, ...this.frame(tools) });
    const placer = this.placer;
    placer.entry.copy(this.entry);
    placer.exit.copy(this.exit);
    placer.begin(tools, technique);
    this.latest = null;
    this.apply(snapshotOf(placer, tools, sent));
  }

  update(dt: number, tools: readonly Instrument[], blockedGrips?: ReadonlySet<string>) {
    if (this.latest) {
      const snapshot = this.latest;
      this.latest = null;
      this.apply(snapshot);
      // Tool corrections (driver kept off the skin and thread) are not fed back to the instruments:
      // a correction a frame late double-counts when instruments are placed at absolute poses (demo,
      // tests), and the remote model applies them to its own copies every frame, as the classic does.
      this.lastCorrections = snapshot.corrections;
    }
    if (!this.active) return;
    // Never queue updates behind a slow model: send the elapsed time with the next one instead.
    this.pendingDt += dt;
    if (this.inFlight >= MAX_IN_FLIGHT) return;
    this.inFlight++;
    const elapsed = this.pendingDt;
    this.pendingDt = 0;
    this.port.post({ type: 'update', dt: elapsed, blocked: blockedGrips ? [...blockedGrips] : null, ...this.frame(tools) });
  }

  reset() {
    this.port.post({ type: 'reset' });
    this.placer.reset();
    this.latest = null;
    this.apply(snapshotOf(this.placer, [], []));
  }

  cut(strand: ThreadStrand, coordinate: number) {
    const index = this.strands.indexOf(strand);
    if (index < 0) return false;
    this.port.post({ type: 'cut', strand: index, coordinate });
    return true;
  }

  private frame(tools: readonly Instrument[]): KnotFrame {
    return {
      tools: tools.map((tool) => ({ id: tool.id, position: tool.root.position.toArray() as [number, number, number], quaternion: tool.root.quaternion.toArray() as [number, number, number, number], openness: tool.openness })),
      entry: this.entry.toArray() as [number, number, number],
      exit: this.exit.toArray() as [number, number, number],
      tissue: this.tissue,
      padOffsetZ: this.padOffsetZ,
      tractHalfWidth: this.tractHalfWidth,
    };
  }

  private apply(snapshot: Omit<KnotSnapshot, 'diagnostics'> & Partial<Pick<KnotSnapshot, 'diagnostics'>>) {
    if (snapshot.diagnostics) this.diagnostics = snapshot.diagnostics;
    const strands = snapshot.strands.map((state, i) => {
      const count = state.points.length / 3;
      const existing = this.strands[i];
      const strand = existing && existing.count === count && existing.length === state.length ? existing : new ThreadStrand(state.length, count);
      for (let k = 0; k < count; k++) strand.points[k].set(state.points[k * 3], state.points[k * 3 + 1], state.points[k * 3 + 2]);
      return strand;
    });
    [this.long, this.short] = [strands[0], strands[1]];
    this.fragments = strands.slice(2);
    this.active = snapshot.active;
    this.grips.clear();
    this.labels.clear();
    for (const grip of snapshot.grips) {
      if (strands[grip.strand]) this.grips.set(grip.tool, { strand: strands[grip.strand], index: grip.index });
      this.labels.set(grip.tool, grip.label);
    }
    this.sequence = snapshot.sequence ?? undefined;
    this.retainedThrow = snapshot.retained;
    this.passage = { hasOpening: snapshot.passageOpening };
    this.lockSeated = snapshot.lockSeated;
    this.seatedThrows = snapshot.seatedThrows;
    this.closureLoad = snapshot.closureLoad;
    this.pullDemand = snapshot.pullDemand;
    this.instruction = snapshot.instruction;
    this.handlingHint = snapshot.handlingHint;
    this.tensionHint = snapshot.tensionHint;
    this.tension = snapshot.tension;
    this.reachLimited = snapshot.reachLimited;
    this.winding = snapshot.winding;
    this.driverOnTissue = snapshot.driverOnTissue;
    this.knotAtTissue = snapshot.knotAtTissue;
    this.cutMessage = snapshot.cutMessage;
    this.trimmedTails = new Set(snapshot.trimmed.map((i) => strands[i]).filter(Boolean));
    this.minimumCuts = snapshot.minimumCut;
    this.nextTrimTarget = snapshot.nextTrim >= 0 ? strands[snapshot.nextTrim] : undefined;
  }
}

/**
 * A port to a KnotHost in the same thread (tests, and where workers are unavailable). It
 * answers at once; the engine applies answers on its next update, so it still sees the
 * knot state a frame late, like a worker.
 */
export class LocalKnotPort implements KnotPort {
  private receive: ((snapshot: KnotSnapshot) => void) | null = null;
  constructor(private readonly host: { handle(request: KnotRequest): KnotSnapshot }) {}
  post(request: KnotRequest) {
    this.receive?.(this.host.handle(request));
  }
  listen(receive: (snapshot: KnotSnapshot) => void) {
    this.receive = receive;
  }
}
