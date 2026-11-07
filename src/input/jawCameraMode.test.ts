import {expect,it} from 'vitest';
import {jawCameraParticipates} from './jawCameraMode';
it('ignores a running or previously configured secondary camera in mono mode',()=>{expect([0,1].filter(c=>jawCameraParticipates('mono',c))).toEqual([0]);});
it('allows both configured views in stereo mode',()=>{expect([0,1,2].filter(c=>jawCameraParticipates('stereo',c))).toEqual([0,1]);});
