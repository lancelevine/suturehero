import {recordedInput,cameraImage} from '../trackingLab/runtime';
/** Own one source frame for matching decode/flow images without a full-size canvas copy. */
export function videoSnapshot(video:HTMLVideoElement,canvas:HTMLCanvasElement,context:CanvasRenderingContext2D){
 if(recordedInput())return {source:cameraImage(video),close:()=>{},direct:true};
 if(typeof VideoFrame!=='undefined')try{const frame=new VideoFrame(video,{timestamp:Math.round(performance.now()*1000)});return {source:frame as CanvasImageSource,close:()=>frame.close(),direct:true};}catch{/* Browser/source does not support VideoFrame; retain the exact-frame canvas path. */}
 if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
 context.drawImage(video,0,0,canvas.width,canvas.height);return {source:canvas as CanvasImageSource,close:()=>{},direct:false};
}
