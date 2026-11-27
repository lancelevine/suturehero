import { Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { RenderedPoseState } from './RenderedPoseState';

it('keeps one filter per instrument until reset', () => {
  const state = new RenderedPoseState<string>();
  const first = state.filter('a', new Vector3(1, 0, 0), new Quaternion(), 0);
  expect(state.filter('a', new Vector3(1, 0, 0), new Quaternion(), 16)).toBe(first);
  expect(state.filter('b', new Vector3(), new Quaternion(), 16)).not.toBe(first);
  state.reset();
  expect(state.filter('a', new Vector3(1, 0, 0), new Quaternion(), 32)).not.toBe(first);
});

it('reports no fused pose without stereo or camera views', () => {
  const state = new RenderedPoseState<string>();
  expect(state.fuse('a', 0, undefined, [])).toBeNull();
});
