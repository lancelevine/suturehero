import type {MarkerJawSnapshot} from '../jaw/markerJawController';
/** Presentation only: the existing marker-relative tracker supplies all detections. */
export function markerJawDiagnostics(snapshot:MarkerJawSnapshot,camera:number){
    const readings=camera===0?snapshot.readings:[];
    const current=camera===0&&snapshot.current;
    const confidence=current&&readings.length?readings.reduce((sum,r)=>sum+r.reading.confidence,0)/readings.length:null;
    const balls=readings.flatMap(({instrument,reading})=>reading.balls.map((ball,index)=>{
        const opening=reading.opening??0;
        const point=ball.found??{x:ball.closed.x+(ball.open.x-ball.closed.x)*opening,y:ball.closed.y+(ball.open.y-ball.closed.y)*opening};
        return {id:instrument+' '+String.fromCharCode(65+index),x:point.x,y:point.y,radius:7,state:current&&ball.found?'detected':ball.moving?'predicted':'model',confidence:current?reading.confidence:null};
    }));
    return {jawEngine:'marker',ballSupported:camera===0,ballProcessed:current,ballWidth:snapshot.width||1,ballHeight:snapshot.height||1,balls,confidence};
}
