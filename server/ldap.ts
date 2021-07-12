'use strict';

import * as _ from 'lodash';
import * as helpers from './helpers'
import * as ldapjs from 'ldapjs';
import * as ldapP from 'ldapjs-promise-disconnectwhenidle';
import * as conf from './conf';

const remove_accents = _.deburr;

// @ts-expect-error
import { escape } from 'ldapjs/lib/filters/escape';

ldapP.init(conf.ldap);

export function force_new_clientP() {
    ldapP.init(conf.ldap);
    return ldapP.force_new_clientP();
}
export function close_client() {
    return ldapP.destroy();
}

export type filter = string
export type Options = ldapjs.SearchOptions
export type LdapAttrValue = string | number | Date | string[] | number[] | LdapEntry[];
export type LdapEntry = { [index: string]: LdapAttrValue };

type AttrConvert = { convert?: ldap_conversion, convert2?: ldap_conversion, ldapAttr?: string, ldapAttrJson?: string; fallbackLdapAttrs?: string[] }
export type AttrsConvert = Dictionary<AttrConvert>

type RawValue = ldap_RawValue;
type RawValueB = Buffer | Buffer[]

export function searchRaw(base: string, filter: filter, attributes: string[], options: Options) {
    if (!filter) {
        console.error("internal error: missing ldap filter");
    }
    let p = ldapP.searchRaw(base, filter, attributes, options).then(l => l.map(e => e.raw))
    return p;
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

export function handleAttrsRemapAndType<T extends Dictionary<any>>(o : Dictionary<RawValueB>, attrRemapRev: Dictionary<string[]>, attrTypes : T, wantedConvert: AttrsConvert) {
    let r: Dictionary<any> = {};
    // NB : we must use attrRemapRev order to properly handle fallbackLdapAttrs
    _.forEach({ ...attrRemapRev, ...attrTypes }, (_: any, attr) => {
        if (!(attr in o)) {
            return;
        }
        const val = o[attr]
        let attrs = attrRemapRev[attr] || [attr];
        for (let attr_ of attrs) {
            // then transform string|string[] into the types wanted
            const convert = wantedConvert[attr_] && wantedConvert[attr_].convert;
            const convert2 = wantedConvert[attr_] && wantedConvert[attr_].convert2;
            let val_ = handleAttrType(attr_, attrTypes[attr_], convert, val);
            if (!val_ && convert2) {
                // retry with convert2
                val_ = handleAttrType(attr_, attrTypes[attr_], convert2, val);
            }
            if (convert && convert.applyAttrsRemapAndType) {
                val_ = (val_ as any[]).map(v => handleAttrsRemapAndType(v, attrRemapRev, attrTypes, wantedConvert));
            }
            if (!r[attr_]) r[attr_] = val_;
        }
    });              
    return r as T;
}

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

export const convert_toLdap_string = (attrConvert: AttrConvert, val: unknown) => {
    const modify = to_ldap_modify(attrConvert.convert.toLdap(val))
    const val_ = modify.action === 'add' ? modify.value : _.isFunction(modify.action) ? modify.action([]) : undefined
    if (_.isArray(val_)) {
        if (val_.length > 1) throw "ldap_modify_to_string expected a simple value"
        return val_[0]
    } else {
        return val_
    }
}

export const convertAttrToLdapFilter = (attr: string, attrConvert: AttrConvert, val: unknown) => (
    filters.eq(toLdapAttr(attrConvert, attr), convert_toLdap_string(attrConvert, val))
)

function convertAttrToLdap(attr: string, attrType: LdapAttrValue, conversion: ldap_conversion, v: any, opts: { toJson?: boolean, toEsupActivBo?: boolean, toEsupActivBoResponse?: boolean }): ldap_modify {
        if (conversion) {
            const v_ = opts.toJson && conversion.toLdapJson ? conversion.toLdapJson(v) : 
                   opts.toEsupActivBoResponse && conversion.toEsupActivBoResponse ? conversion.toEsupActivBoResponse(v) : 
                   opts.toEsupActivBoResponse && conversion.toEsupActivBo ? conversion.toEsupActivBo(v) : 
                   opts.toEsupActivBo && conversion.toEsupActivBo ? conversion.toEsupActivBo(v) : 
                   conversion.toLdap(v);
            return to_ldap_modify(v_);
        } else if (_.isArray(attrType)) {
            return to_ldap_add(v); // we know it's an array, that's a valid RawValue
        } else if (_.isString(attrType)) {
            return to_ldap_add(v);
        } else if (_.isNumber(attrType)) {
            return to_ldap_add(v.toString());
        } else if (attr === 'dn' || attr === 'objectClass') {
            return to_ldap_add(v.toString());
        } else {
            if (!attr.match(/^(noInteraction|various|comment|mailFrom_email|mailFrom_text|duration_or_enddate|etablissement.*|charter|profilename_to_modify)$/)) {
                console.error(`not converting attribute ${attr} to LDAP`);
            }
            return { action: 'ignore' };
        }
}

const to_ldap_add = (val : RawValue): ldap_modify => (
    { action: 'add', value: val }
)

const to_ldap_modify = (val : RawValue | ldap_modify): ldap_modify => (
    _.isArray(val) || _.isString(val) ? to_ldap_add(val) : val
)

const to_array = (val: RawValue) => val instanceof Array ? val : [val];

export function convertToLdap<T extends Dictionary<any>>(attrTypes: T, attrsConvert: AttrsConvert, v: Partial<T>, opts : { toJson?: boolean, toEsupActivBo?: boolean, toEsupActivBoResponse?: boolean }) {
    let r: Dictionary<RawValue> = {};
    _.forEach(v, (val, attr) => {
        let conv = attrsConvert[attr as string] || {};
        let attr_ = opts.toJson && conv.ldapAttrJson || toLdapAttr(conv, attr);
        let modify = convertAttrToLdap(attr, attrTypes[attr], conv.convert, val, opts);
        if (!modify) {
            // TODO: see how to handle this
            console.error("no convertToLdap for attr " + attr + " with value " + val);
        } else if (modify.action === 'ignore') {
        } else if (modify.action === 'add') {
            let val_ = modify.value;
            if (val_ === '' && opts.toJson) {
                val_ = null; // in crejsonldap, null means remove the value
            }
            if (attr_ in r) {
                r[attr_] = _.uniq(to_array(r[attr_]).concat(to_array(val_)))
            } else {
                r[attr_] = val_;
            }
        } else if (modify.action === 'delete') {
            if (attr_ in r) {
                r[attr_] = _.difference(r[attr_], to_array(modify.value));
            }
        } else if (_.isFunction(modify.action)) {
            r[attr_] = modify.action(to_array(r[attr_] || []))
        } else {
            console.error("unknown ldap modify action", modify.action)
        }
    });
    return r;
}

function merge(a: Options, b: Options): Options {
  return <Options> _.assign(a, b);
}

// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
export function searchSimple<T extends {}>(base: string, filter: filter, attrTypes: T): Promise<T[]> {
  return search(base, filter, attrTypes, null, {});
}

const defaultLdapAttr = (attr: string) => attr.replace(/^global_/, '');

export const toLdapAttr = (conv: { ldapAttr?: string }, attr: string) => (conv || {}).ldapAttr || defaultLdapAttr(attr);
const toLdapAttrs = (conv: AttrConvert, attr: string) => (
    [ toLdapAttr(conv, attr), ...conv.fallbackLdapAttrs || [] ]
)

export function convert_and_remap<T extends {}>(attrTypes: T, attrsConvert: AttrsConvert) {
    let wantedConvert = _.mapValues(attrTypes, (_type, attr) => attrsConvert && attrsConvert[attr] || {});
    let attrRemap = _.mapValues(wantedConvert, toLdapAttrs);
    let attrRemapRev = helpers.invertByManyValues(attrRemap);
    return { wantedConvert, attrRemapRev };
}

// NB: it should be <T extends LdapEntry> but it is not well handled by typescript
export function search<T extends {}>(base: string, filter: filter, attrTypes: T, attrsConvert: AttrsConvert, options: Options): Promise<T[]> {
    let { wantedConvert, attrRemapRev } = convert_and_remap(attrTypes, attrsConvert);
    let attributes = _.keys(attrRemapRev);
    let p = searchRaw(base, filter, attributes, options).then(l => 
          l.map(o => {
              delete o['controls'];
              return handleAttrsRemapAndType(o, attrRemapRev, attrTypes, wantedConvert);
          })
    );
    return p;
}

export const searchMany = <T extends {}> (base: string, filters: filter[], idAttr: string, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}): Promise<T[]> => (
    Promise.all(filters.map(filter => (
        search(base, filter, attrTypes, attrsConvert, options)
    ))).then(ll => _.flatten(ll)).then(l => _.uniqBy(l, idAttr))
);

