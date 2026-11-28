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

/** Mounts a "Record 15 s clip" button that records `canvas` and downloads the result. */
export function mountClipButton(host: Element, canvas: HTMLCanvasElement) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vessel-turn';
  button.textContent = `Record ${CLIP_SECONDS} s clip`;
  button.title = 'Record the practice view for 15 seconds and download it as a video (the side panels are not included)';
  const Recorder = (globalThis as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  const mime = Recorder ? clipMimeType((t) => Recorder.isTypeSupported(t)) : null;
  if (!Recorder || !mime || typeof canvas.captureStream !== 'function') {
    button.disabled = true;
    button.title = 'Clip recording is not supported in this browser';
  }
  button.addEventListener('click', () => {
    if (!Recorder || !mime) return;
    const stream = canvas.captureStream(CLIP_FPS);
    const recorder = new Recorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
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
  return button;
}
