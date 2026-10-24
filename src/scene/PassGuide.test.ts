import {expect,it} from 'vitest';
import * as THREE from 'three';
import {NeedlePass} from '../tissue/NeedlePass';
import {DEFAULT_BITE_WIDTH} from '../tissue/BitePlan';
import {PassGuide} from './PassGuide';
it('moves the exit marker and redraws the circle to match selected bites',()=>{
 const pass=new NeedlePass(),guide=new PassGuide(pass);pass.setBites(DEFAULT_BITE_WIDTH*1.3,DEFAULT_BITE_WIDTH*.7);guide.update(pass);
 expect(guide.root.children[0].position.equals(pass.exit)).toBe(true);
 const path=guide.root.children[1] as THREE.Line,points=path.geometry.getAttribute('position');
 expect(new THREE.Vector3().fromBufferAttribute(points,0).distanceTo(pass.entry)).toBeLessThan(1e-6);
 expect(new THREE.Vector3().fromBufferAttribute(points,points.count-1).distanceTo(pass.exit)).toBeLessThan(1e-6);
});
