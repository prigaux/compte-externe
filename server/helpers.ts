'use strict';

import * as _ from 'lodash';
export * from '../shared/helpers'

if (Promise.prototype.tap === undefined) {
    // https://github.com/kriskowal/q/wiki/API-Reference#promisetaponfulfilled
    // NB: "f" can modify the result in case it throws an exception or return a rejected promise
    // (cf https://github.com/petkaantonov/bluebird/blob/master/test/mocha/tap.js#L39-L46 )
    Promise.prototype.tap = function (f: (_:any) => void | Promise<void>) {
        return this.then(v => {
            let p = f(v);
            if (!p || !p.then) p = Promise.resolve(p);
            return p.then(() => v);
        });
    };
}

// reify a promise: create a promise and return an object with promise + resolve/reject functions
export type promise_defer<T> = { resolve(v : T) : void, reject(err: string): void, promise : Promise<T> };
export function promise_defer<T>() {
    let deferred = {} as promise_defer<T>;
    deferred.promise = new Promise((resolve, reject) => { deferred.resolve = resolve; deferred.reject = reject });
    return deferred;
}

// @ts-expect-error
export const promisify_callback = f => (
    // @ts-expect-error
    (...args) => {
        return new Promise((resolve, reject) => {
            // @ts-expect-error
            function callback(err, result) {
                if (err) reject(err); else resolve(result);
            }
            f.apply(null, args.concat(callback));
        });
    }
);

export function pmap<T,U>(o: T[], f: (e: T) => Promise<U>): Promise<U[]>
export function pmap<T,U>(o: Dictionary<T>, f: (e: T, key: string) => Promise<U>): Promise<U[]>
// @ts-expect-error
export function pmap (o, f) { return Promise.all(_.map(o, f)) }

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
// @ts-expect-error
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

export function get_delete<T>(o: Dictionary<T>, key: string): T {
    const val = o[key];
    delete o[key];
    return val;
}

export function renameKey<T>(o: Dictionary<T>, oldK: string, newK: string): Dictionary<T> {
    if (o && (oldK in o)) {
        o = _.clone(o);
        o[newK] = get_delete(o, oldK);
    }
    return o;
}

const xmlEncodeMap: Dictionary<string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };

export const escapeXml = (value: string): string => (
    String(value).replace(/[&<>"']/g, c => xmlEncodeMap[c])
)

export function mapLeaves(v: any, fn: (v: any) => any): any {
    if (_.isPlainObject(v)) {
        const r: Dictionary<any> = {};
        _.each(v, (v_, k) => r[fn(k)] = mapLeaves(v_, fn));
        return r;
    } else if (_.isArray(v)) {
        return v.map(v_ => mapLeaves(v_, fn));
    } else {
        return fn(v);
    }
}

// similar to String#split, but without trailing empty string
// inspired by https://doc.rust-lang.org/std/primitive.str.html#method.split_terminator
// useful for value==='' : it returns [] instead of ['']
// NB2: javascript split is similar to python/rust
//      perl/ruby removes trailing empty strings
//      java/scala removes trailing empty strings, EXCEPT for input value===''
export const split_terminator = (value: string, separator: string) => {
    let l = value.split(separator)
    if (_.last(l) === '') l.pop()
    return l
}

export const replace_same_field_value_with_idem = (l: Dictionary<unknown>[], field: string, idem: string) => {
    let prev
    for (const e of l) {
        const val = e[field]
        if (prev === val) e[field] = idem
        prev = val
    }
}

export const invertByManyValues = (o: Dictionary<string[]>) => {
    let r: Dictionary<string[]> = {}
    _.each(o, (values, key) => {
        for (const value of values) {
            (r[value] ??= []).push(key)
        }
    })
    return r
}

const two_digit = (n: number | string) => ("" + n).padStart(2, "0")
export const to_DD_MM_YYYY = (date: Date) => (
    //date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
    // do it by hand until we force nodejs >= 13 which has full-icu by default 
    [ date.getDate(), date.getMonth() + 1, date.getFullYear() ].map(two_digit).join('/')
)
