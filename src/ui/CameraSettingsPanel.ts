import { CAMERA_MODES, cameraControlScale, cameraMode, isUsableRange, setCameraMode, SLIDER_STEPS, type CameraModeId, type CameraRange } from '../input/cameraDevices';

export interface CameraSlot {
  label: string;
  stream: MediaStream | null;
}

const MODE_CONTROLS = [
  ['exposureMode', 'Exposure mode'],
  ['focusMode', 'Focus mode'],
] as const;

const RANGE_CONTROLS = [
  ['exposureTime', 'Exposure'],
  ['gain', 'Gain'],
  ['focusDistance', 'Focus distance'],
] as const;

function modeLabel(mode: string) {
  if (mode === 'continuous') return 'Auto';
  if (mode === 'manual') return 'Manual';
  return mode;
}

/**
 * The "Camera controls · type, focus & exposure" panel: per camera, the exposure,
 * gain and focus controls the browser exposes for that webcam. Many UVC
 * drivers expose fewer controls to browsers than to tools such as OBS.
 *
 * Returns a render function; call it whenever a camera starts or stops.
 */
export function createCameraSettingsPanel(container: HTMLElement, cameras: () => CameraSlot[]) {
  /** Camera type: which video mode to request (applies when a camera is started). */
  function cameraTypeRow() {
    const row = document.createElement('div');
    row.className = 'tracking-actions';
    const label = document.createElement('label');
    label.textContent = 'Camera type ';
    const select = document.createElement('select');
    select.dataset.cameraType = '';
    for (const [id, mode] of Object.entries(CAMERA_MODES)) select.append(new Option(mode.label, id));
    select.value = cameraMode();
    const note = document.createElement('p');
    note.className = 'tracking-message';
    const describe = () => {
      const mode = CAMERA_MODES[select.value as CameraModeId];
      note.textContent = `Requests ${mode.width}×${mode.height} at ${mode.frameRate} fps. Stop and start each camera to apply.` + (mode.monochrome ? ' Monochrome: use white or striped jaw balls, or the handle prism; coloured balls cannot work.' : '');
    };
    select.addEventListener('change', () => {
      setCameraMode(select.value as CameraModeId);
      describe();
    });
    describe();
    label.append(select);
    row.append(label);
    return [row, note];
  }

  function render() {
    container.replaceChildren(...cameraTypeRow());
    for (const { label, stream } of cameras()) {
      container.append(cameraSection(label, stream));
    }
  }

  function cameraSection(label: string, stream: MediaStream | null) {
    const section = document.createElement('div');
    section.className = 'camera-settings-group';
    const heading = document.createElement('strong');
    heading.textContent = label;
    section.append(heading);

    const track = stream?.getVideoTracks()[0];
    if (!track) {
      const note = document.createElement('p');
      note.textContent = 'Start camera to configure.';
      section.append(note);
      return section;
    }

    const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
    const settings = track.getSettings() as Record<string, unknown>;

    for (const [key, title] of MODE_CONTROLS) {
      const supported = Array.isArray(capabilities?.[key]) ? (capabilities[key] as string[]) : [];
      if (supported.length) section.append(modeRow(track, key, title, supported, settings));
    }
    for (const [key, title] of RANGE_CONTROLS) {
      const range = capabilities?.[key] as CameraRange | undefined;
      if (isUsableRange(range)) section.append(rangeRow(track, key, title, range, settings));
    }

    if (section.children.length === 1) {
      const note = document.createElement('p');
      note.textContent = 'Manual exposure, gain and focus controls are unavailable for this camera/browser.';
      section.append(note);
    }
    return section;
  }

  function modeRow(
    track: MediaStreamTrack,
    key: string,
    title: string,
    supported: string[],
    settings: Record<string, unknown>,
  ) {
    const row = document.createElement('label');
    row.className = 'camera-settings-row';
    const name = document.createElement('span');
    name.textContent = title;
    const select = document.createElement('select');
    for (const mode of supported) {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = modeLabel(mode);
      select.append(option);
    }
    select.value = typeof settings[key] === 'string' ? (settings[key] as string) : supported[0];
    select.addEventListener('change', async () => {
      try {
        await track.applyConstraints({ advanced: [{ [key]: select.value }] as MediaTrackConstraintSet[] });
        render();
      } catch {
        select.value = String(track.getSettings()[key as keyof MediaTrackSettings] ?? supported[0]);
      }
    });
    row.append(name, select);
    return row;
  }

  function rangeRow(
    track: MediaStreamTrack,
    key: string,
    title: string,
    range: CameraRange,
    settings: Record<string, unknown>,
  ) {
    const scale = cameraControlScale(key, range);
    const row = document.createElement('label');
    row.className = 'camera-settings-row';
    const name = document.createElement('span');
    name.textContent = title;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(SLIDER_STEPS);
    slider.step = '1';
    const current = typeof settings[key] === 'number' ? (settings[key] as number) : range.min;
    slider.value = String(Math.round(Math.max(0, Math.min(1, scale.toFraction(current))) * SLIDER_STEPS));
    const output = document.createElement('output');
    output.textContent = String(scale.quantize(current));

    const sliderValue = () => scale.quantize(scale.toValue(Number(slider.value) / SLIDER_STEPS));
    const display = (value: number) => String(Number(value.toPrecision(6)));
    slider.addEventListener('input', () => {
      output.textContent = display(sliderValue());
    });
    slider.addEventListener('change', async () => {
      const value = sliderValue();
      output.textContent = display(value);
      try {
        await track.applyConstraints({ advanced: [{ [key]: value }] as MediaTrackConstraintSet[] });
      } catch {
        output.textContent = 'Unsupported';
      }
    });
    row.append(name, slider, output);
    return row;
  }

  return render;
}
