/** Complication event: a bleeder (roadmap: "Complication events mid-closure"). After a set number
 * of passes one puncture starts to bleed; the pool grows until the trainee holds the closed forceps
 * on it long enough to stop it with pressure. Practice model; rates are illustrative. */
export const BLEED_AFTER_PASSES = 3;
/** Pool radius growth (scene units per second) and its cap. */
export const POOL_GROWTH = 0.02;
export const MAX_POOL = 0.18;
/** Closed forceps within this distance of the bleeder (scene units) count as pressure. */
export const PRESSURE_REACH = 0.12;
/** Seconds of continuous pressure that stop the bleeding. */
export const PRESSURE_SECONDS = 3;

export type BleederState = 'waiting' | 'bleeding' | 'stopped';

export class Bleeder {
  state: BleederState = 'waiting';
  pool = 0;
  pressure = 0;
  site: { x: number; y: number; z: number } | null = null;

  /** Starts bleeding at `site` once `passes` reaches the trigger count. */
  checkStart(passes: number, site: { x: number; y: number; z: number } | null) {
    if (this.state !== 'waiting' || passes < BLEED_AFTER_PASSES || !site) return;
    this.state = 'bleeding';
    this.site = { ...site };
  }

  update(dt: number, forcepsJaw: { x: number; y: number; z: number }, forcepsClosed: boolean) {
    if (this.state !== 'bleeding' || !this.site) return;
    this.pool = Math.min(MAX_POOL, this.pool + POOL_GROWTH * dt);
    const d = Math.hypot(forcepsJaw.x - this.site.x, forcepsJaw.y - this.site.y, forcepsJaw.z - this.site.z);
    this.pressure = forcepsClosed && d < PRESSURE_REACH ? this.pressure + dt : 0;
    if (this.pressure >= PRESSURE_SECONDS) this.state = 'stopped';
  }

  reset() { this.state = 'waiting'; this.pool = 0; this.pressure = 0; this.site = null; }

  describe() {
    if (this.state === 'bleeding') return this.pressure > 0 ? `Bleeder · holding pressure ${this.pressure.toFixed(1)}/${PRESSURE_SECONDS} s` : 'Bleeder at the last puncture · press it with the closed forceps for 3 s';
    if (this.state === 'stopped') return 'Bleeding stopped with pressure';
    return '';
  }
}