export const searchOne = <T extends LdapEntry> (base: string, filter: filter, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}) => {
    options = merge({ sizeLimit: 1 }, options); // no use getting more than one answer
    return search(base, filter, attrTypes, attrsConvert, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const exist = (base: string, filter: filter, options: Options = {}) => (
    searchRaw(base, filter, [], { sizeLimit: 1, ...options }).then(l => l.length > 0)
)

export const read = <T extends LdapEntry> (dn: string, attrTypes: T, attrsConvert: AttrsConvert, options: Options = {}) => {
    options = merge({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return search(dn, null, attrTypes, attrsConvert, options).then(l => (
        l.length ? l[0] : null
    ));
};

// search LDAP using "filter" but return only one attribute for each LDAP entries
export const searchThisAttr = <T extends LdapAttrValue>(base: string, filter: filter, attr: string, attrType: T, options: Options = {}): Promise<T[]> => {
    return search(base, filter, { val: attrType }, { val: { ldapAttr: attr } }, options).then(l => (
        _.map(l, e => e.val)
    ));
};

// search LDAP using "filter" but return only one attribute for each LDAP entries
export const searchOneThisAttr = <T extends LdapAttrValue>(base: string, filter: filter, attr: string, attrType: T, options: Options = {}): Promise<T> => {
    options = merge({ sizeLimit: 1 }, options); // no use getting more than one answer
    return searchThisAttr(base, filter,attr, attrType, options).then(l => (
        l.length ? l[0] : null
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
    eq: (attr: string, val: string) => "(" + escape(attr) + "=" + escape(val) + ")",
    startsWith: (attr: string, val: string) => "(" + escape(attr) + "=" + escape(val) + "*)",
    contains: (attr: string, val: string, prefix: string) => "(" + escape(attr) + "=" + escape(prefix || '') + "*" + escape(val) + "*)",
    and: (filters: filter[]) => {
        // simplify empty AND/OR which are not handled by ldapjs.parseFilter
        const l = filters.filter(e => e !== '(&)')
        return l.length === 1 ? l[0] : l.includes('(|)') ? '(|)' : "(&" + l.join('') + ")"
    },
    or: (filters: filter[]) => {
        // simplify empty AND/OR which are not handled by ldapjs.parseFilter
        const l = filters.filter(e => e !== '(|)')
        return l.length === 1 ? l[0] : l.includes('(&)') ? '(&)' : "(|" + l.join('') + ")"
    },
    memberOf: (cn: string) => filters.eq("memberOf", conf.ldap.group_cn_to_memberOf(cn)),

    startsOrEndsWith: (attr: string, val: string, prefix: string) => (
        filters.or([ 
            "(" + escape(attr) + "=" + escape(prefix || '') + escape(val) + "*)",
            "(" + escape(attr) + "=" + escape(prefix || '') + "*" + escape(val) + ")",
        ])
    ),
    fuzzy_one: (attr: string, tok: string, prefix: string) => (
        tok.length < conf.ldap.index_substr_if_minlen ? 
        filters.eq(attr, (prefix || '') + tok) : 
      tok.length < conf.ldap.index_substr_any_len ? 
        filters.startsOrEndsWith(attr, tok, prefix) :
        filters.contains(attr, tok, prefix)
    ),

  // search for non ordered "token" words
  fuzzy_prefixedAttrs: (searchedAttrs: Dictionary<string>, token: string): filter => {
    let tokens = _.compact(token.split(/[\s,]+/));
    let to_filter = filters.contains;
    if (_.max(tokens.map(tok => tok.length)) < conf.ldap.index_substr_any_len) {
        tokens = [token];
        to_filter = filters.fuzzy_one;
    }
    let l = tokens.map(tok => (
        filters.or(_.map(searchedAttrs, (prefix, attr) => (
            filters.or(_.uniq([ tok, remove_accents(tok) ]).map(tok => (
                to_filter(attr, tok, prefix)
            )))
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

// exact match except non-letters are replaced by wildcard
// eg: M'Foo - Bar     =>    M*Foo*Bar
  alike_same_accents: (attr: string, str: string): filter => {
    let pattern = str.replace(/[^a-z\u00C0-\u00FC]+/gi, '*');
    return "(" + escape(attr) + "=" + pattern + ")";
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
