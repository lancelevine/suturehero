import {describe,it,expect} from 'vitest';
import {ballPairReference,selectBallPair,predictBall,sampledBallColor,normalizedBallSeparation,type BallBlob} from './ballPairTracking';
const blob=(x:number,y:number,r=6,score=5):BallBlob=>({x,y,count:Math.PI*r*r,score});
const marker={x:100,y:100,side:24};
const reference=ballPairReference(blob(110,180),blob(134,180),marker);
const limits={reference,closed:1,open:2,trackerToTipMm:55};
describe('paired colored jaw balls',()=>{
 it('prefers a valid pair over a higher-scoring background distractor',()=>{
  const actual=blob(110,180),other=blob(134,180),background=blob(40,180,6,100);
  const selected=selectBallPair([background,actual],[other],marker,limits);
  expect(selected?.a).toBe(actual);expect(selected?.b).toBe(other);
 });
 it('rejects an isolated background blob when its partner cannot satisfy the calibrated opening range',()=>{
  expect(selectBallPair([blob(40,180,6,100)],[blob(134,180)],marker,limits)).toBeNull();
  expect(selectBallPair([blob(110,180)],[],marker,limits)).toBeNull();
 });
 it('rejects a close pair belonging to a distant instrument or implausible blob sizes',()=>{
  expect(selectBallPair([blob(110,180)],[blob(134,180)],{x:500,y:100,side:24},limits)).toBeNull();
  expect(selectBallPair([blob(110,180,25)],[blob(134,180,25)],marker,limits)).toBeNull();
  expect(selectBallPair([blob(110,180,2)],[blob(134,180,9)],marker,limits)).toBeNull();
 });
 it('scales pair bounds with apparent depth instead of fixing the maximum in pixels',()=>{
  const a=blob(110,180),b=blob(134,180),scale=2;
  const largerA=blob(a.x*scale,a.y*scale,12),largerB=blob(b.x*scale,b.y*scale,12);
  expect(selectBallPair([largerA],[largerB],{x:200,y:200,side:48},limits)).not.toBeNull();
  expect(normalizedBallSeparation(a,b)).toBeCloseTo(normalizedBallSeparation(largerA,largerB),8);
 });
 it('moves the reacquisition region with the associated marker',()=>{
  expect(predictBall({x:110,y:180},marker,{x:200,y:150,side:48})).toEqual({x:220,y:310});
 });
 it('bounds separation before calibration and retains the sampled overlay color',()=>{
  expect(selectBallPair([blob(110,180)],[blob(500,180)],marker,{...limits,closed:null,open:null})).toBeNull();
  expect(sampledBallColor([225.2,49.7,60])).toBe('rgb(225, 50, 60)');
 });
});
