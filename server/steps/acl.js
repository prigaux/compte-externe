'use strict';

var _ = require('lodash');
var conf = require('../conf');
var ldap = require('../ldap');
var filters = ldap.filters;

// "includes" is optional, it will be computed from "list"
function create(peopleFilter) {
    var list = function (attr) {
	return ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr);
    };
    var includes = function (user_id) {
	var filter = filters.and([peopleFilter, filters.eq("eduPersonPrincipalName", user_id)]);
	return ldap.searchOne(conf.ldap.base_people, filter, "eduPersonPrincipalName").then(function (v) {
	    return !!v;
	});
    };
    return { list: list, includes: includes };
}

var acl = {};

acl.ldapGroup = function (cn) {
    return create(filters.memberOf(cn));
};

acl.user_id = function (user_id) {
    var attr = user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return create(filters.eq(attr, user_id));
};

module.exports = acl;
