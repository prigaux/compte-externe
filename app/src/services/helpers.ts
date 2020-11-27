import axios from 'axios';
import { memoize } from 'lodash';
import conf from '../conf';

    const entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    function escapeHtml(str) {
        return String(str).replace(/[&<>"'\/]/g, (s) =>
               entityMap[s]
        );
    }

    export function formatDifferences(val1, val2, JsDiff) {
        var diff = JsDiff.diffChars(val1, val2, { ignoreCase: true });
        var fragment1 = '';
        var fragment2 = '';
        for (var i = 0; i < diff.length; i++) {
            if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
                var swap = diff[i];
                diff[i] = diff[i + 1];
                diff[i + 1] = swap;
            }

            var txt = escapeHtml(diff[i].value);
            if (diff[i].removed) {
                fragment1 += '<ins>' + txt + '</ins>';
            } else if (diff[i].added) {
                fragment2 += '<ins>' + txt + '</ins>';
            } else {
                fragment1 += txt;
                fragment2 += txt;
            }
        }
        return [fragment1, fragment2];
    }

    export function frenchPostalCodeToTowns(postalcode: string, token: string = ''): Promise<string[]> {
        var url = '//search-towns.univ-paris1.fr/';
        var params = { postalcode, token, country: 'FR', maxRows: 99 };
        return axios.get(url, { params }).then((r) => 
            r.data && r.data['towns']
        );
    }

    // runtime cast
    export function cast<T>(o, c: { new(...any): T }): T {
        return o instanceof c && o;
    }

    export function copy<T>(o : T, opts = {}) : T {
        return assign({}, o, opts);
    }

    // similar to ES6 Object.assign
    export function assign<T1, T2>(o: T1, o2: T2, opts = {}): T1 & T2 {
        eachObject(o2, function (k, v) {
            o[k] = v;
        }, opts);
        return <T1 & T2> o;
    }

    export function simpleEach(a, fn) {
        var len = a.length;
        for (var i = 0; i < len; i++) {
            fn(a[i], i, a);
        }
    }

    export function eachObject<T>(o : T, fn : (string, any, T) => any, { allAttrs = false } = {}) {
        for (var k in o) {
            if (allAttrs || o.hasOwnProperty(k))
                fn(k, o[k], o);
        }
    }

    export function partitionObject<T>(o : Dictionary<T>, fn : (string, T) => boolean) {
        let with_ = {};
        let without = {};
        eachObject(o, (k, val) => {
            (fn(k, val) ? with_ : without)[k] = val;
        });
        return [with_, without];
    }

    export const equalsIgnoreCase = (a: string, b: string) => (
        a.toLowerCase() === b.toLowerCase()
    )
        
    export function createCookie(name : string, value : string, days : number) : void {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    export function getCookie(name : string) : string {
        var m = document.cookie.match(new RegExp(name + '=([^;]+)'));
        return m && m[1];
    }

    export function groupBy<T>(items : T[], getter : (item: T) => string) : Dictionary<T[]> {
        var result = {};
        items.forEach(function (elm) {
            var prop = getter(elm);    
            if (!result[prop]) result[prop] = [];
            result[prop].push(elm);
        });
        return result;
    }

    export function padStart(value, length : number, char : string) : string {
        value = value + '';
        var len = length - value.length;

        if (len <= 0) {
                return value;
        } else {
                return Array(len + 1).join(char) + value;
        }
    }

    export function finallyP<P>(p : Promise<P>, cb : () => void) : Promise<void> {
        return p.then(cb).catch(cb);
    }
    
    export function formatDate(date : Date | string, format : string) : string {
        const date_ : Date = typeof date === "string" ? new Date(date) : date;
        if (!date) return null;
        return format.split(/(yyyy|MM|dd|HH|mm|ss)/).map(function (item) {
            switch (item) {
                case 'yyyy': return date_.getFullYear();
                case 'MM': return padStart(date_.getMonth() + 1, 2, '0');
                case 'dd': return padStart(date_.getDate(), 2, '0');
                case 'HH': return padStart(date_.getHours(), 2, '0');
                case 'mm': return padStart(date_.getMinutes(), 2, '0');
                case 'ss': return padStart(date_.getSeconds(), 2, '0');
                default: return item;
            }
        }).join('');   
    }

    export function formatValue(val) {
        if (val instanceof Date) {
            return formatDate(val, 'dd/MM/yyyy');
        } else {
            return "" + (val || '');
        }
    }

    export const maybeFormatPhone = (resultFrenchPrefix: string) => (maybePhone : string) : string => {
        if (maybePhone.match(conf.pattern.frenchPhone)) {
            return maybePhone.replace(/^(\+33|0)/, '').replace(/\s/g, '').replace(/(.)(..)(..)(..)(..)/, resultFrenchPrefix + "$1 $2 $3 $4 $5");
        }
        return maybePhone;
    }

    export function escapeRegexp(s : string) {
        return ('' + s).replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    }

    export function filter(collection, predicate) {
        if (Array.isArray(collection)) return collection.filter(predicate);

        let r = {};
        for (let k in collection) {
            if (predicate(collection[k], k)) r[k] = collection[k];
        }
        return r;
    }

    export function checkLuhn(value: string, wantedLength?: number) {
        // accept only digits, dashes or spaces
        if (value.match(/[^0-9-\s]+/)) return false;

        value = value.replace(/\D/g, "");

        if (wantedLength && wantedLength !== value.length) return false;

        let check = 0, even = false;

        for (let n = value.length - 1; n >= 0; n--) {
            let digit = parseInt(value.charAt(n));

            if (even) {
                digit *= 2
                if (digit > 9) digit -= 9;
            }

            check += digit;
            even = !even;
        }

        return (check % 10) === 0;
    }

    // from https://developers.google.com/web/updates/2012/08/Quick-FAQs-on-input-type-date-in-Google-Chrome
    export const isDateInputSupported = memoize(() => {
        let elem = document.createElement('input');
        elem.setAttribute('type', 'date');
        elem.value = 'foo';
        return (elem.type === 'date' && elem.value !== 'foo');
    });

export const fileReader = (readAs: 'readAsDataURL' | 'readAsText', file: File) => (
    new Promise((resolve, reject) => {
        const reader = new FileReader();           
        reader.onerror = () => reject(reader.error);
        reader.onabort = () => reject(reader.error);
        reader.onload  = () => resolve(reader.result);
        reader[readAs](file);
    })
);

export type promise_defer<T> = { promise : Promise<T>; resolve(v : T) : void, reject(err): void };
export function promise_defer<T>() {
    let deferred = {} as promise_defer<T>;
    deferred.promise = new Promise((resolve, reject) => { deferred.resolve = resolve; deferred.reject = reject });
    return deferred;
}

export function isElementInViewport (el : HTMLElement) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
}

