'use strict';

import * as _ from 'lodash';

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

export const date_epoch: ldap_conversion = {
    fromLdap: (s: string): Date => {
        if (!s) return null;
        const n = parseInt(s)
        return n && new Date(n * 24 * 60 * 60 * 1000);
    },
    toLdap: (d: Date): string => (
        "" + Math.round(d.getTime() / (24 * 60 * 60 * 1000))
    ),
}

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
        toLdap: (s: string) => ({ action: (vals: string[]) => (
            vals.filter(s => !_.startsWith(s, etiquette)).concat(s ? [etiquette + s] : [])
        ) }),
    };
}

export function has_value(value: string): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): string => (
            l.includes(value) ? 'true' : ''
        ),
        toLdap: (s: string): ldap_modify => (
            { action: s ? 'add' : 'delete', value }
        ),
    };
}

export function match(predicate: (s: string) => boolean): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): string => (
            l.find(predicate)
        ),
        toLdap: (s: string): string => (
            s
        ),
    };
}

export function dn(attrName: string, base: string): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): string => {
          let base_ = _.escapeRegExp(base);
          let reg = new RegExp(`^${attrName}=(.*),${base_}$`);
          for (const s of l) {
            let m = s.match(reg);
            if (m) return m[1];
          }
          return undefined;
        },
        toLdap: (s: string): string => (
            s ? attrName + "=" + s + "," + base : ''
        )
    }
}

export function dns(attrName: string, base: string): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): string[] => {
          let r = []
          let base_ = _.escapeRegExp(base);
          let reg = new RegExp(`^${attrName}=(.*),${base_}$`);
          for (const s of l) {
            let m = s.match(reg);
            if (m) r.push(m[1]);
          }
          return r;
        },
        toLdap: (_s: string): string => {
            throw "NOT IMPLEMENTED";
        },
    }
}

export const base64: ldap_conversion = {
        fromLdapB: (s: Buffer): string => (
            s && s.toString('base64')
        ),
        toLdapJson: (s: string): string => {
            return s;
        },
        toEsupActivBoResponse: (s: string): string => (
            s
        ),
        toEsupActivBo: (s: string): string => (
            s ? "encodeBase64" + s : ''
        ),
        toLdap: (_s: string): string => {
            console.trace("base64.toLdap not handled correctly by ldapjs");
            throw "base64.toLdap not handled correctly by ldapjs";
        }
}

export const up1Profile: ldap_conversion = {
    fromLdapMulti: (l: string[]): {}[] => (
        l.map(parse_up1Profile_one)
    ),
    toLdap: (_s: string): string => {
        throw "NOT IMPLEMENTED";
    },
    applyAttrsRemapAndType: true,
}

export function up1Profile_field(field: string): ldap_conversion {
    return {
        fromLdapMulti: (l: string[]): {}[] => (
            l.map(parse_up1Profile_one).map(p => p[field] && p[field][0])
        ),
        toLdap: (_s: string): string => {
            throw "NOT IMPLEMENTED";
        },
    };
}

const unescape_sharpFF = (attr_value: string) => (
    attr_value.replace(/#([0-9A-F]{2})/ig, (_, xx) => String.fromCharCode(parseInt(xx, 16)))
);

const parse_up1Profile_one = (str: string) => {
    let r: Dictionary<string> = {};
    str.replace(/\[([^\[\]=]+)=((?:[^\[\]]|\[[^\[\]]*\])*)\]/g, (_m, key, val) => {
        r[unescape_sharpFF(key)] = val.split(';').map(unescape_sharpFF);
        return '';
    });
    return r;
};

export const parse_composite = (str: string) => {
    let r: Dictionary<string> = {};
    str.replace(/\[(.*?)\]/g, (_m, e) => {
      const m = e.match(/(.*?)=(.*)/)
      r[m[1]] = m[2];
      return '';
    });
    return r;
};

export const parse_composites = (strs: string[]) => (
    strs.map(parse_composite)
);
