import {readStored} from '../input/trackingStorage';
/** Preserve settings without reviving the blocked-localStorage crash fixed upstream. */
export function snapshotTrackingStorage(overrides:Record<string,string|null>={}):Record<string,string|null>{
    const values:Record<string,string|null>={};
    try {
        const storage=window.localStorage;
        for(let i=0;i<storage.length;i++){
            const key=storage.key(i);
            if(key?.startsWith('suturehero'))values[key]=readStored(key,storage);
        }
    }catch{/* Current profiles and defaults still work when site settings are blocked. */}
    return {...values,...overrides};
}
