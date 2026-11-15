import {liveCameraFrame} from './CameraFrameClock';
import {recordedInput,cameraImage} from '../trackingLab/runtime';
/**
 * Whether a VideoFrame's pixels are laid out like the video element reports
 * (videoWidth × videoHeight, no pending rotation). On iOS a frame taken from
 * a rotated camera can keep the sensor's orientation (or carry a `rotation`),
 * so its pixels do not match the video's size: decoding it as if they did
 * squashed and misplaced every marker (Lance's iPhone recording, 2026-11-15).
 */
export function frameMatchesVideo(frame: { displayWidth: number; displayHeight: number; rotation?: number }, videoWidth: number, videoHeight: number): boolean {
 return !frame.rotation && frame.displayWidth === videoWidth && frame.displayHeight === videoHeight;
}
/** Own one source frame for matching decode/flow images without a full-size canvas copy. */
export function videoSnapshot(video:HTMLVideoElement,canvas:HTMLCanvasElement,context:CanvasRenderingContext2D){
 if(recordedInput())return {source:cameraImage(video),close:()=>{},direct:true};
 const live=liveCameraFrame(video);
 if(live&&frameMatchesVideo(live as VideoFrame&{rotation?:number},video.videoWidth,video.videoHeight))return {source:live as unknown as CanvasImageSource,close:()=>live.close(),direct:true};
 live?.close();
 if(typeof VideoFrame!=='undefined')try{const frame=new VideoFrame(video,{timestamp:Math.round(performance.now()*1000)});
  // A frame laid out differently from the video (iOS rotation) falls through to the canvas copy, which draws it upright.
  if(frameMatchesVideo(frame as VideoFrame&{rotation?:number},video.videoWidth,video.videoHeight))return {source:frame as CanvasImageSource,close:()=>frame.close(),direct:true};
  frame.close();
 }catch{/* Browser/source does not support VideoFrame; retain the exact-frame canvas path. */}
 if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
 context.drawImage(video,0,0,canvas.width,canvas.height);return {source:canvas as CanvasImageSource,close:()=>{},direct:false};
}
