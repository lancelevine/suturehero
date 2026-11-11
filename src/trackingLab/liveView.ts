/**
 * Shows the simulator's 3D view (the virtual instruments) inside Tracking Lab
 * while the Lab is open, so Lance can see what tracking makes of what he is
 * recording. The simulator's #viewport element is moved into the Lab and put
 * back, in place, when the Lab closes; the view resizes itself to fit (its
 * ResizeObserver in src/scene/createScene.ts).
 */
export interface MovableView {
  /** Moves the view into `slot` (true) or back to where it came from (false). */
  show(inLab: boolean): void;
}

export function movableView(view: HTMLElement | null, slot: HTMLElement): MovableView {
  const home = view?.parentElement ?? null;
  const placeholder = document.createComment('viewport home');
  return {
    show(inLab) {
      if (!view || !home) return;
      if (inLab && view.parentElement !== slot) {
        view.replaceWith(placeholder);
        slot.append(view);
      } else if (!inLab && view.parentElement === slot) {
        placeholder.replaceWith(view);
      }
    },
  };
}

/** Whether the simulator view is currently inside Tracking Lab (it keeps rendering there). */
export function viewInLab(): boolean {
  return document.querySelector('#tracking-lab #viewport') !== null;
}
