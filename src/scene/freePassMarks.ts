import * as THREE from 'three';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';

/** Entry (teal) and exit (amber) points of Sandbox needle passes, drawn just above the skin. */
const ENTRY_COLOR = 0x3fd1c0;
const EXIT_COLOR = 0xf2a33a;
/** Entry of a pass that tore out (forced off the needle's curve). */
const TORN_COLOR = 0xe2463c;
const MARK_RADIUS = 0.022;
const LIFT = 0.004;

export class FreePassMarks {
  readonly root = new THREE.Group();
  private key = '';
  private readonly geometry = new THREE.SphereGeometry(MARK_RADIUS, 14, 10);
  private readonly entryMaterial = new THREE.MeshBasicMaterial({ color: ENTRY_COLOR });
  private readonly exitMaterial = new THREE.MeshBasicMaterial({ color: EXIT_COLOR });
  private readonly tornMaterial = new THREE.MeshBasicMaterial({ color: TORN_COLOR });

  constructor() {
    this.root.name = 'free-pass-marks';
  }

  /** Shows the entry/exit points of `passes` (completed ones plus the one in progress). */
  update(passes: readonly FreePassRecord[]) {
    const key = passes.map((p) => `${p.entry.toArray().join()}|${p.exit?.toArray().join() ?? ''}|${p.torn ? 't' : ''}`).join(';');
    if (key === this.key) return;
    this.key = key;
    this.root.clear();
    for (const pass of passes) {
      for (const [point, material] of [[pass.entry, pass.torn ? this.tornMaterial : this.entryMaterial], [pass.exit, this.exitMaterial]] as const) {
        if (!point) continue;
        const mark = new THREE.Mesh(this.geometry, material);
        mark.position.copy(point).add(new THREE.Vector3(0, LIFT, 0));
        this.root.add(mark);
      }
    }
  }
}
