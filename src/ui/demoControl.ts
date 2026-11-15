import { Choreography } from '../demo/choreography';
import { physicsDemoSegments, type DemoScene } from '../demo/physicsDemo';

/**
 * "Demo" button (2026-11-15): the instruments perform a simple interrupted
 * suture by themselves for presentations, with large captions over the 3D
 * view. Since build 0.186 everything is free physics: a free Sandbox pass and
 * an instrument tie by thread contact (src/demo/physicsDemo.ts), not the
 * scripted guided exercise. The demo bite is sized for the PS-2 needle; with
 * the Sandbox trainer needle the page reloads with the PS-2 and starts by itself.
 */

const DEMO_PARAM = 'demo';
/** Delay before an automatic start after a reload (ms), so the scene has settled. */
const AUTO_START_MS = 1500;
/** How long the closing caption stays (ms). */
const CLOSING_CAPTION_MS = 6000;

export interface DemoControl {
  /** Called by the animation loop before the simulation step; true while the demo is driving the instruments. */
  step(dt: number): boolean;
  readonly running: boolean;
}

export function mountDemoControl(host: HTMLElement, viewport: HTMLElement, scene: DemoScene, needsReload: () => boolean, reset: () => void): DemoControl {
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
  let dance: Choreography | null = null;
  const say = (text: string) => {
    if (caption.textContent !== text) caption.textContent = text;
    caption.hidden = false;
  };
  const end = (message: string) => {
    dance = null;
    document.body.classList.remove('demo-running');
    button.textContent = '▶ Demo';
    say(message);
    setTimeout(() => {
      if (!dance) caption.hidden = true;
    }, CLOSING_CAPTION_MS);
  };
  const start = () => {
    if (dance) return;
    if (needsReload()) {
      const url = new URL(window.location.href);
      url.searchParams.set('needle', 'ps2');
      url.searchParams.set(DEMO_PARAM, '1');
      window.location.assign(url.href);
      return;
    }
    reset();
    dance = new Choreography(physicsDemoSegments(scene));
    document.body.classList.add('demo-running');
    button.textContent = '■ Stop demo';
  };
  button.addEventListener('click', () => {
    if (dance) end('Demo stopped');
    else start();
  });
  const url = new URL(window.location.href);
  if (url.searchParams.get(DEMO_PARAM) === '1') {
    url.searchParams.delete(DEMO_PARAM);
    window.history.replaceState(null, '', url.href);
    setTimeout(start, AUTO_START_MS);
  }
  return {
    get running() {
      return !!dance;
    },
    step(dt) {
      if (!dance) return false;
      if (!dance.step(dt)) {
        end('Demo complete · Reset practice to try it yourself');
        return false;
      }
      say(dance.caption);
      return true;
    },
  };
}
