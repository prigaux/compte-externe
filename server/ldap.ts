'use strict';

import _ = require('lodash');
import ldapjs = require('ldapjs');
import conf = require('./conf');

const remove_accents = _.deburr;

const client = ldapjs.createClient({ url: conf.ldap.uri });

client.bind(conf.ldap.dn, conf.ldap.password, err => {
    if (err) console.log("err: " + err);
});

type AttrsMap = {} // it should be StringMap, but it causes too much headaches, 
                   //  cf http://stackoverflow.com/questions/22077023/why-cant-i-indirectly-return-an-object-literal-to-satisfy-an-index-signature-re
export type filter = string                   

export const search = (base: string, filter: filter, options: ldapjs.Options) : Promise<LdapRawEntry[]> => {
    let params = merge({ filter: filter, scope: "sub" }, options);
    let p = new Promise((resolve, reject) => {
        let l: LdapRawEntry[] = [];
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
    return <Promise<LdapRawEntry[]>> p;
};

export const searchFilters = (base: string, filters: filter[], options: ldapjs.Options) => ( 
    Promise.all(filters.map(filter => (
        search(base, filter, options)
    ))).then(_.flatten).then(l => _.uniq(l, 'dn'))
);

function doAttrsMap(attrsMap: AttrsMap): (ldapRawEntry) => StringMap {
    return e => (
        <StringMap> _.mapValues(attrsMap, attr => {
            // we want only one value...
            return e[attr] && (_.isArray(e[attr]) ? e[attr][0] : e[attr]);
        })
    );
}

function merge(a: ldapjs.Options, b: ldapjs.Options): ldapjs.Options {
  return <ldapjs.Options> _.assign(a, b);
}
function attrs(attrsMap: AttrsMap): string[] {
  return <string[]> _.values(attrsMap);
}

export const searchMap = (base: string, filter: filter, attrsMap: AttrsMap, options: ldapjs.Options): Promise<StringMap[]> => {
    options = merge({ attributes: attrs(attrsMap) }, options);
    return search(base, filter, options).then(l => (
        l.map(doAttrsMap(attrsMap))
    ));
};

export const searchManyMap = (base: string, filters: filter[], attrsMap: AttrsMap, options: ldapjs.Options) => {
    options = merge({ attributes: attrs(attrsMap) }, options);
    return searchFilters(base, filters, options).then(l => (
        l.map(doAttrsMap(attrsMap))
    ));
};

export const searchOne = (base: string, filter: filter, options: ldapjs.Options) => {
    options = merge({ sizeLimit: 1 }, options); // no use getting more than one answer
    return search(base, filter, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const read = (dn: string, options: ldapjs.Options) => {
    options = merge({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return search(dn, null, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const readMap = (base: string, attrsMap: AttrsMap, options: ldapjs.Options) => {
    options = merge({ attributes: attrs(attrsMap) }, options);
    return read(base, options).then(doAttrsMap(attrsMap));
};

export const searchThisAttr = (base: string, filter: filter, attr: string, options: ldapjs.Options = {}): Promise<string[]> => {
    options = merge({ attributes: [attr] }, options);
    return search(base, filter, options).then(l => (
        _.map(l, e => e[attr])
    ));
};

export const searchOneThisAttr = (base: string, filter: string, attr: string, options: ldapjs.Options) => {
    options = merge({ attributes: [attr] }, options);
    return searchOne(base, filter, options).then(e => (
        e && e[attr]
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
    and: (filters: filter[]) => filters.length === 1 ? filters : "(&" + filters.join('') + ")",
    or: (filters: filter[]) => filters.length === 1 ? filters : "(|" + filters.join('') + ")",
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

export const convert = {
    from: {
        datetime: (dt: string): Date => {
            if (!dt) return null;
            let m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
            return m && new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6])));
        },
        postalAddress: (s: string): string => (
            s && s.replace(/\$/g, "\n")
        ),
    },
};
