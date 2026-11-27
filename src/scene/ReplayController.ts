import * as THREE from 'three';
import { ReplayBuffer, ReplayPlayer } from '../gameplay/replayBuffer';
import type { Instrument } from '../instruments/Instrument';
import type { SutureModel } from '../suture/SutureModel';
import { disposeChildren } from './disposeChildren';

/**
 * Slow-motion replay of the last REPLAY_SECONDS of the Sandbox (2026-11-15):
 * instruments, needle and thread, with each instrument's tip path drawn.
 * While replaying the simulation is paused; afterwards it resumes from where
 * it was.
 */

interface Pose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}
interface Frame {
  tools: (Pose & { openness: number; tip: THREE.Vector3 })[];
  needle: Pose;
  strand: THREE.Vector3[];
}

/** Tip of an instrument in its local frame (as used for grasping). */
const TIP_LOCAL = new THREE.Vector3(0, 0, 0.05);
const PATH_COLORS = [0x65d8c1, 0xe65353];

export class ReplayController {
  readonly paths = new THREE.Group();
  private readonly buffer = new ReplayBuffer<Frame>();
  private player: ReplayPlayer<Frame> | null = null;
  private live: { frame: Frame; strand: ReturnType<SutureModel['strand']['snapshot']> } | null = null;

  constructor(private readonly tools: readonly Instrument[], private readonly needle: SutureModel) {
    this.paths.name = 'replay-paths';
  }

  get replaying() {
    return this.player !== null;
  }

  get progress() {
    return this.player?.progress ?? 0;
  }

  get available() {
    return this.buffer.duration >= 1;
  }

  private capture(): Frame {
    return {
      tools: this.tools.map((tool) => {
        tool.root.updateWorldMatrix(true, false);
        return { position: tool.root.position.clone(), quaternion: tool.root.quaternion.clone(), openness: tool.openness, tip: tool.root.localToWorld(TIP_LOCAL.clone()) };
      }),
      needle: { position: this.needle.root.position.clone(), quaternion: this.needle.root.quaternion.clone() },
      strand: this.needle.strand.points.map((p) => p.clone()),
    };
  }

  /** Records this frame (call while the Sandbox runs, not during replay). */
  record(timeSeconds: number) {
    if (!this.player) this.buffer.push(timeSeconds, this.capture());
  }

  /** Starts playback; returns false when there is not enough recorded. */
  start(): boolean {
    if (this.player || !this.available) return false;
    this.live = { frame: this.capture(), strand: this.needle.strand.snapshot() };
    this.player = new ReplayPlayer(this.buffer);
    this.drawPaths();
    return true;
  }

  /** One display frame of playback; returns true while replaying (skip the simulation). */
  step(dt: number): boolean {
    if (!this.player) return false;
    const frame = this.player.advance(dt);
    if (frame) {
      this.apply(frame);
      return true;
    }
    this.stop();
    return true;
  }

  /** Ends playback and restores the live state. */
  stop() {
    if (!this.player) return;
    this.player = null;
    if (this.live) {
      this.apply(this.live.frame);
      this.needle.strand.restore(this.live.strand);
      this.needle.refreshThread();
    }
    this.live = null;
    disposeChildren(this.paths);
  }

  clear() {
    this.stop();
    this.buffer.clear();
  }

  private apply(frame: Frame) {
    frame.tools.forEach((pose, i) => {
      const tool = this.tools[i];
      tool.root.position.copy(pose.position);
      tool.root.quaternion.copy(pose.quaternion);
      tool.setTrackedOpening(pose.openness);
    });
    this.needle.root.position.copy(frame.needle.position);
    this.needle.root.quaternion.copy(frame.needle.quaternion);
    this.needle.strand.restore({ points: frame.strand });
    this.needle.refreshThread();
  }

  private drawPaths() {
    disposeChildren(this.paths);
    const frames = this.buffer.all();
    this.tools.forEach((_, i) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(frames.map((f) => f.tools[i].tip));
      this.paths.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: PATH_COLORS[i % PATH_COLORS.length] })));
    });
  }
}
