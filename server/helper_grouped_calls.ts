import { promise_defer } from './helpers';

type fl<In, Out> = (l : In[]) => Promise<Out[]>
type one<In, Out> = { param: In } & promise_defer<Out>
type grouped<In, Out> = one<In, Out>[]
export interface options { nb_parallel_calls: number, group_size: number }

require('promise.prototype.finally').shim();

function add_to_grouped_calls<In, Out>(grouped: grouped<In, Out>, param: In) {
    const deferred = promise_defer<Out>();
    grouped.push({ param, ...deferred });
    return deferred.promise;
}

async function handle_grouped_calls<In, Out>(fl : fl<In, Out>, grouped : grouped<In, Out>) {
    try {
        const results = await fl(grouped.map(one => one.param));
        grouped.forEach((one, i) => {
            one.resolve(results[i]);
        });
    } catch (err) {
        grouped.forEach(one => one.reject(err));
    }
}

export default function grouped_calls<In, Out>(fl : fl<In, Out>, { nb_parallel_calls, group_size } : options) {
    let queue : grouped<In, Out> = [];
    let nb_running = 0;
    function may_handle_queue() {               
        while (queue.length && nb_running < nb_parallel_calls) {
            const grouped = queue.splice(0, group_size);
            nb_running++
            // start in background:
            //console.log("treating", grouped.map(one => one.param), "remaining", queue.map(one => one.param));
            handle_grouped_calls(fl, grouped).finally(() => { 
                nb_running--; 
                may_handle_queue();
            })
        }
    }
    return (param: In) => {
        const p = add_to_grouped_calls(queue, param);
        may_handle_queue();
        return p;
    };        
}
