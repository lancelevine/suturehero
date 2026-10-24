import {TISSUE_LAYERS} from '../tissue/anatomy';
import {DEFAULT_BITE_WIDTH} from '../tissue/BitePlan';
import {StitchCourse} from './StitchCourse';
import {DEEP_DERMIS_Y,retainedSurfaceLift,fieldShift,fieldLift,type TissueSite} from '../tissue/StitchField';
import {StitchTissueResponse} from '../tissue/StitchTissueResponse';
import {assessStitch} from './StitchAssessment';
import {MICRO_FLOOR_Y,MICRO_TARGETS} from '../environments/MicroTargets';
import type {MicroTarget} from '../environments/MicroTargets';
import {environments,createMicroEnvironment,type EnvironmentId} from '../environments/PracticeEnvironment';
import type {KnotTechnique} from '../suture/KnotTechnique';
import { EdgeEversion } from '../tissue/EdgeEversion';
import { FreeKnotPractice } from './FreeKnotPractice';
import { KnotLoadTest } from './KnotLoadTest';
import { KnotReleaseCheck } from './KnotReleaseCheck';
import { KnotSlack } from '../suture/KnotSlack';
import { knotLoop, knotTailContact, SEATED_LOOP_LENGTH } from '../suture/knotGeometry';
import { WoundApproximation } from '../tissue/WoundApproximation';
import { GuidedKnot } from '../suture/GuidedKnot';
import { PullThrough } from '../suture/PullThrough';
import * as THREE from 'three';
import { NeedlePlacement } from './NeedlePlacement';
import { NeedlePass } from '../tissue/NeedlePass';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
import type { InputDevice } from '../input/types';
import type { Instrument } from '../instruments/Instrument';
export class PracticeSession {
  readonly course=new StitchCourse();
  bitePlanLimited=false;
  private handlingPeak=0;private handlingSlips=0;private observedSlipSerial=0;
  get canPlanBites(){return this.environment.id==='skin'&&this.pass.phase==='idle'&&!this.knot.active&&!this.freeKnot.active&&!this.eversion.held&&!this.course.finished;}
  setBiteWidths(rightRatio:number,leftRatio:number){
    if(!this.canPlanBites)return false;
    const plan=this.pass.setBites(rightRatio*DEFAULT_BITE_WIDTH,leftRatio*DEFAULT_BITE_WIDTH);if(!plan)return false;
    this.bitePlanLimited=plan.limited;this.syncBitePlan();return true;
  }
  setStitchPosition(z:number){if(!this.canPlanBites||!this.course.selectSite(z))return false;this.configureTissueResponse();return true;}
  private syncBitePlan(){this.placement.target.copy(this.pass.entry);this.placement.direction.set(-Math.sin(this.pass.startAngle),-Math.cos(this.pass.startAngle),0);this.freeKnot.tractHalfWidth=this.pass.halfWidth;this.wound.tractBottom=this.environment.id==='skin'?this.pass.center.y-this.pass.radius:undefined;}

