import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { describeTwist, ThreadTwist } from './threadTwist';

const roll = (turns: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), turns * Math.PI * 2);

describe('thread twist', () => {
  it('accumulates driver roll while holding and relaxes when released', () => {
    const twist = new ThreadTwist();
    for (let i = 0; i <= 40; i++) twist.update(roll(i * 0.1), true, 0.05);
    expect(twist.turns).toBeCloseTo(4, 5);
    expect(describeTwist(twist)).toContain('curl');
    for (let i = 0; i < 100; i++) twist.update(roll(0), false, 0.1);
    expect(twist.turns).toBe(0);
    expect(describeTwist(twist)).toBe('');
  });
});
