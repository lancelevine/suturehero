import { Quaternion, Vector3 } from 'three';
import { bodyToModel, levelJawPose, modelPose } from './jawRoll';
import { tipPosition } from './pivotCalibration';
import { alignShaft } from './sharedTipFrame';
import type { StereoTipCalibration } from './stereoTipCalibration';
import { workspacePracticePosition, type StereoWorkspace } from './stereoWorkspace';
import { tableOffsetUnits } from './tableHeight';


/** A stereo-tracked ring pose (mm, camera frame). */
export interface RingPose {
  position: Vector3;
  quaternion: Quaternion;
}

/**
 * A stereo instrument in the shared practice frame (moved out of src/tracking.ts, 2026-11-27):
 * with a calibrated tip, the instrument sits at its real tip, shifted so the table is the skin
 * surface (src/input/tableHeight.ts). Its orientation follows the saved jaw orientation
 * (src/input/jawRoll.ts) when there is one, else `fallbackQuaternion` with the shaft turned to
 * point from the tip toward the ring. A pending "capture jaw orientation" request is saved here.
 * Returns null without a calibrated tip.
 */
export function stereoTipPose(
  name: string,
  ring: RingPose,
  trackerType: string,
  calibration: Pick<StereoTipCalibration, 'tip' | 'takeJawRequest' | 'saveJawOrientation' | 'jawOrientation'>,
  workspace: StereoWorkspace | null,
  tablePoints: Parameters<typeof tableOffsetUnits>[0],
  fallbackQuaternion: Quaternion,
): { position: Vector3; quaternion: Quaternion; tipMm: Vector3 } | null {
  const tipInBody = calibration.tip(name, trackerType);
  if (!tipInBody) return null;
  const tipMm = tipPosition(ring, tipInBody);
  const tableShift = new Vector3(0, tableOffsetUnits(tablePoints, workspace), 0);
  const tipScene = workspacePracticePosition(tipMm, workspace).add(tableShift);
  const ringScene = workspacePracticePosition(ring.position, workspace).add(tableShift);
  const shaftScene = ringScene.clone().sub(tipScene);
  const jawRequest = calibration.takeJawRequest(name);
  if (jawRequest) {
    const level = levelJawPose(shaftScene);
    calibration.saveJawOrientation(name, jawRequest, level ? bodyToModel(ring.quaternion, workspace, level) : null);
  }
  const jawOrientation = calibration.jawOrientation(name, trackerType);
  const quaternion = jawOrientation ? modelPose(ring.quaternion, workspace, jawOrientation) : alignShaft(fallbackQuaternion, shaftScene);
  return { position: tipScene, quaternion, tipMm };
}
