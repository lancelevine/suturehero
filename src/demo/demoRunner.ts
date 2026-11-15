/**
 * Demo runner (2026-11-15): plays a scripted exercise by pressing the same
 * keys and buttons a person would, waiting for the simulator to reach each
 * stage. Used for presentations ("Demo" button). The environment is injected
 * so the runner is testable without a browser.
 */

export type DemoStep =
  | { caption: string }
  | { press: string[] }
  | { release: string[] }
  | { click: string }
  | { until: () => boolean; timeoutMs?: number; label: string }
  | { pause: number }
  | { run: () => void };

export interface DemoEnvironment {
  keyDown(code: string): void;
  keyUp(code: string): void;
  /** Clicks the button with this exact label or id (#id); false if not found or disabled. */
  click(button: string): boolean;
  caption(text: string): void;
  /** Resolves after `ms` (wall clock). */
  wait(ms: number): Promise<void>;
  now(): number;
}

/** Default time to wait for a stage (ms). */
export const STAGE_TIMEOUT_MS = 60000;
/** How often stage conditions are polled (ms). */
const POLL_MS = 50;

export type DemoResult = { finished: true } | { finished: false; reason: string };

export class DemoRunner {
  private cancelled = false;
  private readonly held = new Set<string>();
  running = false;

  constructor(private readonly env: DemoEnvironment) {}

  cancel() {
    this.cancelled = true;
  }

  async run(steps: readonly DemoStep[]): Promise<DemoResult> {
    this.cancelled = false;
    this.running = true;
    try {
      for (const step of steps) {
        if (this.cancelled) return { finished: false, reason: 'stopped' };
        if ('caption' in step) this.env.caption(step.caption);
        else if ('press' in step) for (const code of step.press) this.down(code);
        else if ('release' in step) for (const code of step.release) this.up(code);
        else if ('click' in step) {
          if (!this.env.click(step.click)) return { finished: false, reason: `button not available: ${step.click}` };
        } else if ('pause' in step) await this.env.wait(step.pause);
        else if ('run' in step) step.run();
        else {
          const ok = await this.waitFor(step.until, step.timeoutMs ?? STAGE_TIMEOUT_MS);
          if (!ok) return { finished: false, reason: this.cancelled ? 'stopped' : `timed out: ${step.label}` };
        }
      }
      return { finished: true };
    } finally {
      for (const code of [...this.held]) this.up(code);
      this.running = false;
    }
  }

  private down(code: string) {
    this.held.add(code);
    this.env.keyDown(code);
  }

  private up(code: string) {
    this.held.delete(code);
    this.env.keyUp(code);
  }

  private async waitFor(condition: () => boolean, timeoutMs: number) {
    const start = this.env.now();
    while (!this.cancelled) {
      if (condition()) return true;
      if (this.env.now() - start > timeoutMs) return false;
      await this.env.wait(POLL_MS);
    }
    return false;
  }
}
