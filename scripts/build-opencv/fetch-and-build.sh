#!/usr/bin/env bash
# Downloads a pinned OpenCV release and builds the custom OpenCV.js WASM.
# This is what CI runs; it guarantees the WASM is built, never vendored.
#
# Environment:
#   OPENCV_VERSION  OpenCV tag to build (default: 5.0.0)
#   EMSDK_IMAGE     emscripten docker image (default: emscripten/emsdk:6.0.7)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCV_VERSION="${OPENCV_VERSION:-5.0.0}"

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

echo ">>> Fetching OpenCV ${OPENCV_VERSION}"
wget -q "https://github.com/opencv/opencv/archive/refs/tags/${OPENCV_VERSION}.tar.gz" -O "${WORK}/opencv.tar.gz"
tar xzf "${WORK}/opencv.tar.gz" -C "${WORK}"

OPENCV_SRC="${WORK}/opencv-${OPENCV_VERSION}" EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:6.0.7}" bash "${SCRIPT_DIR}/build.sh"