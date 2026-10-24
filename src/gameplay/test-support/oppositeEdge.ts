import type {PracticeSession} from '../PracticeSession';
import type {Instrument} from '../../instruments/Instrument';
/** Perform the user-operated second-edge maneuver in a headless workflow. */
export function alignOppositeEdge(session:PracticeSession,tools:readonly Instrument[]){
 if(!session.oppositeEdgeRequired||session.oppositeEdgeReady)return;
 const left=tools.find(t=>t.kind==='forceps')!;left.openness=.7;
 for(let i=0;i<14;i++)session.update(.05);
 if(!session.positionForceps())throw new Error('Opposite edge positioning unavailable');
 left.openness=.1;session.update(.01);
 left.root.position.y+=.15;left.root.position.x+=.045;session.update(.01);
 if(!session.oppositeEdgeReady)throw new Error('Opposite edge did not align');
}
