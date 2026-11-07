#!/usr/bin/env python3
"""Solve validated stereo captures. Install scripts/requirements-stereo.txt.

python scripts/validate_stereo_calibration.py captures.json --output calibration.json
No calibration file is written unless all geometry checks pass.
"""
import argparse
import base64
import json
from pathlib import Path
import cv2
import numpy as np


def object_points(board):
    nx, ny, mm = board['innerCornersX'], board['innerCornersY'], board['squareSizeMm']
    if not (isinstance(nx, int) and isinstance(ny, int) and 3 <= nx <= 20 and 3 <= ny <= 20 and np.isfinite(mm) and 0 < mm <= 100):
        raise ValueError('Invalid checkerboard dimensions or square size in millimeters')
    if board.get('squaresX') != nx + 1 or board.get('squaresY') != ny + 1:
        raise ValueError('Square counts must be one greater than inner-corner counts')
    obj = np.zeros((nx * ny, 3), np.float32)
    obj[:, :2] = np.mgrid[0:nx, 0:ny].T.reshape(-1, 2) * mm
    return obj


def corners(item, pattern):
    image = cv2.imdecode(np.frombuffer(base64.b64decode(item['image'].split(',')[-1]), np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None or image.shape != (item['height'], item['width']):
        raise ValueError('Capture image dimensions do not match its metadata')
    scale = min(1, 960 / image.shape[1])
    small = cv2.resize(image, None, fx=scale, fy=scale) if scale < 1 else image
    ok, pts = cv2.findChessboardCornersSB(small, pattern, flags=cv2.CALIB_CB_EXHAUSTIVE | cv2.CALIB_CB_ACCURACY)
    if not ok:
        return None
    pts = (pts / scale).astype(np.float32)
    return cv2.cornerSubPix(image, pts, (4, 4), (-1, -1), (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, .001))


def solve_stereo(board, first, second, sizes, camera_ids=None):
    obj = object_points(board)
    if len(first) != len(second) or len(first) < 12:
        raise ValueError('At least 12 validated pairs are required; capture 20 varied board poses')
    objects = [obj] * len(first)
    intrinsics, poses, mono_rms = [], [], []
    for points, size in zip([first, second], sizes):
        rms, k, d, rv, tv = cv2.calibrateCamera(objects, points, size, None, None, flags=cv2.CALIB_FIX_K3)
        fx, fy, cx, cy = k[0, 0], k[1, 1], k[0, 2], k[1, 2]
        if not (np.isfinite(k).all() and np.isfinite(d).all() and .3*size[0] < fx < 5*size[0] and .3*size[1] < fy < 5*size[1] and 0 < cx < size[0] and 0 < cy < size[1] and .75 < fx/fy < 1.25 and rms < 2):
            raise ValueError('Unreliable camera intrinsics; use sharper, more varied checkerboard poses')
        intrinsics.append((k, d)); poses.append(list(zip(rv, tv))); mono_rms.append(float(rms))
    normals = np.array([cv2.Rodrigues(r)[0][:, 2] for r, _ in poses[0]])
    spread = np.sort(np.std(normals, axis=0))
    if spread[-1] < .08 or spread[-2] < .03:
        raise ValueError('Insufficient board tilt diversity; tilt around both horizontal and vertical axes')
    candidates = []
    for i, (r1, t1) in enumerate(poses[0]):
        r1 = cv2.Rodrigues(r1)[0]; options = []
        # Symmetric checkerboards can be returned in reverse corner order.
        for points in [second[i], second[i][::-1].copy()]:
            ok, r2, t2 = cv2.solvePnP(obj, points, *intrinsics[1])
            if not ok:
                raise ValueError('Unable to recover checkerboard pose')
            rotation = cv2.Rodrigues(r2)[0] @ r1.T
            options.append((rotation, t2 - rotation @ t1, points))
        candidates.append(options)
    def cost(a, b):
        angle = np.arccos(np.clip((np.trace(a[0] @ b[0].T) - 1) / 2, -1, 1))
        return float((angle / .08)**2 + (np.linalg.norm(a[1] - b[1]) / 40)**2)
    seed = min([p for pair in candidates for p in pair], key=lambda p: sum(min(25, min(cost(p, q) for q in pair)) for pair in candidates))
    aligned = [min(pair, key=lambda p: cost(seed, p))[2] for pair in candidates]
    k1, d1 = intrinsics[0]; k2, d2 = intrinsics[1]
    rms, k1, d1, k2, d2, rotation, translation, _, fundamental = cv2.stereoCalibrate(objects, first, aligned, k1, d1, k2, d2, sizes[0], flags=cv2.CALIB_FIX_INTRINSIC, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 150, 1e-8))
    baseline = float(np.linalg.norm(translation))
    errors, view_errors = [], []
    for a, b in zip(first, aligned):
        ua = cv2.undistortPoints(a, k1, d1, P=k1).reshape(-1, 2)
        ub = cv2.undistortPoints(b, k2, d2, P=k2).reshape(-1, 2)
        lines = (fundamental @ np.column_stack([ua, np.ones(len(ua))]).T).T
        errors.extend(np.abs(np.sum(lines * np.column_stack([ub, np.ones(len(ub))]), axis=1)) / np.linalg.norm(lines[:, :2], axis=1))
        ok, r, t = cv2.solvePnP(obj, a, k1, d1)
        if not ok: raise ValueError('Board reprojection validation failed')
        r2 = cv2.Rodrigues(rotation @ cv2.Rodrigues(r)[0])[0]
        projected, _ = cv2.projectPoints(obj, r2, rotation @ t + translation, k2, d2)
        view_errors.append(float(np.sqrt(np.mean(np.sum((projected.reshape(-1, 2)-b.reshape(-1, 2))**2, axis=1)))))
    epi95 = float(np.percentile(errors, 95))
    if not (np.isfinite(rms) and rms < 2 and 10 < baseline < 2000 and epi95 < 2 and max(view_errors) < 4):
        raise ValueError(f'Stereo validation failed: RMS {rms:.2f}px, epipolar P95 {epi95:.2f}px, baseline {baseline:.1f}mm, worst view {max(view_errors):.2f}px')
    camera = lambda k, d, size: {'cameraMatrix': k.tolist(), 'distortionCoefficients': d.reshape(-1).tolist(), 'imageSize': {'width': size[0], 'height': size[1]}}
    result = {'format': 'suturehero-stereo-calibration-v1', 'imageSize': {'width': sizes[0][0], 'height': sizes[0][1]}, 'camera1': camera(k1, d1, sizes[0]), 'camera2': camera(k2, d2, sizes[1]), 'stereo': {'rotation': rotation.tolist(), 'translationMm': translation.reshape(-1).tolist(), 'baselineMm': baseline, 'rmsPx': float(rms)}, 'board': board, 'validation': {'accepted': True, 'pairsUsed': len(first), 'monocularRmsPx': mono_rms, 'epipolarP95Px': epi95, 'perViewStereoRmsPx': view_errors}}
    if camera_ids: result['cameraIds'] = camera_ids
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('captures'); parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.captures).read_text())
        if data.get('format') != 'suturehero-stereo-captures-v1': raise ValueError('Expected a stereo capture export')
        board = data['board']; object_points(board); first, second, sizes, rejected = [], [], None, []
        for i, pair in enumerate(data['pairs'], 1):
            current = [(pair[key]['width'], pair[key]['height']) for key in ['first', 'second']]
            if sizes is None: sizes = current
            if current != sizes: raise ValueError('Camera resolution changed during capture; record a new set')
            a, b = [corners(pair[key], (board['innerCornersX'], board['innerCornersY'])) for key in ['first', 'second']]
            if a is None or b is None: rejected.append(i); continue
            first.append(a); second.append(b)
        result = solve_stereo(board, first, second, sizes, {'first': data.get('camera1', ''), 'second': data.get('camera2', '')})
        result['validation']['undetectedPairs'] = rejected
        Path(args.output).write_text(json.dumps(result, indent=2)+'\n')
        print(json.dumps({'accepted': True, 'output': args.output, 'baselineMm': result['stereo']['baselineMm'], **result['validation']}, indent=2)); return 0
    except (ValueError, KeyError, TypeError, cv2.error) as error:
        print(json.dumps({'accepted': False, 'reason': str(error)})); return 2

if __name__ == '__main__':
    raise SystemExit(main())
