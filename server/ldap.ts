'use strict';

import _ = require('lodash');
import ldapjs = require('ldapjs');
import conf = require('./conf');

const remove_accents = _.deburr;

const client = ldapjs.createClient({ url: conf.ldap.uri });

client.bind(conf.ldap.dn, conf.ldap.password, err => {
    if (err) console.log("err: " + err);
});

export const search = (base, filter, options) : Promise<any> => {
    let params = _.assign({ filter: filter, scope: "sub" }, options);
    return new Promise((resolve, reject) => {
        let l = [];
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
};

export const searchFilters = (base, filters, options) => ( 
    Promise.all(filters.map(filter => (
        search(base, filter, options)
    ))).then(_.flatten).then(l => _.uniq(l, 'dn'))
);

function doAttrsMap(attrsMap) {
    return e => (
        _.mapValues(attrsMap, attr => {
            // we want only one value...
            return e[attr] && (_.isArray(e[attr]) ? e[attr][0] : e[attr]);
        })
    );
}

export const searchMap = (base, filter, attrsMap, options) => {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return search(base, filter, options).then(l => (
        l.map(doAttrsMap(attrsMap))
    ));
};

export const searchManyMap = (base, filters, attrsMap, options) => {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return searchFilters(base, filters, options).then(l => (
        l.map(doAttrsMap(attrsMap))
    ));
};

export const searchOne = (base, filter, options) => {
    options = _.assign({ sizeLimit: 1 }, options); // no use getting more than one answer
    return search(base, filter, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const read = (dn, options) => {
    options = _.assign({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return search(dn, null, options).then(l => (
        l.length ? l[0] : null
    ));
};

export const readMap = (base, attrsMap, options) => {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return read(base, options).then(doAttrsMap(attrsMap));
};

export const searchThisAttr = (base, filter, attr: string, options = {}) => {
    options = _.assign({ attributes: [attr] }, options);
    return search(base, filter, options).then(l => (
        _.map(l, e => e[attr])
    ));
};

export const searchOneThisAttr = (base, filter, attr, options) => {
    options = _.assign({ attributes: [attr] }, options);
    return searchOne(base, filter, options).then(e => (
        e && e[attr]
    ));
};

/*
export const groupMembers = (cn) => (
    searchOneThisAttr(conf.ldap.base_groups, "(cn=" + cn + ")", 'member').then(l => (
        l && l.map(conf.ldap.group_member_to_eppn)
    ))
);
*/

export const filters = {
    eq: (attr, val) => "(" + attr + "=" + val + ")",
    startsWith: (attr, val) => "(" + attr + "=" + val + "*)",
    contains: (attr, val, prefix) => "(" + attr + "=" + (prefix || '') + "*" + val + "*)",
    and: filters => filters.length === 1 ? filters : "(&" + filters.join('') + ")",
    or: filters => filters.length === 1 ? filters : "(|" + filters.join('') + ")",
    memberOf: cn => filters.eq("memberOf", conf.ldap.group_cn_to_memberOf(cn)),

  // search for non ordered "token" words
  fuzzy_prefixedAttrs: (searchedAttrs, token) => {
    let tokens = _.compact(token.split(/[\s,]+/));
    let l = tokens.map(tok => (
        filters.or(_.map(searchedAttrs, (prefix, attr) => (
            filters.contains(attr, tok, prefix)
        )))
    ));
    return filters.and(l);
  },

// search for non ordered "token" words
  fuzzy: (attrs, token) => {
    let searchedAttrs = {};
    attrs.forEach(attr => { searchedAttrs[attr] = null; });
    return filters.fuzzy_prefixedAttrs(searchedAttrs, token);
  },

// exact match expect non-letters are replaced by wildcard
// eg: M'Foo - Bar     =>    M*Foo*Bar
  alike_same_accents: (attr, str) => {
    let pattern = str.replace(/[^a-z\u00C0-\u00FC]+/gi, '*');
    return filters.eq(attr, pattern);
  },

  alike_no_accents: (attr, str) => (
    filters.alike_same_accents(attr, remove_accents(str))
  ),

  alike_many_same_accents: (attr, strs) => (
    filters.or(strs.map(str => (
        filters.alike_same_accents(attr, str)
    )))
  ),

  alike_many: (attr, strs) => {
    let strs_ = _.uniq(_.flatten(strs.map(str => (
        [ str, remove_accents(str) ]
    ))));
    return filters.alike_many_same_accents(attr, strs_);
  },

  alike: (attr, str) => (
    filters.alike_many(attr, [str])
  ),
};

export const convert = {
    from: {
        datetime: dt => {
            if (!dt) return dt;
            let m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
            return m && new Date(Date.UTC(m[1], parseInt(m[2]) - 1, m[3], m[4], m[5], m[6]));
        },
        postalAddress: s => (
            s && s.replace(/\$/g, "\n")
        ),
    },
};