  readonly tissueResponse=new StitchTissueResponse();
  readonly freeKnot=new FreeKnotPractice();
  private freeFromPass=false;
  private freeReleaseTime=0;
  get freeReleaseProgress(){return this.freeReleaseTime/1.5;}
  environment=environments.skin;
  selectedTechnique?:KnotTechnique;
  setEnvironment(id:EnvironmentId,target:MicroTarget='artery'){
    this.reset();this.environment=id==='microsurgery'?createMicroEnvironment(target):environments.skin;
    this.wound.initialGap=id==='microsurgery'?MICRO_TARGETS[target].gap:.1;
    this.eversion.edgeX=this.wound.initialGap/2;this.eversion.reset();
    this.pass.purchaseY=this.environment.purchaseY;this.wound.purchaseValidator=this.environment.loadBearing;
    this.configureTissueResponse();this.freeKnot.threadFloorAt=this.environment.threadFloorAt;this.freeKnot.tissueContact=this.environment.threadContact;this.freeKnot.driverObstacle=this.environment.driverObstacle;
    this.knotSlack.surfaceAt=this.environment.threadFloorAt??this.environment.surfaceAt;this.knotSlack.tissueContact=this.environment.threadContact;
    for(const tool of this.instruments){tool.setDriverStyle(id==='microsurgery'?'castro':'standard');tool.minimumHeight=id==='microsurgery'?MICRO_FLOOR_Y+.05:.15;}
  }
  beginFreeTying(technique?:KnotTechnique|'auto') {
    if(this.course.active)return;
    this.reset();
    if(this.grasp) {this.grasp.needle.setThreadVisible(false);this.grasp.needle.root.position.set(3.1,0.1,1.2);}
    this.freeKnot.entry.copy(this.tissuePoint(this.pass.entry));this.freeKnot.exit.copy(this.tissuePoint(this.pass.exit));
    this.freeKnot.begin(this.instruments,technique);this.wound.setDermalBites(...this.pass.purchaseSites);
  }
  continueFreeTying(){
    if(!this.canBeginKnot||!this.grasp)return false;
    this.grasp.release();this.grasp.needle.setThreadVisible(false);this.grasp.needle.root.position.set(3.1,.1,1.2);
    this.eversion.reset();this.freeKnot.entry.copy(this.tissuePoint(this.pass.entry));this.freeKnot.exit.copy(this.tissuePoint(this.pass.exit));this.freeKnot.begin(this.instruments,'auto');this.freeFromPass=true;this.freeReleaseTime=0;
    return true;
  }
  readonly eversion=new EdgeEversion();
  private guidedEdge=false;
  oppositeEdgeRequired=false;
  get epidermalAlignment(){
    const right=this.eversion.deformPoint(this.tissuePoint(new THREE.Vector3(.05,TISSUE_LAYERS.epidermis.top,0)));
    const left=this.eversion.deformPoint(this.tissuePoint(new THREE.Vector3(-.05,TISSUE_LAYERS.epidermis.top,0)));
    const gap=right.x-left.x,heightDifference=left.y-right.y;
    return {left,right,gap,heightDifference,aligned:gap>=.006&&gap<=.028&&Math.abs(heightDifference)<=.03&&Math.abs(left.z-right.z)<=.06};
  }
  get oppositeEdgeReady(){return this.eversion.anchor.x<0&&this.eversion.held&&this.eversion.traction.state==='gentle'&&this.epidermalAlignment.aligned;}

