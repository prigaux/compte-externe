'use strict';

const conf = require('../conf');
const ldap = require('../ldap');
const filters = ldap.filters;

// "includes" is optional, it will be computed from "list"
function create(peopleFilter) {
    return (_v, attr) => (
	ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr)
    );
}

const acl = {};

acl.ldapGroup = cn => (
    create(filters.memberOf(cn))
);

acl.user_id = user_id => {
    let attr = user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return create(filters.eq(attr, user_id));
};

module.exports = acl;
