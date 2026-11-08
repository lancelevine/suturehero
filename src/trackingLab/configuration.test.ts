import {afterEach,it,expect,vi} from 'vitest';
import {snapshotTrackingStorage} from './configuration';
afterEach(()=>vi.unstubAllGlobals());
it('captures current settings and unsaved profile overrides without unrelated browser keys',()=>{
 const values={'suturehero.trackerType':'ring8','other-site-key':'secret'};
 vi.stubGlobal('window',{localStorage:{length:2,key:(i:number)=>Object.keys(values)[i],getItem:(k:keyof typeof values)=>values[k]}});
 expect(snapshotTrackingStorage({'suturehero.profiles.v1':'current'})).toEqual({'suturehero.trackerType':'ring8','suturehero.profiles.v1':'current'});
});
it('survives blocked site storage without losing the current in-memory settings',()=>{
 vi.stubGlobal('window',{get localStorage(){throw new Error('Blocked');}});
 expect(snapshotTrackingStorage({'suturehero.profiles.v1':'current'})).toEqual({'suturehero.profiles.v1':'current'});
});
