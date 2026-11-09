/**
 * Automatic back-off for optical-flow requests.
 *
 * Each flow request blocks the main thread briefly (preparing the frame for
 * the worker: ~5 ms per frame in a software-rendered headless test). At 120
 * fps per camera that alone could take more main-thread time than exists.
 * This spaces requests so flow uses at most MAIN_THREAD_SHARE of the main
 * thread per camera, never more often than the caller's minimum interval and
 * never less often than MAX_FLOW_INTERVAL_MS. Cheap requests (real GPUs) keep
 * the full camera rate.
 */

/** Largest fraction of main-thread time flow requests may use, per camera. */
export const MAIN_THREAD_SHARE = 0.15;
/** Never back off below ~30 flow updates per second. */
export const MAX_FLOW_INTERVAL_MS = 33;
/** Weight of each new cost measurement in the running average. */
const COST_SMOOTHING = 0.2;

export class FlowBudget {
  private averageCostMs: number | undefined;

  /** Main-thread time (ms) one flow request took. */
  record(costMs: number) {
    if (!Number.isFinite(costMs) || costMs < 0) return;
    this.averageCostMs = this.averageCostMs === undefined ? costMs : this.averageCostMs + (costMs - this.averageCostMs) * COST_SMOOTHING;
  }

  /** Minimum time between flow requests (ms), given the scheduling minimum. */
  intervalMs(minimumMs: number): number {
    if (this.averageCostMs === undefined) return minimumMs;
    const budgeted = this.averageCostMs / MAIN_THREAD_SHARE;
    return Math.max(minimumMs, Math.min(MAX_FLOW_INTERVAL_MS, budgeted));
  }

  get costMs() {
    return this.averageCostMs;
  }

  reset() {
    this.averageCostMs = undefined;
  }
}
