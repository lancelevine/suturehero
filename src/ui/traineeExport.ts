/**
 * Shared pieces of the results exports (2026-11-26): the trainee name or ID (one saved value,
 * kept in step across every field that shows it) and downloading a text file.
 */
export const TRAINEE_STORAGE_KEY = 'suturehero.trainee.v1';
const TRAINEE_CHANGED_EVENT = 'suturehero:trainee-changed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'> | null;

export function readTrainee(storage: StorageLike): string {
  try {
    return storage?.getItem(TRAINEE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Show the saved trainee in `input`, save edits, and follow edits made in other fields. */
export function bindTraineeInput(input: HTMLInputElement, storage: StorageLike) {
  input.value = readTrainee(storage);
  input.addEventListener('change', () => {
    const value = input.value.trim();
    try {
      storage?.setItem(TRAINEE_STORAGE_KEY, value);
    } catch {
      // Storage blocked: the name still goes into exports from this page.
    }
    window.dispatchEvent(new CustomEvent(TRAINEE_CHANGED_EVENT, { detail: value }));
  });
  window.addEventListener(TRAINEE_CHANGED_EVENT, (event) => {
    const value = (event as CustomEvent<string>).detail;
    if (input.value.trim() !== value) input.value = value;
  });
  return () => input.value.trim();
}

/** File name for an export: suturehero-<kind>[-<trainee>]-<timestamp>.<extension>. */
export function exportFileName(kind: string, trainee: string, extension: string, at = new Date()) {
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return `suturehero-${kind}${trainee ? '-' + trainee.replace(/[^\w-]+/g, '_') : ''}-${stamp}.${extension}`;
}

export function downloadText(text: string, type: string, name: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
