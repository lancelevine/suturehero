import {recordedInput} from '../trackingLab/runtime';
/** Track newly presented camera frames, rather than the continuously advancing
 * HTMLVideoElement.currentTime playback clock. A consumer always takes latest. */
export class CameraFrameClock {
 private sequence=0;private consumed=0;private lastPresented=-Infinity;
 presented(at=performance.now(),frameId?:number){this.sequence=frameId??this.sequence+1;this.lastPresented=at;}
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
 const frame:VideoFrameRequestCallback=(_now,metadata)=>{if(stopped)return;if(video.srcObject!==lastSource){lastSource=video.srcObject;lastFrames=0;}const count=lastFrames?Math.max(1,metadata.presentedFrames-lastFrames):1;lastFrames=metadata.presentedFrames;clock.presented(_now);onFrames(count);id=video.requestVideoFrameCallback(frame);};
 id=video.requestVideoFrameCallback(frame);window.addEventListener('pagehide',()=>{stopped=true;video.cancelVideoFrameCallback(id);clocks.delete(video);},{once:true});
}
