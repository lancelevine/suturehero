import { expect, it } from 'vitest';
import { MistakeLog } from './replayTimeline';

it('places recent mistakes along the replay window', () => {
  const log = new MistakeLog(30);
  log.add(5, 'tear');
  log.add(15, 'tip collision');
  log.add(50, 'blind exit');
  expect(log.mistakes.map((m) => m.label)).toEqual(['blind exit']);
  const fresh = new MistakeLog();
  fresh.add(12, 'tear');
  expect(fresh.within({ start: 10, end: 20 })).toEqual([{ at: 0.2, label: 'tear' }]);
  expect(fresh.within(null)).toEqual([]);
});
