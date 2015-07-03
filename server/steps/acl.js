'use strict';

var conf = require('../conf');
var ldap = require('../ldap');
var filters = ldap.filters;

// "includes" is optional, it will be computed from "list"
function create(peopleFilter) {
    return function (_v, attr) {
	return ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr);
    };
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
