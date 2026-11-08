import type { Frame, Session } from './model';
const request = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const complete = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Local storage transaction failed')); });
export class RecordingStore {
    private database?: Promise<IDBDatabase>;
    private db() { return this.database ??= new Promise((resolve, reject) => { const r = indexedDB.open('suturehero-tracking-lab', 1); r.onupgradeneeded = () => { r.result.createObjectStore('sessions', { keyPath: 'id' }); r.result.createObjectStore('frames', { keyPath: ['session', 'index'] }).createIndex('session', 'session'); }; r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); resolve(r.result); }; r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('Close other SutureHero tabs to update recording storage')); }); }
    async save(session: Session) { const tx = (await this.db()).transaction('sessions', 'readwrite'); tx.objectStore('sessions').put(session); await complete(tx); }
    async append(frame: Frame) { const tx = (await this.db()).transaction('frames', 'readwrite'); tx.objectStore('frames').put(frame); await complete(tx); }
    async list() { return (await request((await this.db()).transaction('sessions').objectStore('sessions').getAll()) as Session[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    async frames(id: string) { return request((await this.db()).transaction('frames').objectStore('frames').index('session').getAll(id)) as Promise<Frame[]>; }
    async delete(id: string) { const tx = (await this.db()).transaction(['sessions', 'frames'], 'readwrite'); tx.objectStore('sessions').delete(id); const r = tx.objectStore('frames').index('session').openKeyCursor(IDBKeyRange.only(id)); r.onsuccess = () => { const c = r.result; if (c) {
        tx.objectStore('frames').delete(c.primaryKey);
        c.continue();
    } }; await complete(tx); }
    async recover() { for (const s of await this.list())
        if (s.status === 'recording') {
            const frames = await this.frames(s.id);
            s.status = 'partial';
            s.frames = frames.length;
            s.bytes = frames.reduce((a, f) => a + f.image.size, 0);
            s.duration = Math.max(0, ...frames.map(f => f.at));
            s.note = 'Interrupted recording recovered';
            await this.save(s);
        } }
}
