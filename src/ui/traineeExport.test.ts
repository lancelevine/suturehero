import { expect, it } from 'vitest';
import { exportFileName, readTrainee, TRAINEE_STORAGE_KEY } from './traineeExport';

it('names export files by kind, trainee (made file-safe) and time', () => {
  const at = new Date(Date.UTC(2026, 10, 26, 9, 5, 7, 120));
  expect(exportFileName('course', 'Resident, A', 'csv', at)).toBe('suturehero-course-Resident_A-2026-11-26T09-05-07-120Z.csv');
  expect(exportFileName('stitches', '', 'csv', at)).toBe('suturehero-stitches-2026-11-26T09-05-07-120Z.csv');
});

it('reads the saved trainee, or nothing when storage is missing or blocked', () => {
  expect(readTrainee({ getItem: (key) => (key === TRAINEE_STORAGE_KEY ? 'R2' : null), setItem: () => undefined })).toBe('R2');
  expect(readTrainee(null)).toBe('');
  expect(readTrainee({ getItem: () => { throw new Error('blocked'); }, setItem: () => undefined })).toBe('');
});
