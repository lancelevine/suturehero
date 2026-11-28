/** Training curriculum (roadmap). An ordered list of the app's drills, from basics to exams, with
 * a link that starts each one and a done mark the trainee sets, kept in this browser. */
export const CURRICULUM_KEY = 'suturehero.curriculum.v1';

export interface CurriculumStep { id: string; title: string; href: string }

export const CURRICULUM: readonly CurriculumStep[] = [
  { id: 'warmup', title: 'Sandbox warm-up: 5 minutes of free passes', href: '?environment=skin' },
  { id: 'landmark', title: 'Landmark exercise: line up the first stitch', href: '?environment=skin&exercise=landmark' },
  { id: 'interrupted', title: 'Simple interrupted closure on the forearm', href: '?environment=skin&site=forearm' },
  { id: 'unequal', title: 'Unequal edges: spread the extra length', href: '?environment=skin&exercise=unequal' },
  { id: 'running', title: 'Running and locked running stitch, then tie off', href: '?environment=skin' },
  { id: 'tension', title: 'Back under tension: surgeon\'s start, middle first', href: '?environment=skin&site=back' },
  { id: 'fragile', title: 'Fragile skin: gentle bites without cutting through', href: '?environment=skin&site=fragile' },
  { id: 'endurance', title: 'Endurance: 20 passes without drift', href: '?environment=skin&exercise=endurance' },
  { id: 'artery', title: 'Microsurgery: artery anastomosis', href: '?environment=microsurgery&target=artery' },
  { id: 'supermicro', title: 'Supermicrosurgery: 0.6 mm lymphatic vessel', href: '?environment=microsurgery&target=supermicro' },
  { id: 'exam', title: 'Exam: 10 minutes, no hints', href: '?environment=skin&exercise=exam' },
];

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function loadDone(storage: Storage | null): Set<string> {
  try { const list = JSON.parse(storage?.getItem(CURRICULUM_KEY) ?? '[]'); return new Set(Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}
export function setDone(storage: Storage | null, id: string, done: boolean) {
  const set = loadDone(storage);
  if (done) set.add(id); else set.delete(id);
  try { storage?.setItem(CURRICULUM_KEY, JSON.stringify([...set])); } catch { /* storage unavailable */ }
  return set;
}
export function nextStep(done: ReadonlySet<string>) {
  return CURRICULUM.find((s) => !done.has(s.id)) ?? null;
}
