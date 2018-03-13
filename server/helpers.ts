'use strict';

import * as _ from 'lodash';

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

export const addDays = (date : Date, days : number) => {
    let r = new Date(date);
    r.setDate(r.getDate() + days);
    return r;
}

export const nextDate = (pattern : string, date: Date) => {
    let s = pattern.replace(/^XXXX-/, "" + date.getFullYear() + "-");
    let r = new Date(s);
    if (r.getTime() < date.getTime()) r.setFullYear(r.getFullYear() + 1);
    return r;
}

export const equalsIgnoreCase = (a: string, b: string) => (
    a.toLowerCase() === b.toLowerCase()
)

export const sameKeyNameChoices = (l: string[]) => (
    l.map(s => ({ key: s, name: s }))
)

export function inclusive_range(start: string, end: string): string[];
export function inclusive_range(start: number, end: number): number[];
export function inclusive_range(start, end): any {
    return typeof start === 'number' ?
        _.range(start, end+1) :
        _.range(start.charCodeAt(0), end.charCodeAt(0) + 1).map(n => String.fromCharCode(n))
}
