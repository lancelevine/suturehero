import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Instrument } from '../instruments/Instrument';
import { createTrackedInstrument, createTrackedScissors, setScissorsOpening } from './trackingInstrumentModels';

/** Dark theme background (src/ui/theme.css). */
const PREVIEW_BACKGROUND = 0x060b16;
const MAX_PIXEL_RATIO = 1.5;
/** Cap on drawing-buffer pixels for the preview (keeps large windows cheap). */
const MAX_BUFFER_PIXELS = 1_500_000;
const START_CAMERA = new THREE.Vector3(0, 4.5, 7.6);
const RESET_CAMERA = new THREE.Vector3(0, 3.7, 6);
const ORBIT_TARGET = new THREE.Vector3(0, 0.5, 0);

/**
 * The tracking page's 3D instrument preview (moved out of src/tracking.ts, 2026-11-27): scene,
 * camera, orbit controls, grid and the three tracked instrument models. When `embedded` (inside
 * the practice page) there is no renderer: poses go to the main scene instead of a second GPU context.
 */
export function createTrackingPreviewScene(mount: HTMLElement, embedded: boolean) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PREVIEW_BACKGROUND);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.copy(START_CAMERA);
  camera.lookAt(0, 0, 0);
  const renderer = embedded ? null : new THREE.WebGLRenderer({ antialias: true });
  renderer?.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  if (embedded) mount.style.display = 'none';
  else if (renderer) mount.append(renderer.domElement);
  const orbit = renderer ? new OrbitControls(camera, renderer.domElement) : null;
  if (orbit) {
    orbit.enableDamping = true;
    orbit.minDistance = 1.4;
    orbit.maxDistance = 18;
    orbit.target.copy(ORBIT_TARGET);
    orbit.update();
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x63788a, 2));
  scene.add(new THREE.GridHelper(5, 10, 0x2a8fb0, 0x16324a));
  const driverModel = createTrackedInstrument(scene, 'right', 0xe3b47e);
  const forcepsModel = createTrackedInstrument(scene, 'left', 0x68d1bb);
  const models = new Map<'left' | 'right', Instrument>([
    ['right', driverModel.model],
    ['left', forcepsModel.model],
  ]);
  const driver = driverModel.group;
  const forceps = forcepsModel.group;
  const scissors = createTrackedScissors(scene);
  driver.position.z = -0.85;
  forceps.position.z = 0.15;
  scissors.position.z = 1.05;
  const resize = new ResizeObserver(() => {
    if (!renderer) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setDrawingBufferSize(width, height, Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO, Math.sqrt(MAX_BUFFER_PIXELS / (width * height))));
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  });
  if (!embedded) resize.observe(mount);
  return {
    scene,
    camera,
    renderer,
    orbit,
    driver,
    forceps,
    scissors,
    models,
    resize,
    setScissorsOpening: (value: number) => setScissorsOpening(scissors, value),
    resetView() {
      camera.position.copy(RESET_CAMERA);
      orbit?.target.copy(ORBIT_TARGET);
      orbit?.update();
    },
    render() {
      if (!renderer) return false;
      orbit?.update();
      renderer.render(scene, camera);
      return true;
    },
  };
}
