import * as THREE from 'three';
import { FreeKnotPractice } from '../../gameplay/FreeKnotPractice';
import { Instrument } from '../../instruments/Instrument';
import type { KnotTechnique } from '../../suture/KnotTechnique';
import type { ThreadStrand } from '../../suture/ThreadStrand';
import { knotSurfaceAt, microEnvironment } from '../knotTissue';
import type { KnotFrame, KnotRequest, KnotSnapshot, ToolState } from './protocol';

/** Slices per second of request time, and the most per request (bounds catch-up after a stall, s × 60). */
const SLICES_PER_SECOND = 60;
const MAX_SLICES = 8;

/**
 * The worker side of a knot engine (2026-11-15): runs the classic knot model on its own
 * copies of the instruments and answers each request with a snapshot. Plain code, so it
 * runs in a worker or, for tests, in the same thread.
 */
export class KnotHost {
  readonly model = new FreeKnotPractice();
  private updates = 0;
  private simulatedSeconds = 0;
  private readonly tools = [new Instrument('left', 0), new Instrument('right', 0)];

  handle(request: KnotRequest): KnotSnapshot {
    if (request.type === 'reset') this.model.reset();
    else if (request.type === 'cut') {
      const strand = this.model.strands[request.strand];
      if (strand) this.model.cut(strand, request.coordinate);
    } else {
      const before = this.tools.map((tool) => ({ position: tool.root.position.clone(), quaternion: tool.root.quaternion.clone() }));
      this.applyFrame(request);
      if (request.type === 'begin') this.model.begin(this.tools, request.technique as KnotTechnique | 'auto' | undefined);
      else {
        const sent = this.tools.map((tool) => tool.root.position.clone());
        const after = this.tools.map((tool) => ({ position: tool.root.position.clone(), quaternion: tool.root.quaternion.clone() }));
        // A request can carry several frames' time (the main thread waited for this answer):
        // run it in display-frame slices, as the model only advances two physics steps per call,
        // moving the instruments smoothly from where they were to where they are now (a jump
        // per request is fast, jerky motion to the thread, which can stop a throw forming).
        const slices = Math.min(MAX_SLICES, Math.max(1, Math.ceil(request.dt * SLICES_PER_SECOND - 1e-6)));
        const blocked = request.blocked ? new Set(request.blocked) : undefined;
        for (let i = 0; i < slices; i++) {
          const t = (i + 1) / slices;
          this.tools.forEach((tool, k) => {
            tool.root.position.copy(before[k].position).lerp(after[k].position, t);
            tool.root.quaternion.copy(before[k].quaternion).slerp(after[k].quaternion, t);
            tool.root.updateWorldMatrix(true, false);
          });
          this.model.update(request.dt / slices, this.tools, blocked);
        }
        this.updates += slices;
        this.simulatedSeconds += request.dt;
        return { ...snapshotOf(this.model, this.tools, sent), diagnostics: this.diagnostics() };
      }
    }
    return { ...snapshotOf(this.model, this.tools, this.tools.map((tool) => tool.root.position.clone())), diagnostics: this.diagnostics() };
  }

  private diagnostics(): KnotSnapshot['diagnostics'] {
    const seat = (this.model as unknown as { tissueSeat: { contact: boolean; load: number } }).tissueSeat;
    return { seatContact: seat.contact, seatLoad: seat.load, entry: this.model.entry.toArray() as [number, number, number], updates: this.updates, simulatedSeconds: this.simulatedSeconds };
  }

  private applyFrame(frame: KnotFrame) {
    const model = this.model;
    for (const state of frame.tools) {
      const tool = this.tools.find((t) => t.id === state.id);
      if (tool) applyTool(tool, state, frame.tissue.environment);
    }
    model.entry.set(...frame.entry);
    model.exit.set(...frame.exit);
    model.padOffsetZ = frame.padOffsetZ;
    model.tractHalfWidth = frame.tractHalfWidth;
    const tissue = frame.tissue;
    model.surfaceAt = (p) => knotSurfaceAt(tissue, p);
    if (tissue.environment === 'skin') {
      model.threadFloorAt = undefined;
      model.tissueContact = undefined;
      model.driverObstacle = undefined;
    } else {
      const environment = microEnvironment(tissue.microTarget);
      model.threadFloorAt = environment.threadFloorAt;
      model.tissueContact = environment.threadContact;
      model.driverObstacle = environment.driverObstacle;
    }
  }
}

function applyTool(tool: Instrument, state: ToolState, environment: string) {
  const style = environment === 'microsurgery' ? 'castro' : 'standard';
  if (tool.driverStyle !== style) tool.setDriverStyle(style);
  tool.root.position.set(...state.position);
  tool.root.quaternion.set(...state.quaternion);
  tool.openness = state.openness;
  tool.root.updateWorldMatrix(true, false);
}

const tensionOf = (t: { state: string; tautness: number; demand: number; peakDemand: number }) => ({ state: t.state, tautness: t.tautness, demand: t.demand, peakDemand: t.peakDemand });

export function snapshotOf(model: FreeKnotPractice, tools: readonly Instrument[], sent: readonly THREE.Vector3[]): Omit<KnotSnapshot, 'diagnostics'> {
  const strands = model.strands;
  const indexOf = (strand: ThreadStrand) => strands.indexOf(strand);
  const next = model.nextTrimTarget;
  return {
    active: model.active,
    strands: strands.map((strand) => {
      const points = new Float32Array(strand.count * 3);
      strand.points.forEach((p, i) => points.set([p.x, p.y, p.z], i * 3));
      return { length: strand.length, points };
    }),
    grips: [...model.grips].map(([tool, grip]) => ({ tool, strand: indexOf(grip.strand), index: grip.index, label: model.gripLabel(tool) })),
    sequence: model.sequence
      ? { throws: model.sequence.throws.map((t) => ({ wraps: t.wraps, direction: t.direction, postHeld: t.postHeld })), technique: model.sequence.technique, label: model.sequence.label, locked: model.sequence.locked, sliding: model.sequence.sliding }
      : null,
    retained: { active: model.retainedThrow.active, tightness: model.retainedThrow.tightness, phase: model.retainedThrow.phase },
    passageOpening: model.passage.hasOpening,
    lockSeated: model.lockSeated,
    seatedThrows: model.seatedThrows,
    closureLoad: model.closureLoad,
    pullDemand: model.pullDemand,
    instruction: model.instruction,
    handlingHint: model.handlingHint,
    tensionHint: model.tensionHint,
    tension: { long: tensionOf(model.tension.long), short: tensionOf(model.tension.short) },
    reachLimited: model.reachLimited,
    winding: model.winding,
    driverOnTissue: model.driverOnTissue,
    knotAtTissue: model.knotAtTissue,
    cutMessage: model.cutMessage,
    trimmed: strands.map((s, i) => (model.trimmedTails.has(s) ? i : -1)).filter((i) => i >= 0),
    minimumCut: strands.map((s) => model.minimumCut(s)),
    nextTrim: next ? indexOf(next) : -1,
    corrections: tools.map((tool, i) => {
      const d = tool.root.position.clone().sub(sent[i]);
      return { id: tool.id, delta: [d.x, d.y, d.z] as [number, number, number] };
    }),
  };
}
