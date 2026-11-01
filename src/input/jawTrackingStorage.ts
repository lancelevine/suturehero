import {BALL_INSTRUMENTS,type BallInstrumentName} from './ballTrackingSlots';
import type {BallMarker,BallPairReference} from './ballPairTracking';
type Point={x:number;y:number};
type Pair<T>=[T,T];
export interface SavedJawTool {colors:Pair<[number,number,number]|null>;displayColors:Pair<string|null>;brightness:Pair<number>;anchors:Pair<Point|null>;anchorMarkers:Pair<BallMarker|null>;reference:BallPairReference|null;calibration:unknown}
export interface SavedJawTracking {version:1;enabled:boolean;tools:Partial<Record<BallInstrumentName,SavedJawTool>>}
const KEY='suturehero.jaw-tracking.v1';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const point=(v:unknown)=>object(v)&&number(v.x)&&number(v.y)&&Math.abs(v.x)<10000&&Math.abs(v.y)<10000;
const pair=(v:unknown,valid:(x:unknown)=>boolean)=>Array.isArray(v)&&v.length===2&&v.every(valid);
export function loadJawTracking(storage:Pick<Storage,'getItem'>):SavedJawTracking|null{
 try{
  const raw:unknown=JSON.parse(storage.getItem(KEY)??'null');if(!object(raw)||raw.version!==1||!object(raw.tools))return null;
  const tools:SavedJawTracking['tools']={};
  for(const name of BALL_INSTRUMENTS){
   const v=raw.tools[name];if(!object(v))continue;
   if(!pair(v.colors,c=>c===null||Array.isArray(c)&&c.length===3&&c.every(n=>number(n)&&n>=0&&n<=1)&&Math.abs(c.reduce((a,b)=>a+b,0)-1)<.03))continue;
   if(!pair(v.displayColors,c=>c===null||typeof c==='string'&&/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/.test(c)))continue;
   if(!pair(v.brightness,n=>number(n)&&n>=0&&n<=765))continue;
   if(!pair(v.anchors,p=>p===null||point(p))||!pair(v.anchorMarkers,p=>p===null||point(p)&&object(p)&&number(p.side)&&p.side>0&&p.side<10000))continue;
   if(v.reference!==null&&(!object(v.reference)||!number(v.reference.separation)||v.reference.separation<=0||!number(v.reference.reach)||v.reference.reach<0))continue;
   tools[name]=structuredClone(v) as unknown as SavedJawTool;
  }
  return {version:1,enabled:raw.enabled===true,tools};
 }catch{return null;}
}
export function saveJawTracking(storage:Pick<Storage,'setItem'>,state:SavedJawTracking){try{storage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
