/** Resolve offline detector jobs in dispatch order, independent of worker speed. */
export class ReplayWorkQueue {
    private tail:Promise<void>=Promise.resolve();
    run<T>(job:()=>Promise<T>):Promise<T>{
        const result=this.tail.then(job);
        this.tail=result.then(()=>undefined,()=>undefined);
        return result;
    }
}
