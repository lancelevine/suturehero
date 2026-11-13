import './production.css';
import { movableView } from '../trackingLab/liveView';

/**
 * Production mode: a polished full-screen presentation of the practice scene
 * for demos (Lance, 2026-11-13). The simulator's live 3D view (#viewport,
 * driven by camera tracking as usual) is moved into a full-screen overlay
 * with a minimal title bar and the current exercise step; setup,
 * calibration and diagnostics stay out of sight. Esc or "Exit" returns.
 */

/** Elements whose text is mirrored into the production overlay. */
const MIRRORED = {
  procedure: '.scene-heading h2',
  step: '#exercise-title',
  progress: '#progress-label',
} as const;

export function mountProductionMode(app: HTMLElement) {
  const pane = document.createElement('section');
  pane.id = 'production-mode';
  pane.className = 'production-mode';
  pane.hidden = true;
  pane.setAttribute('aria-label', 'Production view');
  pane.innerHTML = `<header class="production-bar">
  <div class="production-brand"><img src="./suturehero-emblem.svg" alt="" aria-hidden="true"><span>Suture<b>Hero</b></span></div>
  <div class="production-title"><strong data-production="procedure"></strong><span data-production="step"></span></div>
  <div class="production-actions"><button type="button" data-production-fullscreen>Full screen</button><button type="button" data-production-exit>Exit</button></div>
</header>
<div class="production-stage"></div>
<footer class="production-footer"><span data-production="progress"></span></footer>`;
  app.append(pane);

  const stage = pane.querySelector<HTMLElement>('.production-stage')!;
  const view = movableView(document.querySelector<HTMLElement>('#viewport'), stage);

  const mirror = () => {
    for (const [key, selector] of Object.entries(MIRRORED)) {
      const target = pane.querySelector<HTMLElement>(`[data-production="${key}"]`)!;
      target.textContent = document.querySelector(selector)?.textContent?.trim() ?? '';
    }
  };
  const observer = new MutationObserver(mirror);

  const tab = document.createElement('button');
  tab.className = 'lab-tab production-tab';
  tab.textContent = 'Production';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', 'false');
  tab.setAttribute('aria-controls', pane.id);
  const tabs = app.querySelector('.workspace-lab-tabs');
  tabs?.append(tab);

  const setOpen = (open: boolean) => {
    if (open === !pane.hidden) return;
    if (open) {
      // Leave Tracking Lab first so the 3D view is back in the simulator before it moves here.
      const simulatorTab = Array.from(tabs?.querySelectorAll<HTMLButtonElement>('.lab-tab') ?? []).find((b) => b.textContent === 'Simulator');
      if (document.body.classList.contains('tracking-lab-active')) simulatorTab?.click();
      for (const selector of Object.values(MIRRORED)) {
        const source = document.querySelector(selector);
        if (source) observer.observe(source, { childList: true, characterData: true, subtree: true });
      }
      mirror();
    } else {
      observer.disconnect();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    }
    pane.hidden = !open;
    document.body.classList.toggle('production-active', open);
    tab.setAttribute('aria-selected', String(open));
    view.show(open);
  };

  tab.addEventListener('click', () => setOpen(true));
  pane.querySelector('[data-production-exit]')!.addEventListener('click', () => setOpen(false));
  pane.querySelector('[data-production-fullscreen]')!.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  });
  // Capture phase: the practice page's own keyboard handlers must not swallow Esc first.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !pane.hidden && !document.fullscreenElement) setOpen(false);
  }, true);
  return { open: () => setOpen(true), close: () => setOpen(false) };
}
