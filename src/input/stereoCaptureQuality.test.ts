import {expect,it} from 'vitest';
import {Euler,Quaternion,Vector3} from 'three';
import {boardMotion,captureCoverage,describeBoard,duplicatePose,pairCaptureDecision,type BoardMeasurement,type CapturePose} from './stereoCaptureQuality';
function board(cx=.5,cy=.5,z=600,rx=0,ry=0):BoardMeasurement{
 const q=new Quaternion().setFromEuler(new Euler(rx,ry,0));
 const corners=Array.from({length:48},(_,i)=>{
  const p=new Vector3((i%8-3.5)*16,(Math.floor(i/8)-2.5)*16,0).applyQuaternion(q).add(new Vector3(0,0,z));
  return {x:cx*640+800*p.x/p.z,y:cy*480+800*p.y/p.z};
 });return {width:640,height:480,corners,contrast:180,focus:.8};
}
const pose=(a:BoardMeasurement,b=a):CapturePose=>({first:describeBoard(a).quality!,second:describeBoard(b).quality!});
it('accepts full sharp stable boards only when camera frame timing is usable',()=>{
 const b=board();expect(pairCaptureDecision(b,b,[],600,20).accepted).toBe(true);
 for(const skew of [null,-1,51,NaN])expect(pairCaptureDecision(b,b,[],600,skew).accepted).toBe(false);
 // After a full second of stability, modest webcam presentation skew is tolerated.
 expect(pairCaptureDecision(b,b,[],1100,90).accepted).toBe(true);
 expect(pairCaptureDecision(b,b,[],1100,null).accepted).toBe(true);
 expect(pairCaptureDecision(b,b,[],1100,300).accepted).toBe(false);
 expect(pairCaptureDecision(b,b,[],400,20).reasons).toContain('Hold board still briefly');
});
it('rejects blur, low contrast, undersized squares, missing corners, and cropped outer squares',()=>{
 const b=board();
 for(const bad of [{...b,focus:.02},{...b,contrast:20},board(.5,.5,2000),{...b,corners:b.corners.slice(1)},board(.08,.5)]){
  const decision=pairCaptureDecision(bad,b,[],600,10);expect(decision.accepted).toBe(false);expect(decision.reasons.some(r=>r.startsWith('Camera 1:'))).toBe(true);
 }
});
it('rejects duplicate pairs, including reversed checkerboard ordering, but accepts useful new views',()=>{
 const b=board(),p=pose(b),reversed={...b,corners:[...b.corners].reverse()};
 expect(duplicatePose(pose(reversed),[p])).toBe(true);expect(pairCaptureDecision(b,b,[p],600,10).accepted).toBe(false);
 expect(pairCaptureDecision(board(.65),board(.65),[p],600,10).accepted).toBe(true);
});
it('requires actual pose coverage in both cameras, beyond reaching 20 captures',()=>{
 const flat=Array.from({length:20},(_,i)=>pose(board(.28+(i%5)*.11,.32+Math.floor(i/5)*.12,500+(i%5)*70)));
 expect(captureCoverage(flat).complete).toBe(false);expect(captureCoverage(flat).missing.some(m=>m.includes('tilt'))).toBe(true);
 const varied=Array.from({length:20},(_,i)=>{
  const x=.28+(i%5)*.11,y=.32+Math.floor(i/5)*.12,z=500+(i%5)*70,rx=-.5+Math.floor(i/5)/3,ry=-.5+(i%5)/4;
  return pose(board(x,y,z,rx,ry),board(x+.02,y,z,rx+.1,ry-.1));
 });
 expect(captureCoverage(varied).complete).toBe(true);expect(captureCoverage(varied.slice(0,19)).complete).toBe(false);
 expect(captureCoverage(varied.map(p=>({...p,second:flat[0].second}))).complete).toBe(false);
});
it('measures board motion without treating a 180-degree corner-order reversal as movement',()=>{
 const b=board();expect(boardMotion(b,{...b,corners:[...b.corners].reverse()})).toBeLessThan(1e-8);
 expect(boardMotion(b,board(.53))).toBeGreaterThan(10);
});
