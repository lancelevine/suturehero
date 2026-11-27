/**
 * Set an element's text only when it differs (2026-11-27). Writing the same text still replaces
 * the text node and invalidates layout, which per-frame UI code otherwise does dozens of times
 * a second.
 */
export function setText(element: Pick<Element, 'textContent'> | null | undefined, text: string) {
  if (element && element.textContent !== text) element.textContent = text;
}

/** Set `hidden` only when it changes: assigning the same value still rewrites the attribute (a DOM mutation) in Chromium. */
export function setHidden(element: { hidden: boolean } | null | undefined, hidden: boolean) {
  if (element && element.hidden !== hidden) element.hidden = hidden;
}

/** Set `disabled` only when it changes (same reason as setHidden). */
export function setDisabled(element: { disabled: boolean } | null | undefined, disabled: boolean) {
  if (element && element.disabled !== disabled) element.disabled = disabled;
}

/** Set a `data-*` value only when it changes (same reason as setHidden). */
export function setData(element: HTMLElement | null | undefined, key: string, value: string) {
  if (element && element.dataset[key] !== value) element.dataset[key] = value;
}

/** Set an attribute only when its value changes (same reason as setHidden). */
export function setAttr(element: Element | null | undefined, name: string, value: string) {
  if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
}

const lastMarkup = new WeakMap<Element, string>();
/**
 * Replace an element's markup only when it differs from what this function last wrote there
 * (remembered per element, since reading innerHTML back would serialise the subtree).
 */
export function setMarkup(element: Element | null | undefined, html: string) {
  if (!element || lastMarkup.get(element) === html) return;
  element.innerHTML = html;
  lastMarkup.set(element, html);
}
