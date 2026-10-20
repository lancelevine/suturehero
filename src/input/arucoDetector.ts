import type {MarkerObservation} from './arucoTracking';
/** Detector boundary. A browser-compatible ArUco/WASM detector will be plugged in here.
 * The current prototype intentionally does not claim to perform camera marker detection. */
export interface ArucoDetector {
 detect(frame: ImageData): Promise<MarkerObservation[]>;
 dispose?(): void;
}
export class UnconfiguredDetector implements ArucoDetector {
 async detect(_frame: ImageData): Promise<MarkerObservation[]> { return []; }
}
