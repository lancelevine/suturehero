import { describe, expect, it } from 'vitest';
import { describeNextDrill, nextDrill } from './nextDrill';

describe('adaptive next drill', () => {
  it('targets the first missed target', () => {
    const results = [
      { label: 'Bite 3–6 mm', met: true, detail: 'mean 4' },
      { label: 'Tears ≤ 0', met: false, detail: '2 torn' },
      { label: 'Even spacing (within 2 mm)', met: false, detail: 'spread 4' },
    ];
    expect(nextDrill(results)?.title).toContain('slow passes');
    expect(describeNextDrill(results)).toContain('Tears ≤ 0 missed');
    expect(describeNextDrill([{ label: 'Bite 3–6 mm', met: true, detail: '' }])).toContain('Endurance');
    expect(describeNextDrill([{ label: 'Bite 3–6 mm', met: null, detail: '' }])).toBe('');
  });
});
