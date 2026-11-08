import type { EngineAPI } from './engine';
import type { Session, Frame, ReplayProcessor } from './model';
/** Recreate the entire tracking context on reset, including every worker and filter. */
export class RecordedFrameProcessor implements ReplayProcessor {
    private iframe?: HTMLIFrameElement;
    private api?: EngineAPI;
    constructor(private session: Session) { }
    async reset() {
        this.dispose();
        const iframe = document.createElement('iframe');
        this.iframe = iframe;
        iframe.title = 'Isolated tracking processor';iframe.tabIndex=-1;iframe.inert=true;iframe.setAttribute('aria-hidden','true');
        iframe.className = 'tracking-lab-engine';
        const loaded = new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Tracking processor failed to load')), 20000); iframe.onload = () => { clearTimeout(timer); resolve(); }; iframe.onerror = () => { clearTimeout(timer); reject(new Error('Tracking processor unavailable')); }; });
        iframe.src = new URL('./tracking-engine.html', document.baseURI).href;
        document.body.append(iframe);
        await loaded;
        this.api = (iframe.contentWindow as Window).sutureLabEngine;
        if (!this.api)
            throw new Error('Tracking processor initialization failed');
        await this.api.initialize(this.session);
    }
    async process(frame: Frame) { if (!this.api)
        throw new Error('Processor has not been reset'); return this.api.process(frame); }
    dispose() { this.api?.dispose(); this.api = undefined; this.iframe?.remove(); this.iframe = undefined; }
}
