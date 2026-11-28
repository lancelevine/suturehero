import { CRUSH_OPENNESS } from './crushScore';

/** Thread damaged by instruments (roadmap). Clamping the suture with the jaws squeezed fully shut
 * crimps it, leaving a weak spot. Counts each crimping grip on the thread (per instrument) while
 * tying; severity from jaw openness (Hall sensor when connected). The crimp does not yet weaken the
 * simulated thread. */
export class ThreadCrimpCheck {
  crimps = 0;
  private crimping = new Map<string, boolean>();

  update(id: string, holdingThread: boolean, openness: number) {
    const crimp = holdingThread && openness <= CRUSH_OPENNESS;
    if (crimp && !this.crimping.get(id)) this.crimps++;
    this.crimping.set(id, crimp);
  }

  reset() { this.crimps = 0; this.crimping.clear(); }
}

export function describeCrimps(check: ThreadCrimpCheck) {
  return check.crimps ? `${check.crimps} crimping grip${check.crimps === 1 ? '' : 's'} on the thread (jaws squeezed shut · hold suture lightly to avoid weak spots)` : '';
}
