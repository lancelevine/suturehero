/** Per-window source injection. Absent in normal live tracking. */
export interface RecordedInput {
    image(video: HTMLVideoElement): HTMLCanvasElement;
    frameId(video: HTMLVideoElement): number;
    devices: MediaDeviceInfo[];
    open(id?: string): Promise<MediaStream>;
}
declare global {
    interface Window {
        sutureRecordedInput?: RecordedInput;
    }
}
export const recordedInput = () => typeof window === 'undefined' ? undefined : window.sutureRecordedInput;
export const cameraImage = (video: HTMLVideoElement): CanvasImageSource => recordedInput()?.image(video) ?? video;

/** Identity of the decoded source image, independent of a video's advancing clock. */
export function cameraImageId(video:HTMLVideoElement):number {
    const source=recordedInput();
    return source?source.frameId(video):video.getVideoPlaybackQuality?.().totalVideoFrames||video.currentTime;
}