  get guidedPassReady(){return this.oppositeEdgeRequired?this.oppositeEdgeReady:this.eversion.ready;}
  get oppositeEdgeInstruction(){
    const edge=this.eversion;
    if(edge.anchor.x>0)return edge.held?'First side passed · Open X to release the right skin edge':'First side passed · Let the edge relax, then position forceps at the opposite edge';
    if(!edge.held)return 'Opposite edge · Position forceps at the left skin edge, then close Z';
    const alignment=this.epidermalAlignment;
    if(alignment.heightDifference>.03)return 'Opposite edge held · Lower Q until the epidermal surfaces are level';
    if(alignment.heightDifference<-.03)return 'Opposite edge held · Raise E until the epidermal surfaces are level';
    if(!this.oppositeEdgeReady)return 'Opposite edge held · Pull inward with D until the epidermal edges meet · Shift slows movement';
    return 'Epidermal edges flush · Stop pulling and hold U to advance the needle driver';
  }
  get preparingEdge(){return this.guidedEdge && (this.pass.phase==='idle' || this.pass.phase==='interrupted');}
  private updateEversion(dt:number,allowGrasp=true){
    const forceps=this.instruments.find(t=>t.kind==='forceps');if(!forceps)return;
    forceps.root.updateWorldMatrix(true,false);
    const guidedSite=this.preparingEdge||this.pass.phase==='passing';
    this.eversion.update({jaw:forceps.root.localToWorld(new THREE.Vector3(0,0,0.05)),rotation:forceps.root.getWorldQuaternion(new THREE.Quaternion()),openness:forceps.openness},dt,allowGrasp && this.grasp?.holder!==forceps && (guidedSite||!this.grasp?.findGrip(forceps,this.pass.phase==='complete')),guidedSite);
    if(this.environment.id==='skin'){this.handlingPeak=Math.max(this.handlingPeak,this.eversion.traction.peakLoad);this.handlingSlips+=this.eversion.slipSerial-this.observedSlipSerial;this.observedSlipSerial=this.eversion.slipSerial;}
    if(this.environment.id==='skin'&&this.eversion.held&&this.eversion.traction.state==='gentle'&&Math.abs(this.eversion.anchor.z)<.45)this.tissueResponse.prepare(this.eversion.anchor.x,this.eversion.angle);
  }
  readonly placement=new NeedlePlacement();
  readonly pass=new NeedlePass();
  readonly pull=new PullThrough();
  readonly knot=new GuidedKnot();
  readonly loadTest=new KnotLoadTest();
  private loadGrip=new THREE.Vector3();
  private loadDirection=new THREE.Vector3();
  readonly releaseCheck=new KnotReleaseCheck();
  readonly knotSlack=new KnotSlack();
  readonly wound=new WoundApproximation();
  private tissuePoint(p:THREE.Vector3){
    if(this.environment.id!=='skin'||!this.course.active)return this.wound.deformPoint(p);
    const z=p.z+this.course.siteZ,sites=this.tissueField;
    return new THREE.Vector3(p.x-Math.sign(p.x)*fieldShift(p.x,z,sites,p.y),p.y+fieldLift(p.x,p.y,z,sites),p.z);
  }
  private fieldCache:readonly TissueSite[]=[];
  private fieldActive?:TissueSite;
  private fieldRevision=-1;
  private fieldSaved:readonly TissueSite[]|undefined;
  /** A stable snapshot shared by rendering and thread contact in pad coordinates. */
  get tissueField(){
    const saved=this.course.tissueSites,z=this.course.siteZ,r=this.tissueResponse;
    const previous=this.fieldActive,mismatch=this.wound.edgeMismatch;
    if(this.fieldSaved!==saved||!previous||previous.siteZ!==z||previous.closure!==this.wound.closure||this.fieldRevision!==r.revision||previous.mismatch!==mismatch||previous.initialGap!==this.wound.initialGap||previous.tractBottom!==this.wound.tractBottom){
      this.fieldSaved=saved;this.fieldRevision=r.revision;
      const active:TissueSite={siteZ:z,closure:this.wound.closure,initialGap:this.wound.initialGap,tractBottom:this.wound.tractBottom,eversion:r.eversion,pucker:r.pucker,compression:r.compression,mismatch};
      this.fieldActive=active;
      // The last site is already recorded when the course finishes.
      this.fieldCache=this.course.finished?saved:[...saved,active].sort((a,b)=>a.siteZ-b.siteZ);
    }
    return this.fieldCache;
  }
  private configureTissueResponse(){
    this.syncBitePlan();this.eversion.tractionEnabled=this.environment.id==='skin';
    this.wound.response=this.environment.id==='skin'?this.tissueResponse:undefined;
    this.freeKnot.padOffsetZ=this.course.siteZ;this.eversion.padOffsetZ=this.course.siteZ;
    this.freeKnot.surfaceAt=p=>{
      if(this.environment.id!=='skin')return this.environment.surfaceAt(p);
      const z=p.z+this.course.siteZ;
      const onPad=Math.abs(p.x)<=2.68&&Math.abs(z)<=1.68;
      const base=onPad?.423:Math.abs(p.x)<=3.5&&Math.abs(p.z)<=2.5?.055:-.075;
      return base+(onPad?retainedSurfaceLift(p.x,z,this.tissueField):0);
    };
    this.knotSlack.surfaceAt=this.course.active?this.freeKnot.surfaceAt:this.environment.threadFloorAt??this.environment.surfaceAt;
  }
  startCourse(){
    if(this.environment.id!=='skin'||!this.grasp||this.course.active&&!this.course.finished)return false;
    this.reset();this.course.begin();this.configureTissueResponse();return true;
  }
  get canAdvanceStitch(){return this.course.active&&!this.course.finished&&this.stitchAssessment.complete;}
  advanceStitch(){
    if(!this.canAdvanceStitch)return false;
    const free=this.freeKnot.active,threads=free?[this.freeKnot.long,this.freeKnot.short]:[this.knotSlack.long,this.knotSlack.short];
    if(!this.course.record(true,{closure:this.wound.closure,initialGap:this.wound.initialGap,tractBottom:this.wound.tractBottom,eversion:this.tissueResponse.eversion,pucker:this.tissueResponse.pucker,compression:this.tissueResponse.compression,mismatch:this.wound.edgeMismatch},this.stitchAssessment.feedback,threads.map(s=>s.points)))return false;
    if(this.course.advance()){this.resetCurrent();this.configureTissueResponse();}
    return true;
  }
  get stitchAssessment(){
    const free=this.freeKnot,isFree=free.active,lab=isFree&&!this.freeFromPass;
    const released=isFree?this.freeReleaseTime>=1.5:this.releaseCheck.state==='passed';
    return assessStitch({lab,skin:this.environment.id==='skin',pass:this.pass.phase==='complete',extracted:this.pull.phase==='complete',
      knot:isFree?!!free.sequence?.locked:this.knot.phase==='complete',seated:isFree?free.lockSeated:this.knot.phase==='complete'&&this.wound.closure>.9,
      released,trimmed:isFree?free.trimmedTails.size:this.knotSlack.trimmedTails.size,bites:this.wound.purchaseSites,closure:this.wound.closure,
      eversion:this.tissueResponse.eversion,pucker:this.tissueResponse.pucker,compression:this.tissueResponse.compression,edgeMismatch:this.wound.edgeMismatch,planned:this.pass.customBites,deepGap:this.environment.id==='skin'?this.wound.initialGap-2*fieldShift(this.wound.initialGap/2,this.course.siteZ,this.tissueField,DEEP_DERMIS_Y):undefined,skinTractionPeak:this.handlingPeak,skinGraspSlips:this.handlingSlips,
      peakPull:isFree?Math.max(free.tension.long.peakDemand,free.tension.short.peakDemand):this.tissueResponse.peakDemand});
  }
  gripFraction=0.9;
  get selectedGripPoint() { return this.grasp?.needle.getPointAt(this.gripFraction)??new THREE.Vector3(); }
  constructor(private input: InputDevice, readonly instruments: readonly Instrument[], readonly grasp?: NeedleGrasp) {this.configureTissueResponse();}
  get canBeginPass() {
    return !this.course.finished && !this.freeKnot.active && !this.knot.active && !!this.grasp && (this.pass.phase==='idle' || this.pass.phase==='interrupted') && (!this.guidedEdge || this.eversion.ready);
  }
  beginPass() {
    if(!this.canBeginPass || !this.grasp) return false;
    if(!this.guidedEdge){this.guidedEdge=true;this.grasp.reset();this.placement.reset();this.eversion.begin();return true;}
    const driver=this.instruments.find(tool=>tool.kind==='needle-driver');
    if(!driver) return false;
    this.oppositeEdgeRequired=false;this.wound.setDermalBites(null,null);this.grasp.reset(); this.pull.reset(); this.placement.reset(); this.pass.begin();
    const needle=this.grasp.needle;
    this.pass.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
    needle.root.updateWorldMatrix(true,false);
    driver.reset(); driver.openness=0.1;
    const grip=needle.points[30].clone().applyMatrix4(needle.root.matrixWorld);
    const offset=new THREE.Vector3(0,0,0.05).applyQuaternion(driver.root.quaternion);
    driver.root.position.copy(grip).sub(offset);
    driver.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    this.grasp.attach(driver); return true;
  }
  get positioningSkin(){return !this.knot.active && (this.preparingEdge || this.freeKnot.active || this.pass.phase==='idle' || this.pass.phase==='passing' || this.pull.phase==='complete');}
  get canPositionForceps() {
    if(this.course.finished)return false;
    if(this.oppositeEdgeRequired&&this.pass.phase==='passing'&&this.eversion.anchor.x>0)return false;
    if(this.knot.active)return false;
    return this.positioningSkin?!this.eversion.held && !this.freeKnot.grips.has('left') && this.grasp?.holder?.kind!=='forceps':!!this.grasp && !this.eversion.held && this.pass.phase==='complete' && this.pull.phase==='waiting' && this.grasp.holder?.kind!=='forceps';
  }
  positionForceps() {
    if(!this.canPositionForceps) return false;
    if(this.positioningSkin){
      const tool=this.instruments.find(t=>t.kind==='forceps');if(!tool)return false;
      tool.reset();tool.openness=0.65;tool.root.position.copy(this.eversion.target).sub(new THREE.Vector3(0,0,0.05).applyQuaternion(tool.root.quaternion));
      tool.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);this.updateEversion(0);return true;
    }
    if(!this.grasp)return false;
    const forceps=this.instruments.find(tool=>tool.kind==='forceps');
    if(!forceps) return false;
    forceps.reset(); forceps.openness=0.65;
    this.grasp.needle.root.updateWorldMatrix(true,false);
    const selected=this.selectedGripPoint.applyMatrix4(this.grasp.needle.root.matrixWorld);
    forceps.root.position.copy(selected).sub(new THREE.Vector3(0,0,0.05).applyQuaternion(forceps.root.quaternion));
    forceps.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    this.grasp.update(this.instruments,true); return true;
  }
  get canBeginKnot() {return !this.freeKnot.active && this.wound.hasDermalSupport && this.pull.phase==='complete' && !this.knot.active && !!this.grasp;}
  get canKnotAction() {return !this.course.finished && (!this.knotSlack.trimmed && ((this.releaseCheck.state==='passed' && !this.loadTest.active) || this.canBeginKnot || this.knot.phase==='between' || (this.knot.phase==='tail' && !this.knot.tailPositioned)));}
  knotAction() {
    if(this.course.finished)return false;
    if(this.releaseCheck.state==='passed' && this.loadTest.begin()) {
      const right=this.instruments.find(t=>t.id==='right')!;
      this.loadGrip.copy(this.knotSlack.short.points.at(-1)!);
      this.loadDirection.subVectors(this.loadGrip,this.knotSlack.short.points[0]).normalize();
      if(this.loadDirection.lengthSq()<0.1)this.loadDirection.set(-1,0,0);
      right.openness=0.65;right.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
      right.root.position.copy(this.loadGrip).sub(new THREE.Vector3(0,0,0.05));return true;
    }
    if(this.canBeginKnot && this.grasp) {
      this.grasp.release(); this.grasp.needle.setThreadVisible(false);
      this.grasp.needle.root.position.set(3.1,0.1,1.2); this.grasp.needle.root.quaternion.identity();
      this.eversion.reset();this.knot.begin(this.selectedTechnique); this.prepareKnotTools(); return true;
    }
    if(this.knot.phase==='between') {this.knot.nextThrow(); this.prepareKnotTools(); return true;}
    if(this.knot.phase==='tail' && !this.knot.tailPositioned) {this.knot.positionTail();this.placeKnotTools();return true;}
    return false;
  }
  private prepareKnotTools() {
    for(const tool of this.instruments) {
      tool.root.quaternion.identity(); tool.openness=tool.id==='left'?0.1:0.65;
      tool.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    }
    this.placeKnotTools();
  }
  private placeKnotTools() {
    if(this.loadTest.active)return;
    for(const tool of this.instruments) tool.root.position.copy(tool.id==='left'?this.knot.leftPosition:this.knot.rightPosition);
  }
  private applyPassPose(pose=this.pass.pose) {
    if(!this.grasp?.holder)return;
    this.grasp.placeHeldNeedle(pose);
    this.grasp.update(this.eversion.held?this.instruments.filter(t=>t.kind!=='forceps'):this.instruments,this.pass.phase==='complete');
  }

  update(dt: number) {
    const step=Math.max(0,Math.min(dt,0.05));
    if(this.course.finished){for(const tool of this.instruments)tool.update(this.input.sample(tool.id),step);return;}
    if(this.knotSlack.trimmed){
      this.wound.update(this.wound.closure,step);
      for(const tool of this.instruments)tool.update(this.input.sample(tool.id),step);
      const left=this.instruments.find(t=>t.id==='left')!,right=this.instruments.find(t=>t.id==='right')!;
      this.knotSlack.advanceTrimmed(step,{short:right.openness<=.2?right.root.localToWorld(new THREE.Vector3(0,0,.05)):undefined,long:left.openness<=.2?left.root.localToWorld(new THREE.Vector3(0,0,.05)):undefined});return;
    }
    if(this.freeKnot.active) {
      for(const tool of this.instruments)tool.update(this.input.sample(tool.id),step);
      this.freeKnot.entry.copy(this.tissuePoint(this.pass.entry));this.freeKnot.exit.copy(this.tissuePoint(this.pass.exit));
      this.freeKnot.update(step,this.instruments,this.eversion.held?new Set(['left']):undefined);
      this.wound.update(this.freeKnot.closureLoad,step,this.freeKnot.pullDemand);
      const released=![...this.freeKnot.grips.values()].some(g=>g.strand===this.freeKnot.long||g.strand===this.freeKnot.short);
      this.freeReleaseTime=this.freeKnot.lockSeated&&this.wound.closure>.75&&released&&this.freeKnot.strands.every(s=>s.points.every(p=>p.toArray().every(Number.isFinite)))?Math.min(1.5,this.freeReleaseTime+step):0;
      this.updateEversion(step,!this.freeKnot.grips.has('left'));return;
    }
    if(this.knot.active) {
      const left=this.instruments.find(t=>t.id==='left')!,right=this.instruments.find(t=>t.id==='right')!;
      const lc=this.input.sample('left'),rc=this.input.sample('right');
      for(const tool of this.instruments) tool.update({...this.input.sample(tool.id),translation:[0,0,0],rotation:[0,0,0]},step);
      this.knot.update(lc,rc,left.openness,right.openness,step);
      if(this.loadTest.active) {
        const distance=this.knotSlack.short.points[0].distanceTo(this.loadGrip.clone().addScaledVector(this.loadDirection,this.loadTest.travel));
        if(right.openness>=0.45)this.loadTest.load=0;else this.loadTest.sample(distance,this.knotSlack.short.length);
        this.loadTest.update(step,right.openness<=0.2,right.openness>=0.45,-rc.translation[0]);
        right.root.position.copy(this.loadGrip).addScaledVector(this.loadDirection,this.loadTest.travel).sub(new THREE.Vector3(0,0,0.05));
      }
      if(this.knot.phase==='complete' && !this.loadTest.active)this.releaseCheck.release(left.openness,right.openness);
      const seating=this.knot.phase==='seating'?THREE.MathUtils.smoothstep(this.knot.seating,0.3,1):0;
      const target=this.loadTest.active?this.loadTest.closureTarget:this.knot.throws>=2?1:this.knot.throws===1?0.85+0.15*seating:0.85*seating;
      this.wound.update(target,step,this.loadTest.active?Math.max(0,(this.loadTest.load-.6)/.4):0); this.placeKnotTools();
      left.root.updateWorldMatrix(true,false);right.root.updateWorldMatrix(true,false);
      const leftJaw=left.root.localToWorld(new THREE.Vector3(0,0,0.05)),rightJaw=right.root.localToWorld(new THREE.Vector3(0,0,0.05));
      const loop=knotLoop(this.knot,right.root.matrixWorld);
      const tail=this.knot.phase==='seating' || this.knot.phase==='between' || this.knot.phase==='complete'?rightJaw:this.knot.tail;
      if(this.loadTest.active && this.loadTest.slipRate>0) {
        const material=this.knotSlack.material;
        const transfer=Math.min(this.loadTest.slipRate*step,Math.max(0,material.long-0.05));
        material.short+=transfer;material.long-=transfer;this.loadTest.slip+=transfer;
      }
      this.knotSlack.update(step,{
        enabled:true,
        releaseShort:this.releaseCheck.rightReleased && (!this.loadTest.active || this.loadTest.stage==='grasp' || right.openness>=0.45),
        releaseLong:this.releaseCheck.leftReleased,
        holdMaterial:this.releaseCheck.anyReleased,
        seating:this.knot.seating,
        seatedThrows:this.knot.phase==='complete'?1:this.knot.phase==='between'?0:this.knot.throws,
        retainedLength:SEATED_LOOP_LENGTH*this.knot.retainedWraps,
        loopLength:loop.length,
        shortStart:knotTailContact(this.knot,this.tissuePoint(this.pass.entry),loop),shortEnd:tail,
        longStart:loop.end,longEnd:leftJaw,
      });
      if(this.knot.phase==='complete' && !this.loadTest.active)this.releaseCheck.observe(step,{
        closure:this.wound.closure,shortMaterial:this.knotSlack.short.length,
        loopMaterial:this.knotSlack.material.loop+this.knotSlack.material.retained,
        anchorError:Math.max(this.knotSlack.short.points[0].distanceTo(knotTailContact(this.knot,this.tissuePoint(this.pass.entry),loop)),this.knotSlack.long.points[0].distanceTo(loop.end)),
        finite:[...this.knotSlack.short.points,...this.knotSlack.long.points].every(p=>p.toArray().every(Number.isFinite)),
      });this.updateEversion(step,false);return;
    }
    if(this.preparingEdge){
      for(const tool of this.instruments)tool.update(this.input.sample(tool.id),step);
      this.updateEversion(step);return;
    }
    const constrained=this.pass.phase==='passing';
    const waitingForHandoff=this.pass.phase==='complete' && this.pull.phase==='waiting' && this.grasp?.holder?.kind==='needle-driver';
    const extracting=this.pull.phase==='pulling' && this.grasp?.holder?.kind==='forceps';
    let drive=0; let turn=0;
    for(const tool of this.instruments) {
      const command=this.input.sample(tool.id);
      if(waitingForHandoff && tool===this.grasp?.holder) {
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step,true);
      } else if(extracting && tool===this.grasp?.holder) {
        turn=command.rotation[2];
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step,true);
      } else if(constrained && tool===this.grasp?.holder) {
        drive=command.rotation[2];
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step,true);
      } else tool.update(command,step);
    }
    this.updateEversion(step);
    const needleTools=this.eversion.held?this.instruments.filter(t=>t.kind!=='forceps'):this.instruments;
    this.grasp?.update(needleTools,this.pass.phase==='complete');
    if(constrained) {
      if(this.oppositeEdgeRequired&&this.eversion.anchor.x>0&&!this.eversion.held&&this.eversion.target.distanceTo(this.eversion.anchor)<.01)this.eversion.begin(-1);
      if(this.oppositeEdgeRequired&&this.eversion.anchor.x<0)this.eversion.opposingEdgeX=p=>.05-fieldShift(.05,p.z+this.course.siteZ,this.tissueField,p.y);
      const staged=this.environment.id==='skin';
      this.pass.update(this.guidedPassReady?drive:0,this.grasp?.holder?.kind==='needle-driver',step,staged&&!this.oppositeEdgeRequired?this.pass.firstSideAngle:this.pass.totalAngle);
      if(staged&&!this.oppositeEdgeRequired&&this.pass.angle>=this.pass.firstSideAngle-1e-8)this.oppositeEdgeRequired=true;
      this.wound.setDermalBites(...this.pass.dermalBites);
      if(this.pass.phase==='passing' || this.pass.phase==='complete') this.applyPassPose();
      if(this.pass.phase==='interrupted') this.placement.reset();
    }
    if(this.grasp && this.pass.phase==='complete') {
      if(this.pull.phase==='waiting' && this.grasp.holder?.kind==='forceps') {
        this.grasp.needle.root.updateWorldMatrix(true,false);
        this.pull.begin(this.grasp.needle.root.matrixWorld);
      }
      this.pull.update(turn,this.grasp.holder?.kind==='forceps',step);
      if(extracting && this.grasp.holder?.kind==='forceps') this.applyPassPose(this.pull.pose);

    }
    if(this.grasp) {
      const threaded=this.pass.phase==='passing' || this.pass.phase==='complete';
      this.grasp.needle.advanceThread(step,threaded?this.pass.angle+this.pull.angle:null,this.pass.center,(this.course.active?this.freeKnot.surfaceAt:this.environment.threadFloorAt??this.environment.surfaceAt),this.environment.threadContact);
      const pose=this.grasp.needle.getTipPose();
      this.placement.update(pose.position,pose.tangent,this.grasp.holder?.kind==='needle-driver',step);
    }
  }
  reset(){this.pass.resetBites();this.bitePlanLimited=false;this.course.reset();this.resetCurrent();this.configureTissueResponse();}
  private resetCurrent() {this.handlingPeak=this.handlingSlips=0;this.observedSlipSerial=this.eversion.slipSerial;this.freeFromPass=false;this.freeReleaseTime=0; for(const tool of this.instruments) tool.reset(); this.grasp?.reset(); this.placement.reset(); this.pass.reset();this.guidedEdge=false;this.oppositeEdgeRequired=false;this.eversion.reset(); this.pull.reset(); this.knot.reset(); this.wound.reset();this.tissueResponse.reset(); this.knotSlack.reset(); this.releaseCheck.reset();this.loadTest.reset();this.freeKnot.reset(); }
}
