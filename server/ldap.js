'use strict';

var _ = require('lodash');
var ldap = require('ldapjs');
var conf = require('./conf');

var remove_accents = _.deburr;

var client = ldap.createClient({ url: conf.ldap.uri });

client.bind(conf.ldap.dn, conf.ldap.password, function (err) {
    if (err) console.log("err: " + err);
});

var ldap = {};

ldap.search = function (base, filter, options) {
    var params = _.assign({ filter: filter, scope: "sub" }, options);
    return new Promise(function (resolve, reject) {
	var l = [];
	client.search(base, params, function(err, res) {
	    if (err) reject(err);

	    res.on('searchEntry', function(entry) {
		l.push(entry.object);
	    });
	    res.on('searchReference', function(referral) {
		console.log('referral: ' + referral.uris.join());
	    });
	    res.on('error', function(err) {
		if ((err || {}).name === 'SizeLimitExceededError') {
		    // that's ok, return what we got:
		    resolve(l);
		} else {
		    console.log("ldap error:" + err);
		    reject(err);
		}
	    });
	    res.on('end', function(result) {
		if (result.status === 0)
		    resolve(l);
		else
		    reject("unknown error");
	    });
	});
    });
};

ldap.searchFilters = function (base, filters, options) {
    return Promise.all(filters.map(function (filter) {
	return ldap.search(base, filter, options);
    })).then(_.flatten).then(function (l) {
	return _.uniq(l, 'dn');
    });
};

function doAttrsMap(attrsMap) {
    return function (e) {
	return _.mapValues(attrsMap, function (attr) {
	    // we want only one value...
	    return e[attr] && (_.isArray(e[attr]) ? e[attr][0] : e[attr]);
	});
    };
}

ldap.searchMap = function (base, filter, attrsMap, options) {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return ldap.search(base, filter, options).then(function (l) {
	return l.map(doAttrsMap(attrsMap));
    });
};

ldap.searchManyMap = function (base, filters, attrsMap, options) {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return ldap.searchFilters(base, filters, options).then(function (l) {
	return l.map(doAttrsMap(attrsMap));
    });
};

ldap.searchOne = function (base, filter, options) {
    options = _.assign({ sizeLimit: 1 }, options); // no use getting more than one answer
    return ldap.search(base, filter, options).then(function (l) {
	return l.length ? l[0] : null;
    });
};

ldap.read = function (dn, options) {
    options = _.assign({ sizeLimit: 1, scope: "base" }, options); // no use getting more than one answer
    return ldap.search(dn, null, options).then(function (l) {
	return l.length ? l[0] : null;
    });
};

ldap.readMap = function (base, attrsMap, options) {
    options = _.assign({ attributes: _.values(attrsMap) }, options);
    return ldap.read(base, options).then(doAttrsMap(attrsMap));
};

ldap.searchThisAttr = function (base, filter, attr, options) {
    options = _.assign({ attributes: [attr] }, options);
    return ldap.search(base, filter, options).then(function (l) {
	return _.map(l, function (e) { return e[attr]; });
    });
};

ldap.searchOneThisAttr = function (base, filter, attr, options) {
    options = _.assign({ attributes: [attr] }, options);
    return ldap.searchOne(base, filter, options).then(function (e) {
	return e && e[attr];
    });
};

/*
ldap.groupMembers = function (cn) {
    return ldap.searchOneThisAttr(conf.ldap.base_groups, "(cn=" + cn + ")", 'member').then(function (l) {
	return l && l.map(conf.ldap.group_member_to_eppn);
    });
};
*/

var filters = {
    eq: function (attr, val) { return "(" + attr + "=" + val + ")"; },
    startsWith: function (attr, val) { return "(" + attr + "=" + val + "*)"; },
    contains: function (attr, val, prefix) { return "(" + attr + "=" + (prefix || '') + "*" + val + "*)"; },
    and: function (filters) { return filters.length === 1 ? filters : "(&" + filters.join('') + ")"; },
    or: function (filters) { return filters.length === 1 ? filters : "(|" + filters.join('') + ")"; },
    memberOf: function (cn) { return filters.eq("memberOf", conf.ldap.group_cn_to_memberOf(cn)); },
};

// search for non ordered "token" words
filters.fuzzy_prefixedAttrs = function (searchedAttrs, token) {
    var tokens = _.compact(token.split(/[\s,]+/));
    var l = tokens.map(function (tok) {
	return filters.or(_.map(searchedAttrs, function (prefix, attr) {
	    return filters.contains(attr, tok, prefix);
	}));
    });
    return filters.and(l);
};

// search for non ordered "token" words
filters.fuzzy = function (attrs, token) {
    var searchedAttrs = {};
    attrs.forEach(function (attr) { searchedAttrs[attr] = null; });
    return filters.fuzzy_prefixedAttrs(searchedAttrs, token);
};

// exact match expect non-letters are replaced by wildcard
// eg: M'Foo - Bar     =>    M*Foo*Bar
filters.alike_same_accents = function (attr, str) {
    var pattern = str.replace(/[^a-z\u00C0-\u00FC]+/gi, '*');
    return filters.eq(attr, pattern);
};

filters.alike_no_accents = function (attr, str) {
    return filters.alike_same_accents(attr, remove_accents(str));
};

filters.alike_many_same_accents = function (attr, strs) {
    return filters.or(strs.map(function (str) {
	return filters.alike_same_accents(attr, str);
    }));
};

filters.alike_many = function (attr, strs) {
    var strs_ = _.uniq(_.flatten(strs.map(function (str) {
	return [ str, remove_accents(str) ];
    })));
    return filters.alike_many_same_accents(attr, strs_);
};

filters.alike = function (attr, str) {
    return filters.alike_many(attr, [str]);
};

ldap.filters = filters;

ldap.convert = {   
    from: {
	datetime: function (dt) {
	    if (!dt) return dt;
	    var m = dt.match(/^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
	    return m && new Date(Date.UTC(m[1], parseInt(m[2])-1, m[3], m[4], m[5], m[6]));
	},
	postalAddress: function (s) {
	    return s && s.replace(/\$/g, "\n");
	},
    },
};

module.exports = ldap;
