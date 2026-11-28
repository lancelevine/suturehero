/** Shareable highlight clips (roadmap). Records the practice view canvas for a fixed time and
 * downloads it as a WebM video. Only the 3D view is recorded, not the HTML HUD around it. */
export const CLIP_SECONDS = 15;
export const CLIP_FPS = 30;

/** First container/codec the browser can record, or null when recording is unsupported. */
export function clipMimeType(isSupported: (type: string) => boolean): string | null {
  for (const type of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (isSupported(type)) return type;
  return null;
}

export function clipFileName(now: Date) {
  return `suturehero-clip-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
}

/** Lines drawn over the clip (title, timer, instruction). Pixels of padding and line height. */
const OVERLAY_PAD = 16;
const OVERLAY_LINE = 22;

/** Wraps `text` to lines no wider than `width` using `measure`. */
export function wrapLines(text: string, width: number, measure: (s: string) => number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Mounts a "Record 15 s clip" button that records `canvas` with the HUD text from `overlay()` drawn
 * over it, and downloads the result. Call the returned `afterRender()` right after each render. */
export function mountClipButton(host: Element, canvas: HTMLCanvasElement, overlay: () => { title: string; timer: string; instruction: string } = () => ({ title: '', timer: '', instruction: '' })) {
  const composite = document.createElement('canvas');
  const context = composite.getContext('2d');
  let recording = false;
  const afterRender = () => {
    if (!recording || !context) return;
    if (composite.width !== canvas.width || composite.height !== canvas.height) { composite.width = canvas.width; composite.height = canvas.height; }
    context.drawImage(canvas, 0, 0);
    const scale = Math.max(1, canvas.width / 1200);
    const { title, timer, instruction } = overlay();
    context.font = `600 ${Math.round(18 * scale)}px system-ui, sans-serif`;
    const lines = [title && timer ? `${title} · ${timer}` : title || timer, ...wrapLines(instruction, canvas.width - 2 * OVERLAY_PAD * scale, (s) => context.measureText(s).width).slice(0, 3)].filter(Boolean);
    if (!lines.length) return;
    const boxHeight = (lines.length * OVERLAY_LINE + OVERLAY_PAD) * scale;
    context.fillStyle = 'rgba(6, 14, 28, 0.72)';
    context.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
    context.fillStyle = '#e8f6ff';
    lines.forEach((line, i) => context.fillText(line, OVERLAY_PAD * scale, canvas.height - boxHeight + (OVERLAY_PAD / 2 + OVERLAY_LINE * (i + 0.75)) * scale));
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vessel-turn';
  button.textContent = `Record ${CLIP_SECONDS} s clip`;
  button.title = 'Record the practice view for 15 seconds, with the title, timer and instructions, and download it as a video';
  const Recorder = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  const mime = Recorder ? clipMimeType((t) => Recorder.isTypeSupported(t)) : null;
  if (!Recorder || !mime || !context || typeof composite.captureStream !== 'function') {
    button.disabled = true;
    button.title = 'Clip recording is not supported in this browser';
  }
  button.addEventListener('click', () => {
    if (!Recorder || !mime) return;
    recording = true;
    afterRender();
    const stream = composite.captureStream(CLIP_FPS);
    const recorder = new Recorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      recording = false;
      stream.getTracks().forEach((track) => track.stop());
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      link.download = clipFileName(new Date());
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      button.disabled = false;
      button.textContent = `Record ${CLIP_SECONDS} s clip`;
    };
    recorder.start();
    button.disabled = true;
    let left = CLIP_SECONDS;
    button.textContent = `Recording… ${left} s`;
    const timer = setInterval(() => {
      left--;
      button.textContent = `Recording… ${left} s`;
      if (left <= 0) { clearInterval(timer); recorder.stop(); }
    }, 1000);
  });
  host.prepend(button);
  return { button, afterRender };
}
