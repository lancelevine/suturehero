`aruco-4x4-50.png` is an independent OpenCV reference image for marker decoding.
It contains DICT_4X4_50 IDs 0–49 in row-major order, seven columns, 100-pixel
cells, 60-pixel markers and 20-pixel white margins. It was generated using
OpenCV 5.0.0 `cv2.aruco.generateImageMarker`, not the application's code table.

With the Vite development server running, use:

```
SUTURE_TEST_URL=http://127.0.0.1:5173/ node scripts/check-ring-markers.mjs
```

The check exercises the main-thread decoder, classic worker full-frame and ROI
decoding, and rotation of representative prism/ring IDs. `SUTURE_WORKER_PATH`
can point at `/dist/assets/arucoWorker-<hash>.js` to exercise the production
bundle through the development server. `ARUCO_LIBRARY_DIR` optionally supplies
local `cv.js` and `aruco.js` files from the same pinned js-aruco2@2.0.0 CDN
used by the app when the browser cannot reach the CDN directly. This does not
change the detector implementation used in the test.
