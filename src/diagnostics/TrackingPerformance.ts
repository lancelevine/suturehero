export interface TimingRow {name:string;count:number;rate:number;meanMs:number;p95Ms:number;maxMs:number}
/** Bounded rolling measurements. Durations may overlap across workers/stages. */
export class TrackingPerformance {
 private samples=new Map<string,{at:number;ms:number;weight:number}[]>();private counters=new Map<string,number>();private started:number;
 constructor(private clock=()=>performance.now(),private windowMs=5000){this.started=clock();}
 /** Live profiler hook (src/diagnostics/LiveProfiler.ts); null while profiling is off, so it costs one check per sample. */
 listener:((name:string,ms:number,weight:number,at:number)=>void)|null=null;
 sample(name:string,ms:number,weight=1){if(!Number.isFinite(ms)||ms<0||!Number.isFinite(weight)||weight<=0)return;const at=this.clock(),values=this.samples.get(name)??[];this.listener?.(name,ms,weight,at);values.push({at,ms,weight});while(values.length>2048||values[0]?.at<at-this.windowMs)values.shift();this.samples.set(name,values);}
 tick(name:string,weight=1){this.sample(name,0,weight);}
 count(name:string,amount=1){this.counters.set(name,(this.counters.get(name)??0)+amount);}
 measure<T>(name:string,work:()=>T):T{const start=this.clock();try{return work();}finally{this.sample(name,this.clock()-start);}}
 reset(){this.samples.clear();this.counters.clear();this.started=this.clock();}
 snapshot(){const now=this.clock(),seconds=Math.max(.001,Math.min(this.windowMs,now-this.started)/1000),rows:TimingRow[]=[];
  for(const [name,values] of this.samples){while(values[0]?.at<now-this.windowMs)values.shift();if(!values.length)continue;const durations=values.map(v=>v.ms).sort((a,b)=>a-b);rows.push({name,count:values.reduce((sum,v)=>sum+v.weight,0),rate:values.reduce((sum,v)=>sum+v.weight,0)/seconds,meanMs:durations.reduce((sum,v)=>sum+v,0)/durations.length,p95Ms:durations[Math.ceil(durations.length*.95)-1],maxMs:durations.at(-1)!});}
  return {elapsedSeconds:(now-this.started)/1000,windowSeconds:seconds,rows,counters:Object.fromEntries(this.counters)};
 }
}
export const trackingPerformance=new TrackingPerformance();
