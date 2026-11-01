import {expect,it} from 'vitest';
import {loadJawTracking,saveJawTracking,type SavedJawTracking} from './jawTrackingStorage';
const tool={colors:[[1,0,0],[0,0,1]],displayColors:['rgb(255, 0, 0)','rgb(0, 0, 255)'],brightness:[255,255],anchors:[{x:100,y:100},{x:140,y:100}],anchorMarkers:[{x:80,y:80,side:20},{x:80,y:80,side:20}],reference:{separation:2,reach:2},calibration:{near:{closed:{separation:2,scale:20}},far:{}}};
it('round trips selected instrument colors, references and calibration without mixing slots',()=>{
 const data=new Map(),storage={getItem:(k:string)=>data.get(k),setItem:(k:string,v:string)=>{data.set(k,v);}};
 const state={version:1,enabled:true,tools:{needleDriver:tool}} as SavedJawTracking;
 expect(saveJawTracking(storage,state)).toBe(true);const saved=loadJawTracking(storage)!;expect(saved.enabled).toBe(true);expect(saved.tools.needleDriver).toEqual(tool);expect(saved.tools.forceps).toBeUndefined();
});
it('rejects malformed colors or geometry and handles unavailable/invalid storage',()=>{
 expect(loadJawTracking({getItem:()=>'{bad'})).toBeNull();expect(loadJawTracking({getItem:()=>{throw Error();}})).toBeNull();expect(saveJawTracking({setItem:()=>{throw Error();}},{version:1,enabled:true,tools:{}})).toBe(false);
 const saved=loadJawTracking({getItem:()=>JSON.stringify({version:1,enabled:true,tools:{needleDriver:{...tool,colors:[[9,0,0],[0,0,1]]},forceps:tool}})})!;
 expect(saved.tools.needleDriver).toBeUndefined();expect(saved.tools.forceps).toBeDefined();
});
