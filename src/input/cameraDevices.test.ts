import { describe, expect, it } from 'vitest';
import {
  CAMERA_REQUEST,
  cameraConstraints,
  cameraControlScale,
  cameraOptions,
  isUsableRange,
  rememberCamera,
  savedCamera,
} from './cameraDevices';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('camera constraints', () => {
  it('requests the configured mode as ideal values, with an exact device when given', () => {
    const video = cameraConstraints('cam-1', CAMERA_REQUEST).video as MediaTrackConstraints;
    expect(video.deviceId).toEqual({ exact: 'cam-1' });
    expect(video.width).toEqual({ ideal: CAMERA_REQUEST.width });
    expect(video.height).toEqual({ ideal: CAMERA_REQUEST.height });
    expect(video.frameRate).toEqual({ ideal: CAMERA_REQUEST.frameRate });
    expect(cameraConstraints('cam-1').audio).toBe(false);
  });

  it('lets the browser choose the default device when none is selected', () => {
    expect((cameraConstraints().video as MediaTrackConstraints).deviceId).toBeUndefined();
    expect((cameraConstraints('').video as MediaTrackConstraints).deviceId).toBeUndefined();
  });
});

describe('remembered cameras', () => {
  it('saves, reads and forgets a device per slot', () => {
    const storage = memoryStorage();
    expect(savedCamera('slot', storage)).toBe('');
    rememberCamera('slot', 'device-a', storage);
    expect(savedCamera('slot', storage)).toBe('device-a');
    rememberCamera('slot', '', storage);
    expect(storage.values.has('slot')).toBe(false);
  });

  it('tolerates storage that throws or is missing', () => {
    const broken = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(savedCamera('slot', broken)).toBe('');
    expect(() => rememberCamera('slot', 'x', broken)).not.toThrow();
    expect(savedCamera('slot', undefined)).toBe('');
  });
});

describe('camera select options', () => {
  const devices = [
    { deviceId: 'a', label: 'USB Camera' },
    { deviceId: 'b', label: '' },
  ];

  it('lists a placeholder, then devices, numbering unlabeled ones', () => {
    const { options } = cameraOptions(devices, '', 'Default camera');
    expect(options).toEqual([
      { value: '', label: 'Default camera' },
      { value: 'a', label: 'USB Camera' },
      { value: 'b', label: 'Camera 2' },
    ]);
  });

  it('keeps the previous choice only while that device is connected', () => {
    expect(cameraOptions(devices, 'b', 'x').selected).toBe('b');
    expect(cameraOptions(devices, 'unplugged', 'x').selected).toBe('');
  });
});

describe('camera control sliders', () => {
  it('uses a logarithmic exposure scale that round-trips', () => {
    const scale = cameraControlScale('exposureTime', { min: 1, max: 10000 });
    expect(scale.logarithmic).toBe(true);
    expect(scale.toValue(0)).toBeCloseTo(1);
    expect(scale.toValue(0.5)).toBeCloseTo(100);
    expect(scale.toValue(1)).toBeCloseTo(10000);
    expect(scale.toFraction(100)).toBeCloseTo(0.5);
  });

  it('falls back to linear exposure when the minimum is zero, and for other controls', () => {
    expect(cameraControlScale('exposureTime', { min: 0, max: 100 }).logarithmic).toBe(false);
    const gain = cameraControlScale('gain', { min: 0, max: 200 });
    expect(gain.logarithmic).toBe(false);
    expect(gain.toValue(0.25)).toBe(50);
    expect(gain.toFraction(150)).toBe(0.75);
  });

  it('clamps to the range and snaps to the camera step', () => {
    const scale = cameraControlScale('gain', { min: 10, max: 100, step: 5 });
    expect(scale.quantize(23)).toBe(25);
    expect(scale.quantize(-50)).toBe(10);
    expect(scale.quantize(500)).toBe(100);
    expect(cameraControlScale('gain', { min: 0, max: 1 }).quantize(0.123)).toBe(0.123);
  });

  it('rejects unusable capability ranges', () => {
    expect(isUsableRange({ min: 0, max: 10 })).toBe(true);
    expect(isUsableRange(undefined)).toBe(false);
    expect(isUsableRange({ min: 5, max: 5 })).toBe(false);
    expect(isUsableRange({ min: Number.NaN, max: 1 })).toBe(false);
  });
});

describe('camera type', () => {
  it('defaults to the current webcams and requests 1280×800 @ 120 fps for the OV9281', async () => {
    const { cameraMode, cameraRequest, setCameraMode, parseCameraMode, CAMERA_MODES } = await import('./cameraDevices');
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    expect(cameraMode(storage)).toBe('webcam1080');
    setCameraMode('ov9281', storage);
    expect(cameraRequest(storage)).toMatchObject({ width: 1280, height: 800, frameRate: 120, monochrome: true });
    const video = cameraConstraints('x', cameraRequest(storage)).video as MediaTrackConstraints;
    expect(video.frameRate).toEqual({ ideal: 120 });
    expect(parseCameraMode('nonsense')).toBe('webcam1080');
    expect(CAMERA_MODES.webcam1080.frameRate).toBe(30);
  });
});
