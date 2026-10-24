export const MARKER_GROUPS = { needleDriver: [6, 7, 8], forceps: [3, 4, 5], scissors: [0, 1, 2] } as const;
export type InstrumentName = keyof typeof MARKER_GROUPS;
export interface MarkerObservation { id: number; corners: Array<{x:number;y:number}>; }
export interface InstrumentObservation { name: InstrumentName; markers: MarkerObservation[]; center: {x:number;y:number}; }
export function groupMarkers(markers: MarkerObservation[]): InstrumentObservation[] {
  return (Object.keys(MARKER_GROUPS) as InstrumentName[]).flatMap(name => {
    const ids: readonly number[] = MARKER_GROUPS[name];
    const visible = markers.filter(m => ids.includes(m.id));
    if (!visible.length) return [];
    const pts = visible.flatMap(m => m.corners);
    return [{name, markers:visible, center:{x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length}}];
  });
}
export async function openCamera(deviceId?:string):Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({audio:false,video:{deviceId:deviceId?{exact:deviceId}:undefined,width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}}});
}
export async function availableCameras():Promise<MediaDeviceInfo[]> {
  return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
}
