#!/usr/bin/env bash
# Builds a custom OpenCV.js (single-file WASM) with the full camera-calibration API.
# Requires: docker (emscripten/emsdk image).
#
# Usage:
#   OPENCV_SRC=/path/to/opencv-5.0.0 ./scripts/build-opencv/build.sh
#
# Environment:
#   OPENCV_SRC   path to the OpenCV source tree (tag 5.0.0). Required.
#   EMSDK_IMAGE  emscripten docker image (default: emscripten/emsdk:6.0.7)
#   OUT_DIR      output directory (default: ./vendor)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OPENCV_SRC="${OPENCV_SRC:?Set OPENCV_SRC to the OpenCV source directory}"
EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:6.0.7}"
OUT_DIR="${OUT_DIR:-${PROJECT_DIR}/vendor}"
BUILD_DIR="${PROJECT_DIR}/.opencv-build"

CONFIG_FILE="${SCRIPT_DIR}/opencv_js.config.py"
EMSCRIPTEN_DIR="/emsdk/upstream/emscripten"

mkdir -p "${OUT_DIR}" "${BUILD_DIR}"

echo ">>> Building OpenCV.js from ${OPENCV_SRC}"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "${OPENCV_SRC}":/src/opencv \
  -v "${CONFIG_FILE}":/config/opencv_js.config.py:ro \
  -v "${PROJECT_DIR}":/project \
  "${EMSDK_IMAGE}" bash -c "
    set -e
    # Patch obsolete -s EXPORTED_FUNCTIONS quoting for Emscripten >= 4
    python3 - <<'PY'
p = '/src/opencv/platforms/js/build_js.py'
s = open(p).read()
old = \"flags += \\\"-s EXPORTED_FUNCTIONS=\\\\\\\"['_malloc', '_free']\\\\\\\"\\\"\"
new = 'flags += \"-sEXPORTED_FUNCTIONS=_malloc,_free\"'
if old not in s:
    print('WARNING: EXPORTED_FUNCTIONS pattern not found, leaving as-is')
else:
    s = s.replace(old, new)
    open(p, 'w').write(s)
    print('Patched EXPORTED_FUNCTIONS syntax')
PY
    python3 /src/opencv/platforms/js/build_js.py /project/.opencv-build \
      --emscripten_dir=${EMSCRIPTEN_DIR} \
      --config=/config/opencv_js.config.py \
      --build_wasm \
      --enable_exception
    cp /project/.opencv-build/bin/opencv.js /project/vendor/opencv.js
    ls -la /project/vendor/opencv.js
  "

echo ">>> Done. Artifact: ${OUT_DIR}/opencv.js"