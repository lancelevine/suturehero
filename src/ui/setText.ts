/**
 * Set an element's text only when it differs (2026-11-27). Writing the same text still replaces
 * the text node and invalidates layout, which per-frame UI code otherwise does dozens of times
 * a second.
 */
export function setText(element: Pick<Element, 'textContent'> | null | undefined, text: string) {
  if (element && element.textContent !== text) element.textContent = text;
}
