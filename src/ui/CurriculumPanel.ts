import { CURRICULUM, loadDone, nextStep, setDone } from '../gameplay/curriculum';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** Training curriculum list (gameplay/curriculum.ts): each drill with a start link and a done box. */
export function mountCurriculumPanel(host: HTMLElement, storage: Storage | null, base: string) {
  const render = () => {
    const done = loadDone(storage);
    const next = nextStep(done);
    const title = document.createElement('h3');
    title.textContent = 'Training curriculum';
    const status = document.createElement('p');
    status.className = 'curriculum-status';
    status.textContent = next ? `${done.size}/${CURRICULUM.length} done · next: ${next.title}` : `All ${CURRICULUM.length} drills done`;
    const list = document.createElement('ol');
    list.className = 'curriculum-list';
    for (const step of CURRICULUM) {
      const item = document.createElement('li');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = done.has(step.id);
      box.setAttribute('aria-label', `Mark "${step.title}" done`);
      box.addEventListener('change', () => { setDone(storage, step.id, box.checked); render(); });
      const link = document.createElement('a');
      link.href = new URL(step.href, base).toString();
      link.textContent = step.title;
      item.append(box, ' ', link);
      list.append(item);
    }
    host.replaceChildren(title, status, list);
  };
  render();
}
