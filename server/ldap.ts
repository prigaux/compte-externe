'use strict';

import * as _ from 'lodash';
import * as ldapjs from 'ldapjs';
import * as conf from './conf';

const remove_accents = _.deburr;

let _clientP : Promise<ldapjs.Client>;
function clientP() {
    if (!_clientP) _clientP = new_clientP();
    return _clientP;
}

function new_clientP() : Promise<ldapjs.Client> {
    console.info("connecting to " + conf.ldap.uri);
    const c = ldapjs.createClient({ url: conf.ldap.uri, reconnect: true, idleTimeout: conf.ldap.disconnectWhenIdle_duration });
    c.on('connectError', console.error);
    c.on('error', console.error);
    c.on('idle', () => {
        //console.log("destroying ldap connection");
        c.destroy();
        _clientP = undefined;
    });

    return new Promise((resolve, reject) => {
        c.on('connect', () => {
            console.log("connected to ldap server");
            c.bind(conf.ldap.dn, conf.ldap.password, err => {
                if (err) console.error(err);
                err ? reject(err) : resolve(c);
            });
        });
    });
}

export type filter = string
export type Options = ldapjs.SearchOptions
export type LdapAttrValue = string | number | Date | string[] | number[];
export type LdapEntry = Dictionary<LdapAttrValue>;

type AttrConvert = { convert?: ldap_conversion, ldapAttr?: string }
export type AttrsConvert = Dictionary<AttrConvert>

type RawValue = ldap_RawValue;
type RawValueB = Buffer | Buffer[]

