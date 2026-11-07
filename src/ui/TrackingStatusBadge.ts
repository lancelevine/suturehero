export function mountTrackingStatusBadge(viewport:HTMLElement){
 const badge=document.createElement('div');badge.id='practice-tracking-status';badge.className='practice-tracking-status';
 badge.setAttribute('role','status');badge.setAttribute('aria-live','polite');
 const dot=document.createElement('i'),label=document.createElement('span');badge.append(dot,label);viewport.append(badge);
 const show=(state:string,text:string,title=text)=>{badge.dataset.state=state;if(label.textContent!==text)label.textContent=text;badge.title=title;};
 show('off','Camera tracking off');
 return {off:()=>show('off','Camera tracking off'),waiting:()=>show('waiting','Tracking status unavailable'),update:(data:any)=>{
  if(data?.type!=='suturehero:tracking-status'||!['active','fallback','waiting','off','mono','mismatch'].includes(data.state))return false;
  const cameras=Object.values(data.sources??{}).filter(v=>v==='camera1'||v==='camera2');
  const names=[...new Set(cameras)].map(c=>c==='camera1'?'Camera 1':'Camera 2').join(' + ');
  const text=data.state==='active'?'Stereo triangulation ACTIVE':data.state==='fallback'?'Stereo fallback · '+(names||'single camera'):data.state==='mono'?'Single-camera tracking':data.state==='mismatch'?'Stereo calibration mismatch':data.state==='waiting'?'Stereo · waiting for trackers':'Camera tracking off';
  show(data.state,text,typeof data.label==='string'?data.label:text);return true;
 }};
}
