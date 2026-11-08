import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isTrackingStatus,
  parseJawOpening,
  parseTrackingFps,
  parseTrackingPose,
  publishTrackingMessage,
  TRACKING_MESSAGE,
} from './trackingMessages';

const pose = {
  type: TRACKING_MESSAGE.pose,
  instrument: 'needleDriver',
  position: [1, 2, 3],
  quaternion: [0, 0, 0, 1],
  seenAt: 5,
};

describe('pose messages', () => {
  it('accepts a well-formed pose', () => {
    expect(parseTrackingPose(pose)).toEqual(pose);
  });

  it.each([
    ['unknown instrument', { ...pose, instrument: 'retractor' }],
    ['wrong type', { ...pose, type: TRACKING_MESSAGE.fps }],
    ['short position', { ...pose, position: [1, 2] }],
    ['non-finite value', { ...pose, quaternion: [0, 0, Number.NaN, 1] }],
    ['string value', { ...pose, position: [1, '2', 3] }],
    ['null', null],
  ])('rejects %s', (_label, data) => {
    expect(parseTrackingPose(data)).toBeNull();
  });
});

describe('jaw opening messages', () => {
  const jaw = { type: TRACKING_MESSAGE.jawOpening, instrument: 'forceps', opening: 0.4, cameras: [1], seenAt: 1 };

  it('accepts and clamps the opening to 0–1', () => {
    expect(parseJawOpening(jaw)).toEqual({ instrument: 'forceps', opening: 0.4 });
    expect(parseJawOpening({ ...jaw, opening: 1.7 })?.opening).toBe(1);
    expect(parseJawOpening({ ...jaw, opening: -0.2 })?.opening).toBe(0);
  });

  it('rejects invalid openings and instruments', () => {
    expect(parseJawOpening({ ...jaw, opening: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parseJawOpening({ ...jaw, opening: '0.5' })).toBeNull();
    expect(parseJawOpening({ ...jaw, instrument: 'clamp' })).toBeNull();
    expect(parseJawOpening(pose)).toBeNull();
  });
});

describe('fps and status messages', () => {
  it('reads the frame rate', () => {
    expect(parseTrackingFps({ type: TRACKING_MESSAGE.fps, fps: 58 })).toBe(58);
    expect(parseTrackingFps({ type: TRACKING_MESSAGE.fps, fps: '58' })).toBeNull();
    expect(parseTrackingFps(pose)).toBeNull();
  });

  it('recognizes status messages', () => {
    expect(isTrackingStatus({ type: TRACKING_MESSAGE.status, state: 'mono' })).toBe(true);
    expect(isTrackingStatus(pose)).toBe(false);
    expect(isTrackingStatus(undefined)).toBe(false);
  });
});

describe('publishing', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('dispatches a window event named after the type when in the same page', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    const received: unknown[] = [];
    target.addEventListener(TRACKING_MESSAGE.pose, (event) => received.push((event as CustomEvent).detail));
    publishTrackingMessage(pose as Parameters<typeof publishTrackingMessage>[0], true);
    expect(received).toEqual([pose]);
  });

  it('posts to the parent window, same origin only, when tracking is its own page', () => {
    const postMessage = vi.fn();
    vi.stubGlobal('window', { parent: { postMessage } });
    vi.stubGlobal('location', { origin: 'https://example.test' });
    const fps = { type: TRACKING_MESSAGE.fps, fps: 30 } as const;
    publishTrackingMessage(fps, false);
    expect(postMessage).toHaveBeenCalledWith(fps, 'https://example.test');
  });
});

it('does not publish replay observations to live instruments or a parent window',()=>{
 const dispatchEvent=vi.fn(),postMessage=vi.fn();
 vi.stubGlobal('window',{sutureRecordedInput:{},dispatchEvent,parent:{postMessage}});
 try{publishTrackingMessage(pose as Parameters<typeof publishTrackingMessage>[0],true);publishTrackingMessage(pose as Parameters<typeof publishTrackingMessage>[0],false);expect(dispatchEvent).not.toHaveBeenCalled();expect(postMessage).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
