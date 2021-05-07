// @ts-nocheck

import * as _ from 'lodash';
import { assert } from './test_utils';
import grouped_calls from '../helper_grouped_calls';
import { setTimeoutPromise } from '../helpers';

const sequence = (first: number, last: number) => Array.from({length: last - first + 1}, (_, i) => i + first) as number[];

describe('helper_grouped_calls', () => {

        async function test(in_, fl, options) {
            let calls = [];
            async function wrapped_fl(l) {
                calls.push({ in: l });
                const out = await fl(l);
                calls.push({ out });
                return out;
            }
            const f = grouped_calls(wrapped_fl, options)
            const out = await Promise.all(in_.map(async e => f(await e)));
            const in__ = await Promise.all(in_); // get the various promises results
            assert.deepEqual(in__, out);
            return calls;
        }

        it ("should work for one call", async () => {
            const fl = async (l : number[]) => l;
            const calls = await test([42], fl, { nb_parallel_calls: 99, group_size: 99 });
            assert.deepEqual(calls, [
                { in: [42] }, { out: [42] },
            ]);
        });

        it ("should work sync", async () => {
            let is_async = false;
            setTimeoutPromise(0).then(_ => is_async = true)
            
            const fl = async (l : number[]) => l;
            const in_ = sequence(1, 10);
            const calls = await test(in_, fl, { nb_parallel_calls: 99, group_size: 99 });
            assert.equal(is_async, false, "it should have computed everything synchroneously");
            assert.deepEqual(calls, [
                ...in_.map(e => ({ in: [e] })),
                ...in_.map(e => ({ out: [e] })),
            ]);
        });

        it ("should work async", async () => {
            let is_async = false;
            setTimeoutPromise(0).then(_ => is_async = true);

            const fl = async (l : number[]) => (await setTimeoutPromise(0), l);
            const in_ = sequence(1, 10);
            const calls = await test(in_, fl, { nb_parallel_calls: 1, group_size: 1 });
            assert.equal(is_async, true, "it should have computed everything asynchroneously");
            assert.deepEqual(calls, _.flatten(in_.map(e => [ { in: [e] }, { out: [e] } ])))
        });

        it ("should group", async () => {
            const fl = async (l : number[]) => (await setTimeoutPromise(0), l);
            const in_ = sequence(1, 4);
            const calls = await test(in_, fl, { nb_parallel_calls: 1, group_size: 99 });
            assert.deepEqual(calls, [ 
                { in: [ 1 ] }, { out: [ 1 ] },
                { in: [ 2, 3, 4 ] }, { out: [ 2, 3, 4 ] },
            ]);
        });

        it ("should parallelize async params", async () => {
            const fl = async (l : number[]) => (await setTimeoutPromise(20), l);
            const in_ = [ 10, 20, 60, 70 ];
            const in_async = in_.map(i => setTimeoutPromise(i).then(_ => i));
            const calls_2_many = await test(in_async, fl, { nb_parallel_calls: 2, group_size: 99 });
            assert.deepEqual(calls_2_many, [ 
                { in: [ 10 ] },
                { in: [ 20 ] }, { out: [ 10 ] }, { out: [ 20 ] },
                { in: [ 60 ] },
                { in: [ 70 ] }, { out: [ 60 ] }, { out: [ 70 ] },
            ]);
            const calls_1_many = await test(in_async, fl, { nb_parallel_calls: 1, group_size: 99 });
            assert.deepEqual(calls_1_many, [ 
                { in: [ 10 ] }, { out: [ 10 ] },
                { in: [ 20, 60, 70 ] }, { out: [ 20, 60, 70 ] },
            ]);
            const calls_1_2 = await test(in_async, fl, { nb_parallel_calls: 1, group_size: 2 });
            assert.deepEqual(calls_1_2, [ 
                { in: [ 10 ] }, { out: [ 10 ] },
                { in: [ 20, 60 ] }, { out: [ 20, 60 ] },
                { in: [ 70 ] }, { out: [ 70 ] },
            ]);
        });

});
