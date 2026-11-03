/** The flow worker transfers/detaches its input. Keep an independent, byte-exact
 * seed for the asynchronous decoder instead of reading the canvas a second time. */
export function copyFlowSeed(frame:ImageData){return new ImageData(new Uint8ClampedArray(frame.data),frame.width,frame.height);}
