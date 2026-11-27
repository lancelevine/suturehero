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
