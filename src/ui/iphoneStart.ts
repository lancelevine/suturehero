/**
 * iPhone start-up (2026-11-15): with the iPhone camera type (src/input/cameraDevices.ts,
 * the default on an iPhone) the page opens straight into Production mode with a
 * large "Start back camera" button. iOS only starts the camera from a tap, so the
 * camera cannot start entirely by itself; one tap starts the rear 1× camera
 * (input/iphoneCamera.ts) through the tracking page's normal Start camera button.
 */

/** How long to wait for the tracking page's Start camera button to exist (ms). */
const START_BUTTON_WAIT_MS = 15000;
const POLL_MS = 100;

export function mountIphoneStart(stage: HTMLElement, openProduction: () => void) {
  openProduction();
  const overlay = document.createElement('div');
  overlay.className = 'iphone-start';
  overlay.innerHTML = '<button type="button">Start back camera</button><p>Hold the iPhone sideways on a stand, 25–35 cm from the instruments, in bright light.</p>';
  stage.append(overlay);
  const button = overlay.querySelector('button')!;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Starting…';
    const start = await waitForStartButton();
    if (!start) {
      button.disabled = false;
      button.textContent = 'Start back camera';
      overlay.querySelector('p')!.textContent = 'Camera tracking is still loading · tap again';
      return;
    }
    start.click();
    overlay.remove();
  });
  return overlay;
}

async function waitForStartButton(): Promise<HTMLButtonElement | null> {
  const started = performance.now();
  while (performance.now() - started < START_BUTTON_WAIT_MS) {
    const button = document.querySelector<HTMLButtonElement>('#start-camera');
    if (button && !button.disabled) return button;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return null;
}
