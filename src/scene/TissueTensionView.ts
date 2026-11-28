import * as THREE from 'three';
import { STANDARD_GAP } from '../environments/bodySites';
import type { TissueSite } from '../tissue/StitchField';
import { disposeChildren } from './disposeChildren';

/**
 * Tissue tension heatmap (roadmap, 2026-11-28): a soft glow on the skin around each tied stitch,
 * coloured by how much tension it holds: the wound gap it had to close (relative to the standard
 * gap) times how far it closed it. Green under LOW, red over HIGH. Relative, from the stitch model.
 */
export const LOW_TENSION = 0.8;
export const HIGH_TENSION = 1.3;
const GLOW_RADIUS = 0.42;
const BLANCH_RADIUS = 0.16;
const LOW_COLOUR = new THREE.Color(0x2fe08a);
const MID_COLOUR = new THREE.Color(0xffc14d);
const HIGH_COLOUR = new THREE.Color(0xff3b30);

export function stitchTension(site: Pick<TissueSite, 'initialGap' | 'closure'>) {
  return (site.initialGap / STANDARD_GAP) * site.closure;
}

export function tensionColour(tension: number, target = new THREE.Color()) {
  if (tension <= LOW_TENSION) return target.copy(LOW_COLOUR);
  if (tension >= HIGH_TENSION) return target.copy(HIGH_COLOUR);
  const t = (tension - LOW_TENSION) / (HIGH_TENSION - LOW_TENSION);
  return t < 0.5 ? target.copy(LOW_COLOUR).lerp(MID_COLOUR, t * 2) : target.copy(MID_COLOUR).lerp(HIGH_COLOUR, (t - 0.5) * 2);
}

let glowTexture: THREE.Texture | null = null;
function radialGlow() {
  if (glowTexture) return glowTexture;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      const a = Math.max(0, 1 - d) ** 2;
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
    }
  glowTexture = new THREE.DataTexture(data, size, size);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

export class TissueTensionView {
  readonly root = new THREE.Group();
  private key = '';

  constructor(private readonly surfaceY: number) {
    this.root.name = 'tissue-tension';
  }

  update(sites: readonly TissueSite[], siteZ: number, visible: boolean) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
    const key = sites.map((s) => `${s.siteZ}:${s.closure.toFixed(3)}:${s.initialGap}`).join(';');
    if (key === this.key) return;
    this.key = key;
    disposeChildren(this.root);
    for (const site of sites) {
      const material = new THREE.MeshBasicMaterial({ map: radialGlow(), color: tensionColour(stitchTension(site)), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(GLOW_RADIUS * 2, GLOW_RADIUS * 2).rotateX(-Math.PI / 2), material);
      glow.position.set(0, this.surfaceY + 0.006, site.siteZ);
      glow.renderOrder = 1;
      glow.name = 'tension-glow';
      this.root.add(glow);
      // Over-tight stitches blanch the skin: a pale patch at the centre (roadmap "Lifelike tissue rendering").
      if (stitchTension(site) >= HIGH_TENSION) {
        const blanch = new THREE.Mesh(new THREE.PlaneGeometry(BLANCH_RADIUS * 2, BLANCH_RADIUS * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: radialGlow(), color: 0xfff4ee, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
        blanch.position.set(0, this.surfaceY + 0.008, site.siteZ);
        blanch.renderOrder = 1;
        blanch.name = 'tension-blanch';
        this.root.add(blanch);
      }
    }
  }
}
