import {recordedInput} from '../trackingLab/runtime';
/** Track newly presented camera frames, rather than the continuously advancing
 * HTMLVideoElement.currentTime playback clock. A consumer always takes latest. */
export class CameraFrameClock {
 private sequence=0;private consumed=0;private lastPresented=-Infinity;private lastCapture=NaN;
 /** captureTime: when the camera captured the frame (requestVideoFrameCallback metadata, performance.now() clock), if reported. */
 presented(at=performance.now(),frameId?:number,captureTime?:number){this.sequence=frameId??this.sequence+1;this.lastPresented=at;this.lastCapture=captureTime!==undefined&&Number.isFinite(captureTime)&&captureTime>0&&captureTime<=at?captureTime:NaN;}
 /** Camera capture time of the latest presented frame, or NaN if the browser does not report it. */
 get captureTime(){return this.lastCapture;}
 recent(at:number){return at-this.lastPresented<200;}
 get frameId(){return this.sequence;}
 get presentedAt(){return this.lastPresented;}
 get fresh(){return this.sequence!==this.consumed;}
 consume(){this.consumed=this.sequence;}
}
const clocks=new WeakMap<HTMLVideoElement,CameraFrameClock>();
export const frameClock=(video:HTMLVideoElement)=>{if(recordedInput()){let clock=clocks.get(video);if(!clock){clock=new CameraFrameClock();clocks.set(video,clock);}if(clock.frameId!==recordedInput()!.frameId(video)){clock.presented(performance.now(),recordedInput()!.frameId(video));}return clock;}const clock=clocks.get(video);return clock?.recent(performance.now())?clock:undefined;};
export function observeCameraFrames(video:HTMLVideoElement,onFrames:(count:number)=>void){
 if(recordedInput()||!video.requestVideoFrameCallback)return;
 const clock=new CameraFrameClock();clocks.set(video,clock);
 let stopped=false,lastFrames=0,id=0,lastSource:MediaProvider|null=null;
 const frame:VideoFrameRequestCallback=(_now,metadata)=>{if(stopped)return;if(video.srcObject!==lastSource){lastSource=video.srcObject;lastFrames=0;}const count=lastFrames?Math.max(1,metadata.presentedFrames-lastFrames):1;lastFrames=metadata.presentedFrames;clock.presented(_now,undefined,(metadata as {captureTime?:number}).captureTime);onFrames(count);id=video.requestVideoFrameCallback(frame);};
 id=video.requestVideoFrameCallback(frame);window.addEventListener('pagehide',()=>{stopped=true;video.cancelVideoFrameCallback(id);clocks.delete(video);},{once:true});
}

/** Longest plausible delay between a frame's camera capture and the app reading it (ms); beyond this the capture time is ignored. */
export const MAX_CAPTURE_TO_READ_MS=200;
/**
 * Timestamp for pairing Camera 1 and Camera 2 images: the camera capture time
 * of the frame being read when the browser reports it (Chrome: ~15–19 ms
 * before the page sees it, different per camera), otherwise the app's read
 * time. Pairing on capture time matches the two views of the same moment more
 * closely for unsynchronised cameras.
 */
export function pairingTime(clock:CameraFrameClock|undefined,readAt:number):number{
 const capture=clock?.captureTime;
 return capture!==undefined&&Number.isFinite(capture)&&capture<=readAt&&readAt-capture<=MAX_CAPTURE_TO_READ_MS?capture:readAt;
}
