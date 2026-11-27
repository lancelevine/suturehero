import * as THREE from 'three';
import { estimateMarkerPose } from './markerPose';
import { bodyPoseFromMarker, trackerGeometry, type TrackerType } from './prismPose';
import type { MonoView } from './StereoFallback';
import { undistort, type StereoCalibration } from './stereoGeometry';

/**
 * Each camera's own estimate of an instrument's pose, for stereo fallback when the cameras
 * cannot be fused (moved out of src/tracking.ts, 2026-11-27). Markers are undistorted with that
 * camera's calibrated intrinsics and solved as single markers; camera 2's pose is brought into
 * camera 1's frame. The best-fitting marker per camera wins.
 */

/** Views older than this (ms) are not used. */
export const MONO_VIEW_MAX_AGE_MS = 180;
/** Single-marker fits worse than this (px, in the normalized image) are rejected. */
export const MONO_VIEW_MAX_ERROR_PX = 4;
/** Plausible tracker distance from the camera (mm). */
export const MONO_VIEW_MIN_DEPTH_MM = 30;
export const MONO_VIEW_MAX_DEPTH_MM = 3000;

/** Undistorted points are mapped into a 2000 px square image with a 1000 px focal length. */
const NORMALIZED_SIZE_PX = 2000;
const NORMALIZED_FOCAL_PX = 1000;

export interface CameraMarkers {
  /** When these markers were observed (performance.now()). */
  at: number;
  /** The camera image size the marker corners are in (px). */
  size: { width: number; height: number };
  markers: ReadonlyArray<{ id: number; corners: ReadonlyArray<{ x: number; y: number }> }>;
}

export function stereoMonoViews(calibration: StereoCalibration, ids: readonly number[], trackerType: TrackerType, cameras: readonly [CameraMarkers, CameraMarkers], now: number): MonoView[] {
  const R = calibration.stereo.rotation;
  const matrix = new THREE.Matrix4().set(R[0][0], R[0][1], R[0][2], 0, R[1][0], R[1][1], R[1][2], 0, R[2][0], R[2][1], R[2][2], 0, 0, 0, 0, 1);
  const inverse = new THREE.Quaternion().setFromRotationMatrix(matrix).invert();
  const translation = new THREE.Vector3(...(calibration.stereo.translationMm as [number, number, number]));
  return ([0, 1] as const).flatMap((camera) => {
    const { at, size, markers } = cameras[camera];
    if (now - at > MONO_VIEW_MAX_AGE_MS) return [];
    const intrinsics = camera ? calibration.camera2 : calibration.camera1;
    const candidates = markers
      .filter((m) => ids.includes(m.id))
      .map((marker) => {
        const corners = marker.corners.map((p) => {
          const [x, y] = undistort(p, intrinsics.cameraMatrix, intrinsics.distortionCoefficients, intrinsics.imageSize ?? calibration.imageSize, size);
          return { x: NORMALIZED_FOCAL_PX + x * NORMALIZED_FOCAL_PX, y: NORMALIZED_FOCAL_PX + y * NORMALIZED_FOCAL_PX };
        });
        const pose = estimateMarkerPose({ id: marker.id, corners }, NORMALIZED_SIZE_PX, NORMALIZED_SIZE_PX, trackerGeometry(trackerType).markerSizeMm, NORMALIZED_FOCAL_PX);
        if (!pose || pose.reprojectionError > MONO_VIEW_MAX_ERROR_PX) return null;
        const body = bodyPoseFromMarker(pose, ids.indexOf(marker.id), trackerType);
        if (body.translation.z < MONO_VIEW_MIN_DEPTH_MM || body.translation.z > MONO_VIEW_MAX_DEPTH_MM) return null;
        const axis = new THREE.Vector3(0, 0, 1);
        if (camera) {
          body.translation.sub(translation).applyQuaternion(inverse);
          body.quaternion.premultiply(inverse);
          axis.applyQuaternion(inverse);
        }
        return { position: body.translation, quaternion: body.quaternion, axis, at, camera, error: pose.reprojectionError };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.error - b.error);
    return candidates.length ? [candidates[0]] : [];
  });
}
