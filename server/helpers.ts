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

export type promise_defer<T> = { resolve(v : T) : void, reject(err): void, promise : Promise<T> };
export function promise_defer<T>() {
    let deferred = {} as promise_defer<T>;
    deferred.promise = new Promise((resolve, reject) => { deferred.resolve = resolve; deferred.reject = reject });
    return deferred;
}

export const setTimeoutPromise = (time) => (
    new Promise((resolve, _) => setTimeout(resolve, time))
);

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

export const addYears = (date : Date, years : number) => {
    let r = new Date(date);
    r.setFullYear(r.getFullYear() + years)
    return r;
}

export const addDays = (date : Date, days : number) => {
    let r = new Date(date);
    r.setTime(r.getTime() + days * 60 * 60 * 24 * 1000);
    return r;
}

export const nextDate = (pattern : string, date: Date) => {
    let s = pattern.replace(/^XXXX-/, "" + date.getFullYear() + "-");
    let r = new Date(s);
    if (r.getTime() < date.getTime()) r.setFullYear(r.getFullYear() + 1);
    return r;
}

export const anonymize_phoneNumber = (s: string) => (
    s && s.replace(/ /g, "").replace(/^\+33/, "0").substring(0, 6) + "****"
)

export const anonymize_email = (s: string) => (
    s && "****" + s.substring(4)
)

export const equalsIgnoreCase = (a: string, b: string) => (
    a.toLowerCase() === b.toLowerCase()
)

export const sameKeyNameChoices = (l: string[]) => (
    l.map(s => ({ const: s, title: s }))
)

export function inclusive_range(start: string, end: string): string[];
export function inclusive_range(start: number, end: number): number[];
export function inclusive_range(start, end): any {
    return typeof start === 'number' ?
        _.range(start, end+1) :
        _.range(start.charCodeAt(0), end.charCodeAt(0) + 1).map(n => String.fromCharCode(n))
}

export function is_valid_uai_code(uai: string) {    
    uai = uai.toLowerCase(); // normalize

    if (!uai.match(/^\d{7}[a-z]$/)) return false;

    // alphabet pris en compte (23 lettres, sans I, O et Q)
    const alphabet_23 = "abcdefghjklmnprstuvwxyz".split('');

    const given_checksum = uai.substr(7, 1);
    const computed_checksum = alphabet_23[parseInt(uai.substr(0, 7)) % 23];
    
    return given_checksum === computed_checksum;
}

export function get_delete(o: {}, key: string) {
    const val = o[key];
    delete o[key];
    return val;
}

const xmlEncodeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };

export const escapeXml = (value: string): string => (
    String(value).replace(/[&<>"']/g, c => xmlEncodeMap[c])
)

export function mapLeaves(v, fn) {
    if (_.isPlainObject(v)) {
        const r = {};
        _.each(v, (v_, k) => r[fn(k)] = mapLeaves(v_, fn));
        return r;
    } else if (_.isArray(v)) {
        return v.map(v_ => mapLeaves(v_, fn));
    } else {
        return fn(v);
    }
}