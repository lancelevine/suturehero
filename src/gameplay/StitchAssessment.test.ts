import {expect,it} from 'vitest';
import * as THREE from 'three';
import {assessStitch,type StitchFrame} from './StitchAssessment';
const frame=():StitchFrame=>({lab:false,skin:true,pass:true,extracted:true,knot:true,seated:true,released:true,trimmed:2,bites:[new THREE.Vector3(.27,.31,0),new THREE.Vector3(-.27,.31,0)],closure:1,eversion:.02,pucker:0,peakPull:0});
it('requires the actual pass, extraction, seated knot, release and both cuts for a completed stitch',()=>{
 const f=frame();expect(assessStitch(f).complete).toBe(true);
 for(const missing of [{pass:false},{extracted:false},{knot:false},{seated:false},{released:false},{trimmed:1},{closure:.5},{bites:[null,null]}])expect(assessStitch({...f,...missing}).complete).toBe(false);
 expect(assessStitch({...f,lab:true}).complete).toBe(false);expect(assessStitch({...f,lab:true}).labFinished).toBe(true);
});
it('reports unequal placement, edge mismatch and excessive tension without inventing a clinical score',()=>{
 const f=frame();f.bites=[new THREE.Vector3(.15,.31,0),new THREE.Vector3(-.4,.31,.15)];f.pucker=.02;f.peakPull=.9;
 const feedback=assessStitch(f).feedback.join(' ');expect(feedback).toContain('unequal widths');expect(feedback).toContain('uneven bites');expect(feedback).toContain('ease tension');expect(feedback).toContain('High pull observed');
});
