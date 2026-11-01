/** Limit GPU buffers independently of CSS size, including high-DPI/4K displays. */
export function renderPixelRatio(width:number,height:number,deviceRatio:number,fast:boolean){
 const pixels=Math.max(1,width)*Math.max(1,height);
 return Math.min(Math.max(.1,deviceRatio),fast?.75:1.5,Math.sqrt((fast?750000:2000000)/pixels));
}
