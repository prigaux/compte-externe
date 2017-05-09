'use strict';

import _ = require('lodash');

export const datetime: ldap_conversion = {
        fromLdap: (dt: string): Date => {
            if (!dt) return null;
            let m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
            return m && new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6])));
        },
        toLdap: (d: Date): string => (
            d.toISOString().replace(/\.\d+/, '').replace(/[T:-]/g, '')
        ),
    };

export const date: ldap_conversion = {
        fromLdap: (dt: string): Date => {
            if (!dt) return null;
            let m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)$/);
            return m && new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
        },
        toLdap: (d: Date): string => (
            d.toISOString().replace(/T.*/, '').replace(/-/g, '')
        ),
    };

export const postalAddress: ldap_conversion = {
        fromLdap: (s: string): string => (
            s && s.replace(/\$/g, "\n")
        ),
        toLdap: (s: string): string => (
            s && s.replace(/\n/g, "$")
        ),
    };

export function withEtiquette(etiquette: string): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): string => {
            for (let s of l) {
                if (_.startsWith(s, etiquette))
                    return s.substr(etiquette.length);
            }
            return null;
        },
        toLdap: (s: string): string => (
            etiquette + s
        ),
    };
}

export function dn(attrName: string, base: string): ldap_conversion {
    return {
        fromLdap: (s: string): string => {
            let base_ = _.escapeRegExp(base);
            let reg = new RegExp(`^${attrName}=(.*),${base_}$`);
            let m = s.match(reg);
            return m && m[1];
        },
        toLdap: (s: string): string => (
            attrName + "=" + s + "," + base
        )
    }
}