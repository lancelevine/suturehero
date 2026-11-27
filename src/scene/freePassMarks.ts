import * as THREE from 'three';
import { disposeChildren } from './disposeChildren';
import type { FreePassRecord, SkinRent } from '../tissue/FreeNeedlePass';

/** Entry (teal) and exit (amber) points of Sandbox needle passes, drawn just above the skin. */
const ENTRY_COLOR = 0x3fd1c0;
const EXIT_COLOR = 0xf2a33a;
/** Entry of a pass that tore out (forced off the needle's curve). */
const TORN_COLOR = 0xe2463c;
const MARK_RADIUS = 0.022;
/** A skin tear: a dark red split, this wide (scene units, ≈ 0.8 mm) and gaping this much at its middle. */
const RENT_COLOR = 0x6e0f12;
const RENT_WIDTH = 0.03;
const LIFT = 0.004;

export class FreePassMarks {
  readonly root = new THREE.Group();
  private key = '';
  private readonly geometry = new THREE.SphereGeometry(MARK_RADIUS, 14, 10);
  private readonly entryMaterial = new THREE.MeshBasicMaterial({ color: ENTRY_COLOR });
  private readonly exitMaterial = new THREE.MeshBasicMaterial({ color: EXIT_COLOR });
  private readonly tornMaterial = new THREE.MeshBasicMaterial({ color: TORN_COLOR });
  private readonly rentMaterial = new THREE.MeshBasicMaterial({ color: RENT_COLOR, side: THREE.DoubleSide });

  constructor() {
    this.root.name = 'free-pass-marks';
  }

  /** Shows the entry/exit points of `passes` (completed ones plus the one in progress). */
  update(passes: readonly FreePassRecord[], rents: readonly SkinRent[] = []) {
    const key = passes.map((p) => `${p.entry.toArray().join()}|${p.exit?.toArray().join() ?? ''}|${p.torn ? 't' : ''}`).join(';') + `#${rents.length}`;
    if (key === this.key) return;
    this.key = key;
    // Marks share one geometry and material set; tear meshes own their geometry (freed here).
    disposeChildren(this.root, new Set([this.entryMaterial, this.exitMaterial, this.tornMaterial, this.rentMaterial]), new Set([this.geometry]));
    for (const pass of passes) {
      for (const [point, material] of [[pass.entry, pass.torn ? this.tornMaterial : this.entryMaterial], [pass.exit, this.exitMaterial]] as const) {
        if (!point) continue;
        const mark = new THREE.Mesh(this.geometry, material);
        mark.position.copy(point).add(new THREE.Vector3(0, LIFT, 0));
        this.root.add(mark);
      }
    }
    for (const rent of rents) this.root.add(this.rentMesh(rent));
  }

  /** A lens-shaped split on the skin from `from` to `to` (widest in the middle, like a gaping tear). */
  private rentMesh(rent: SkinRent) {
    const along = rent.to.clone().sub(rent.from);
    const length = along.length();
    const side = new THREE.Vector3(-along.z, 0, along.x).normalize().multiplyScalar(RENT_WIDTH / 2);
    const steps = 8;
    const positions: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const centre = rent.from.clone().lerp(rent.to, t).add(new THREE.Vector3(0, LIFT, 0));
      const half = side.clone().multiplyScalar(Math.sin(Math.PI * t));
      positions.push(...centre.clone().add(half).toArray(), ...centre.clone().sub(half).toArray());
    }
    const index: number[] = [];
    for (let i = 0; i < steps; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, this.rentMaterial);
    mesh.name = length > 0 ? 'skin-rent' : 'skin-rent-empty';
    return mesh;
  }
}
