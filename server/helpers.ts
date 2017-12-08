'use strict';

import * as _ from 'lodash';
import concat = require('concat-stream');
import * as simpleGet from 'simple-get';
import * as conf from './conf';

if (Promise.prototype.tap === undefined) {
    // https://github.com/kriskowal/q/wiki/API-Reference#promisetaponfulfilled
    // NB: "f" can modify the result in case it throws an exception or return a rejected promise
    // (cf https://github.com/petkaantonov/bluebird/blob/master/test/mocha/tap.js#L39-L46 )
    Promise.prototype.tap = function (f) {
        return this.then(v => {
            let p = f(v);
            if (!p || !p.then) p = Promise.resolve(p);
            return p.then(() => v);
        });
    };
}

export const post = (url: string, body: string, options: simpleGet.Options) : Promise<string> => {
    options = _.assign({ url, body, ca: conf.http_client_CAs }, options);
    return new Promise((resolve: (string) => void, reject: (any) => void) => {
        simpleGet.post(options, (err, res) => {
            if (err) return reject(err);
            res.setTimeout(options.timeout || 10000, null);

            //console.log(res.headers)

            res.pipe(concat(data => {
                //console.log('got the response: ' + data)
                resolve(data.toString());
            }));
        });
    });
};

export const promisify_callback = f => (
    (...args) => {
        return new Promise((resolve, reject) => {
            function callback(err, result) {
                if (err) reject(err); else resolve(result);
            }
            f.apply(null, args.concat(callback));
        });
    }
);
