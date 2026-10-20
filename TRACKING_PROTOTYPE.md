# SutureHero optical instrument tracking prototype

Branch: feature/aruco-tracking-prototype

This is the **initial integration scaffold**, not a finished camera tracker.

- Instrument A: ArUco DICT_4X4_50 marker IDs 0, 1, 2.
- Instrument B: ArUco DICT_4X4_50 marker IDs 3, 4, 5.
- Camera access uses browser getUserMedia; serve from localhost or HTTPS.
- src/input/arucoTracking.ts groups observed marker IDs and exposes camera enumeration.
- src/input/arucoDetector.ts defines a detector interface, currently unconfigured.
- Tests check grouping and ID separation.

## Next implementation steps
1. Integrate a browser-compatible ArUco detector (OpenCV.js build including aruco or another verified WASM implementation).
2. Add a camera preview and debug overlay to the existing app.
3. Calibrate camera intrinsics and use known marker side length (24 mm).
4. Calibrate each prism face's rigid transformation. Do **not** average face poses directly.
5. Fuse prism pose estimates and instrument tip offset, then connect to Three.js.
6. Add stereo calibration when the two 1080p cameras arrive.

The 3D-printed geometry and tracking software must agree on face IDs, face winding, dimensions and coordinate frames. The marker grouping alone does not estimate 6-DOF pose.
