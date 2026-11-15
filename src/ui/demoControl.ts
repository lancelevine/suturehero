import { DemoRunner, type DemoEnvironment } from '../demo/demoRunner';
import { interruptedSutureDemo, type DemoPage } from '../demo/interruptedSutureDemo';

/**
 * "Demo" button (2026-11-15): plays the simple interrupted suture by itself
 * for presentations, with large captions over the 3D view. The demo needs
 * the PS-2 needle (the guided bite); with the Sandbox trainer needle it
 * reloads with the PS-2 and starts automatically.
 */

const DEMO_PARAM = 'demo';
/** Delay before an automatic start after a reload (ms), so the scene has settled. */
const AUTO_START_MS = 1500;

const pageAdapter: DemoPage = {
  text: (selector) => document.querySelector(selector)?.textContent ?? '',
  attribute: (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? null,
  enabled: (selector) => {
    const element = document.querySelector<HTMLButtonElement>(selector);
    return !!element && !element.disabled;
  },
  setRange: (selector, value) => {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
};

function findButton(label: string): HTMLButtonElement | null {
  if (label.startsWith('#')) return document.querySelector<HTMLButtonElement>(label);
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label) ?? null;
}

export function mountDemoControl(host: HTMLElement, viewport: HTMLElement, needsReload: () => boolean) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'demo';
  button.textContent = '▶ Demo';
  button.title = 'Watch the instruments perform a simple interrupted suture by themselves (for presentations)';
  host.append(button);
  const caption = document.createElement('div');
  caption.className = 'demo-caption';
  caption.setAttribute('role', 'status');
  caption.hidden = true;
  viewport.append(caption);
  const env: DemoEnvironment = {
    keyDown: (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })),
    keyUp: (code) => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })),
    click: (label) => {
      const target = findButton(label);
      if (!target || target.disabled) return false;
      target.click();
      return true;
    },
    caption: (text) => {
      caption.textContent = text;
      caption.hidden = false;
    },
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => performance.now(),
  };
  const runner = new DemoRunner(env);
  const start = async () => {
    if (runner.running) return;
    if (needsReload()) {
      const url = new URL(window.location.href);
      url.searchParams.set('needle', 'ps2');
      url.searchParams.set(DEMO_PARAM, '1');
      window.location.assign(url.href);
      return;
    }
    // Start from a clean practice, in the close-up view.
    findButton('#reset')?.click();
    const closeUp = findButton('#close-up');
    if (closeUp?.getAttribute('aria-pressed') === 'false') closeUp.click();
    button.textContent = '■ Stop demo';
    document.body.classList.add('demo-running');
    const result = await runner.run(interruptedSutureDemo(pageAdapter));
    document.body.classList.remove('demo-running');
    button.textContent = '▶ Demo';
    env.caption(result.finished ? 'Demo complete · Reset practice to try it yourself' : result.reason === 'stopped' ? 'Demo stopped' : `Demo paused: ${result.reason}`);
    setTimeout(() => {
      if (!runner.running) caption.hidden = true;
    }, 6000);
  };
  button.addEventListener('click', () => {
    if (runner.running) runner.cancel();
    else void start();
  });
  const url = new URL(window.location.href);
  if (url.searchParams.get(DEMO_PARAM) === '1') {
    url.searchParams.delete(DEMO_PARAM);
    window.history.replaceState(null, '', url.href);
    setTimeout(() => void start(), AUTO_START_MS);
  }
  return { runner, button };
}
