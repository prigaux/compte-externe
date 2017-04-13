'use strict';

import _ = require('lodash');
import ldapjs = require('ldapjs');
import conf = require('./conf');

const remove_accents = _.deburr;

const client = ldapjs.createClient({ url: conf.ldap.uri, reconnect: true });

client.bind(conf.ldap.dn, conf.ldap.password, err => {
    if (err) console.log("err: " + err);
});

export type filter = string
export type Options = ldapjs.Options
export type LdapAttrValue = string | number | Date | string[];
export type LdapEntry = Dictionary<LdapAttrValue>;

     // it should be Dictionary<string>, but it causes too much headaches,
     //  cf http://stackoverflow.com/questions/22077023/why-cant-i-indirectly-return-an-object-literal-to-satisfy-an-index-signature-re
type AttrRemap = { rename: {}, convert: {} } 

export type RawValue = string | string[];

export function searchRaw(base: string, filter: filter, attributes: string[], options: Options): Promise<Dictionary<RawValue>[]> {
    if (attributes.length === 0) {
        // workaround asking nothing and getting everything. Bug in ldapjs???
        attributes = ['objectClass'];
    }
    let params = merge({ filter, attributes, scope: "sub" }, options);
    let p = new Promise((resolve, reject) => {
        let l: LdapEntry[] = [];
        client.search(base, params, (err, res) => {
            if (err) reject(err);

            res.on('searchEntry', entry => {
                l.push(entry.object);
            });
            res.on('searchReference', referral => {
                console.log('referral: ' + referral.uris.join());
            });
            res.on('error', err => {
                if ((err || {}).name === 'SizeLimitExceededError') {
                    // that's ok, return what we got:
                    resolve(l);
                } else {
                    console.log("ldap error:" + err);
                    reject(err);
                }
            });
            res.on('end', result => {
                if (result.status === 0)
                    resolve(l);
                else
                    reject("unknown error");
            });
        });
    });
    return <Promise<Dictionary<RawValue>[]>> p;
}


export const convert = {
    datetime: {
        fromLdap: (dt: string): Date => {
            if (!dt) return null;
            let m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
            return m && new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6])));
        },
        toLdap: (d: Date): string => (
            d.toISOString().replace(/\.\d+/, '').replace(/[T:-]/g, '')
        ),
    },
    postalAddress: {
        fromLdap: (s: string): string => (
            s && s.replace(/\$/g, "\n")
        ),
        toLdap: (s: string): string => (
            s && s.replace(/\n/g, "$")
        ),
    },
};

function singleValue(attr: string, v: RawValue) {
  if (_.isArray(v)) {
    if (v.length > 1) console.warn(`attr ${attr} is multi-valued`);
    return v[0];
   } else {
    return v;
  }
}

// ldapjs return either a value if there is only one attribute value,
// or an array of values if multiple value
// this is problematic since depending on the values in LDAP, the type can change.
// ensure we always have arrays
// https://github.com/mcavage/node-ldapjs/issues/233
function handleAttrType(attr: string, attrType: LdapAttrValue, conversion: string, v: RawValue): LdapAttrValue {
    if (_.isArray(attrType)) {
        return _.isArray(v) ? v : [v];
    } else {
        let s = singleValue(attr, v);
        return convertAttrFromLdap(attr, attrType, conversion, s);
    }
}

function convertAttrFromLdap(attr: string, attrType: LdapAttrValue, conversion: string, s: string) {
        if (conversion) {
            return convert[conversion].fromLdap(s);
        } else if (_.isString(attrType)) {
            return s;
        } else if (_.isNumber(attrType)) {
            return parseInt(s);
        } else if (attr === 'dn' || attr === 'objectClass') {
            return s;
        } else {
            throw `unknown type for attribute ${attr}`;
        }
}

function convertAttrToLdap(attr: string, attrType: LdapAttrValue, conversion: string, v): RawValue {
        if (conversion) {
            return convert[conversion].toLdap(v);
        } else if (_.isString(attrType)) {
            return v;
        } else if (_.isNumber(attrType)) {
            return v.toString();
        } else if (attr === 'dn' || attr === 'objectClass') {
            return v.toString();
        } else {
            console.error(`unknown type for attribute ${attr}`);
            return v;
        }
}

export function convertToLdap<T extends {}>(attrTypes: T, attrRemap: AttrRemap, v: T): Dictionary<RawValue> {
    let r = {};
    _.forEach(v, (val, attr) => {
        let attr_ = attrRemap.rename[attr] || attr;
        // transform to string|string[]
        let val_ = convertAttrToLdap(attr, attrTypes[attr], attrRemap.convert[attr_], val);
        r[attr_] = val_;
    });
    return r;
}

function merge(a: Options, b: Options): Options {
  return <Options> _.assign(a, b);
}

// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
// (NB: attrRemap should be Dictionary<string>, but it is not well handled by typescript)
export function searchSimple<T extends {}>(base: string, filter: filter, attrTypes: T): Promise<T[]> {
  return search(base, filter, attrTypes, null, {});
}


// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
// (NB: attrRemap should be Dictionary<string>, but it is not well handled by typescript)
export function search<T extends {}>(base: string, filter: filter, attrTypes: T, attrRemap: AttrRemap, options: Options): Promise<T[]> {
    if (!attrRemap) attrRemap = { rename: {}, convert: {} }
    let attrRemapRev = _.invert(attrRemap.rename);
    let attributes = _.keys(attrTypes).map(k => attrRemap.rename[k] || k);
    let p = searchRaw(base, filter, attributes, options).then(l => 
          l.map(o => {
              delete o['controls'];
              let r = {};
              _.forEach(o, (val, attr) => {
                let attr_ = attrRemapRev[attr] || attr;
                // then transform string|string[] into the types wanted
                let val_ = handleAttrType(attr_, attrTypes[attr_], attrRemap.convert[attr], val);
                r[attr_] = val_;
              });              
              return r;
          })
    );
    return <Promise<T[]>> <any> p;
}

const searchMany = <T extends {}> (base: string, filters: filter[], attrTypes: T, attrRemap: AttrRemap, options: Options = {}): Promise<T[]> => (
    Promise.all(filters.map(filter => (
        search(base, filter, attrTypes, attrRemap, options)
    ))).then(_.flatten).then(l => _.uniq(l, 'dn'))
);

export const searchManyMap = (base: string, filters: filter[], attrRemap: AttrRemap, options: Options = {}) => {
    let attrTypes = _.mapValues(attrRemap.rename, _ => '');
    return searchMany(base, filters, attrTypes, attrRemap, options);
};

export const searchOne = <T extends LdapEntry> (base: string, filter: filter, attrTypes: T, attrRemap: AttrRemap, options: Options = {}) => {
    options = merge({ sizeLimit: 1 }, options); // no use getting more than one answer
    return search(base, filter, attrTypes, attrRemap, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const read = <T extends LdapEntry> (dn: string, attrTypes: T, attrRemap: AttrRemap, options: Options = {}) => {
    options = merge({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return search(dn, null, attrTypes, attrRemap, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const searchThisAttr = <T extends LdapAttrValue>(base: string, filter: filter, attr: string, attrType: T, options: Options = {}): Promise<T[]> => {
    return search(base, filter, { val: attrType }, { rename: { val: attr }, convert: {} }, options).then(l => (
        _.map(l, e => e.val)
    ));
};

/*
export const groupMembers = (cn: string) => (
    searchOneThisAttr(conf.ldap.base_groups, "(cn=" + cn + ")", 'member').then(l => (
        l && l.map(conf.ldap.group_member_to_eppn)
    ))
);
*/

export const filters = {
    eq: (attr: string, val: string) => "(" + attr + "=" + val + ")",
    startsWith: (attr: string, val: string) => "(" + attr + "=" + val + "*)",
    contains: (attr: string, val: string, prefix: string) => "(" + attr + "=" + (prefix || '') + "*" + val + "*)",
    and: (filters: filter[]) => filters.length === 1 ? filters[0] : "(&" + filters.join('') + ")",
    or: (filters: filter[]) => filters.length === 1 ? filters[0] : "(|" + filters.join('') + ")",
    memberOf: (cn: string) => filters.eq("memberOf", conf.ldap.group_cn_to_memberOf(cn)),

  // search for non ordered "token" words
  fuzzy_prefixedAttrs: (searchedAttrs: Dictionary<string>, token: string): filter => {
    let tokens = _.compact(token.split(/[\s,]+/));
    let l = tokens.map(tok => (
        filters.or(_.map(searchedAttrs, (prefix, attr) => (
            filters.contains(attr, tok, prefix)
        )))
    ));
    return filters.and(l);
  },

// search for non ordered "token" words
  fuzzy: (attrs: string[], token: string): filter => {
    let searchedAttrs: Dictionary<string> = {};
    attrs.forEach(attr => { searchedAttrs[attr] = null; });
    return filters.fuzzy_prefixedAttrs(searchedAttrs, token);
  },

// exact match expect non-letters are replaced by wildcard
// eg: M'Foo - Bar     =>    M*Foo*Bar
  alike_same_accents: (attr: string, str: string): filter => {
    let pattern = str.replace(/[^a-z\u00C0-\u00FC]+/gi, '*');
    return filters.eq(attr, pattern);
  },

  alike_no_accents: (attr: string, str: string): filter => (
    filters.alike_same_accents(attr, remove_accents(str))
  ),

  alike_many_same_accents: (attr: string, strs: string[]): filter => (
    filters.or(strs.map(str => (
        filters.alike_same_accents(attr, str)
    )))
  ),

  alike_many: (attr: string, strs: string[]): filter => {
    let strs_ = _.uniq(_.flatten(strs.map(str => (
        [ str, remove_accents(str) ]
    ))));
    return filters.alike_many_same_accents(attr, strs_);
  },

  alike: (attr: string, str: string): filter => (
    filters.alike_many(attr, [str])
  ),
};