export function searchRaw(base: string, filter: filter, attributes: string[], options: Options): Promise<Dictionary<RawValueB>[]> {
    if (attributes.length === 0) {
        // workaround asking nothing and getting everything. Bug in ldapjs???
        attributes = ['objectClass'];
    }
    let params = merge({ filter, attributes, scope: "sub" }, options);
    let p = new Promise((resolve, reject) => {
        let l: LdapEntry[] = [];
        clientP().then(c => c.search(base, params, (err, res) => {
            if (err) return reject(err);

            res.on('searchEntry', entry => {
                l.push(entry.raw);
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
        }));
    });
    return <Promise<Dictionary<RawValueB>[]>> p;
}

function singleValue(attr: string, v: RawValueB) {
  if (_.isArray(v)) {
    if (v.length > 1) console.warn(`attr ${attr} is multi-valued`);
    return v[0];
   } else {
    return v;
  }
}

const arrayB_to_stringB = (v: RawValueB) => (
    (_.isArray(v) ? v : [v]).map(e => e && e.toString())
);

// ldapjs return either a value if there is only one attribute value,
// or an array of values if multiple value
// this is problematic since depending on the values in LDAP, the type can change.
// ensure we always have arrays
// https://github.com/mcavage/node-ldapjs/issues/233
function handleAttrType(attr: string, attrType: LdapAttrValue, conversion: ldap_conversion, v: RawValueB): LdapAttrValue {
    if (conversion && conversion.fromLdapMultiB) {
        return conversion.fromLdapMultiB(_.isArray(v) ? v : [v]);
    } else if (conversion && conversion.fromLdapMulti) {
        return conversion.fromLdapMulti(arrayB_to_stringB(v));
    } else if (_.isArray(attrType)) {
        let l = arrayB_to_stringB(v);
        if (_.isNumber(attrType[0])) {
            return l.map(s => parseInt(s));
        } else {
            return l;
        }
    } else {
        let s = singleValue(attr, v);
        return convertAttrFromLdap(attr, attrType, conversion, s);
    }
}

function convertAttrFromLdap(attr: string, attrType: LdapAttrValue, conversion: ldap_conversion, s: Buffer) {
        if (conversion && conversion.fromLdapB) {
            return conversion.fromLdapB(s);
        } else if (conversion && conversion.fromLdap) {
            return conversion.fromLdap(s && s.toString());
        } else if (_.isString(attrType)) {
            return s && s.toString();
        } else if (_.isNumber(attrType)) {
            return s && parseInt(s.toString());
        } else if (attr === 'dn' || attr === 'objectClass') {
            return s && s.toString();
        } else {
            throw `unknown type for attribute ${attr}`;
        }
}

function convertAttrToLdap(attr: string, attrType: LdapAttrValue, conversion: ldap_conversion, v, opts: { toJson?: boolean }): RawValue {
        if (conversion) {
            return opts.toJson && conversion.toLdapJson ? conversion.toLdapJson(v) : conversion.toLdap(v);
        } else if (_.isArray(attrType)) {
            return v; // we know it's an array, that's a valid RawValue
        } else if (_.isString(attrType)) {
            return v;
        } else if (_.isNumber(attrType)) {
            return v.toString();
        } else if (attr === 'dn' || attr === 'objectClass') {
            return v.toString();
        } else if (['noInteraction', 'various', 'duration_or_enddate', 'charter'].includes(attr)) {
            return '';
        } else {
            console.error(`unknown type for attribute ${attr}`);
            return v;
        }
}

export function convertToLdap<T extends {}>(attrTypes: T, attrsConvert: AttrsConvert, v: T, opts : { toJson?: boolean }): Dictionary<RawValue> {
    let r = {};
    _.forEach(v, (val, attr) => {
        let conv = attrsConvert[attr] || {};
        let attr_ = conv.ldapAttr || defaultLdapAttr(attr);
        // transform to string|string[]
        let val_ = convertAttrToLdap(attr, attrTypes[attr], conv.convert, val, opts);
        if (val_ === '') return; // ignore empty string which can not be a valid LDAP string value
        if (attr_ in r) {
            // more than one value, transform into an array
            if (!_.isArray(r[attr_])) r[attr_] = [ r[attr_] ];
            r[attr_].push(...(val_ instanceof Array ? val_ : [val_]));
        } else {
            r[attr_] = val_;
        }
    });
    return r;
}

function merge(a: Options, b: Options): Options {
  return <Options> _.assign(a, b);
}

export function remove_dn<T extends {}>(v: T): T {
    delete v['dn'];
    return v;
}
export function remove_dns<T extends {}>(l: T[]): T[] {
  l.forEach(remove_dn);
  return l;
}

// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
export function searchSimple<T extends {}>(base: string, filter: filter, attrTypes: T): Promise<T[]> {
  return search(base, filter, attrTypes, null, {});
}

const defaultLdapAttr = attr => attr.replace(/^global_/, '');

// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
export function search<T extends {}>(base: string, filter: filter, attrTypes: T, attrsConvert: AttrsConvert, options: Options): Promise<T[]> {
    let wantedConvert = _.mapValues(attrTypes, (_type, attr) => attrsConvert && attrsConvert[attr] || {});
    let attrRemap = _.mapValues(wantedConvert, (c, attr) => c.ldapAttr || defaultLdapAttr(attr));
    let attrRemapRev = _.invertBy(attrRemap);
    let attributes = _.keys(attrRemapRev);
    let p = searchRaw(base, filter, attributes, options).then(l => 
          l.map(o => {
              delete o['controls'];
              let r = {};
              _.forEach(o, (val, attr) => {
                let attrs = attrRemapRev[attr] || [attr];
                for (let attr_ of attrs) {
                    // then transform string|string[] into the types wanted
                    let val_ = handleAttrType(attr_, attrTypes[attr_], wantedConvert[attr_] &&  wantedConvert[attr_].convert, val);
                    r[attr_] = val_;
                }
              });              
              return r;
          })
    );
    return <Promise<T[]>> <any> p;
}

export const searchMany = <T extends {}> (base: string, filters: filter[], idAttr: string, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}): Promise<T[]> => (
    Promise.all(filters.map(filter => (
        search(base, filter, attrTypes, attrsConvert, options)
    ))).then(_.flatten).then(l => _.uniqBy(l, idAttr))
);

export const searchOne = <T extends LdapEntry> (base: string, filter: filter, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}) => {
    options = merge({ sizeLimit: 1 }, options); // no use getting more than one answer
    return search(base, filter, attrTypes, attrsConvert, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const read = <T extends LdapEntry> (dn: string, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}) => {
    options = merge({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return search(dn, null, attrTypes, attrsConvert, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const searchThisAttr = <T extends LdapAttrValue>(base: string, filter: filter, attr: string, attrType: T, options: Options = {}): Promise<T[]> => {
    return search(base, filter, { val: attrType }, { val: { ldapAttr: attr } }, options).then(l => (
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
