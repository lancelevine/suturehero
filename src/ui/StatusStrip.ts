import './statusStrip.css';
import type { ChecklistItem, ChecklistKey } from './trackingHealth';

/**
 * Main-screen status strip: the setup checklist (each item opens the step it
 * needs), a camera-moved warning, and short reasons when tracking is holding.
 * Placed above the practice view on the main page, or at the top of the
 * standalone tracking page.
 */

export interface StatusStripState {
  checklist: ChecklistItem[];
  warning: string | null;
  holding: string[];
}

/** Opens the place that fixes each checklist item. */
export type ChecklistActions = Record<ChecklistKey, () => void>;

/** Show at most this many holding reasons; the rest are in Diagnostics. */
const MAX_HOLDING_LINES = 3;

export function mountStatusStrip(parent: HTMLElement, before: Element | null, actions: ChecklistActions) {
  const strip = document.createElement('section');
  strip.id = 'tracking-status-strip';
  strip.className = 'tracking-status-strip';
  strip.setAttribute('aria-label', 'Tracking status');
  strip.hidden = true;
  const checklist = document.createElement('div');
  checklist.className = 'tracking-status-checklist';
  const warning = document.createElement('p');
  warning.className = 'tracking-status-warning';
  warning.setAttribute('role', 'alert');
  warning.hidden = true;
  const holding = document.createElement('ul');
  holding.className = 'tracking-status-holding';
  holding.setAttribute('aria-live', 'polite');
  strip.append(checklist, warning, holding);
  parent.insertBefore(strip, before);

  let lastChecklist = '';
  return {
    element: strip,
    update(state: StatusStripState) {
      strip.hidden = false;
      // Rebuild buttons only when something changed, so focus and hover are not lost twice a second.
      const checklistKey = JSON.stringify(state.checklist);
      if (checklistKey !== lastChecklist) {
        lastChecklist = checklistKey;
        checklist.replaceChildren(...state.checklist.map((item) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.statusItem = item.key;
          button.dataset.ok = String(item.ok);
          button.textContent = `${item.ok ? '✓' : '○'} ${item.label}`;
          button.title = item.detail;
          button.setAttribute('aria-label', `${item.label}: ${item.ok ? 'ready' : 'needs attention'} · ${item.detail}`);
          button.onclick = () => actions[item.key]();
          return button;
        }));
      }
      warning.hidden = !state.warning;
      warning.textContent = state.warning ?? '';
      // The strip is one fixed-height row (statusStrip.css); long text is cut with "…", full text on hover.
      warning.title = state.warning ?? '';
      const lines = state.holding.slice(0, MAX_HOLDING_LINES);
      if (holding.dataset.lines !== JSON.stringify(lines)) {
        holding.dataset.lines = JSON.stringify(lines);
        holding.title = lines.join('\n');
        holding.replaceChildren(...lines.map((text) => {
          const item = document.createElement('li');
          item.textContent = text;
          return item;
        }));
      }
    },
  };
}
