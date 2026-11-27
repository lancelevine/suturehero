import { expect, it, vi } from 'vitest';
import { startBothCameras, type StartBothCamerasDeps } from './startBothCameras';

const control = () => Object.assign(new EventTarget(), { value: '', checked: false });

function deps(overrides: Partial<StartBothCamerasDeps> = {}) {
  const status: string[] = [];
  const d: StartBothCamerasDeps = {
    trackingMode: control() as never, simulation: Object.assign(control(), { checked: true }) as never, stereoEnabled: control() as never,
    refreshCameraLists: vi.fn(async () => {}),
    selectedCameras: () => ({ first: 'a', second: 'b' }),
    running: () => false,
    startPrimary: vi.fn(async () => {}), startSecondary: vi.fn(async () => {}),
    calibrated: () => false,
    setStatus: (text) => status.push(text),
    ...overrides,
  };
  return { d, status };
}

it('switches to two calibrated cameras and starts both', async () => {
  const { d, status } = deps();
  const changes = vi.fn();
  d.trackingMode.addEventListener('change', changes);
  await startBothCameras(d);
  expect([d.trackingMode.value, d.simulation.checked, d.stereoEnabled.checked]).toEqual(['stereo', false, true]);
  expect(changes).toHaveBeenCalledOnce();
  expect(d.startPrimary).toHaveBeenCalled();
  expect(d.startSecondary).toHaveBeenCalled();
  expect(status.at(-1)).toMatch(/Import a solved stereo calibration/);
});

it('asks for a second camera instead of starting the same one twice', async () => {
  const { d, status } = deps({ selectedCameras: () => ({ first: 'a', second: 'a' }) });
  await startBothCameras(d);
  expect(d.startPrimary).not.toHaveBeenCalled();
  expect(status.at(-1)).toMatch(/^Select a second camera/);
});

it('reports a failed start', async () => {
  const { d, status } = deps({ startSecondary: async () => { throw new Error('busy'); } });
  await startBothCameras(d);
  expect(status.at(-1)).toBe('Stereo start failed: Error: busy');
});
