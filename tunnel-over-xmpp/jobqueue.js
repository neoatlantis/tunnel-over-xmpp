class JobQueue {

    constructor(worker){
        const self = this;
        this.worker = worker;
        this.queue = [];
        this.destroyed = false;

        async function start(){
            let nextjob = null;
            while(!self.destroyed){
                nextjob = self.queue.shift();
                if(undefined === nextjob){
                    await new Promise((resolve, _)=>setImmediate(resolve));
                    continue;
                }

                while(!self.destroyed){
                    try{
                        const ret = await self.worker(nextjob);
                        if(true === ret) break;
                    } catch(e){
                        console.error(e);
                    } finally {
                        await new Promise(
                            (resolve, _)=>setImmediate(resolve));
                    }
                }
            }
        }
        start();
    }

    push(job){
        this.queue.push(job);
    }

    destroy(){
        this.destroyed = true;
    }

}

module.exports = JobQueue;
