import {expect,it} from 'vitest';
import * as THREE from 'three';
import {skinThreadContact} from './SkinThreadContact';
it('stops a thread entering the pad side without lifting it onto the top',()=>{
 const p=new THREE.Vector3(-2.67,.1,0),old=new THREE.Vector3(-2.7,.1,0);skinThreadContact()([p],[old],new Set());
 expect(p.x).toBeCloseTo(-2.68);expect(p.y).toBe(.1);
});
it('supports the skin top and respects the local driver indentation and pins',()=>{
 const p=new THREE.Vector3(0,.4,0),old=p.clone();skinThreadContact()([p],[old],new Set());expect(p.y).toBe(.423);
 const indented=new THREE.Vector3(0,.39,0);skinThreadContact(()=>.383)([indented],[indented.clone()],new Set());expect(indented.y).toBe(.39);
 const pin=new THREE.Vector3(0,.3,0);skinThreadContact()([pin],[pin.clone()],new Set([0]));expect(pin.y).toBe(.3);
});
