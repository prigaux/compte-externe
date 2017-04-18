'use strict';

import conf = require('../conf');
import ldap = require('../ldap');
const filters = ldap.filters;

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '')
);

// "includes" is optional, it will be computed from "list"
const create = (peopleFilter: string): acl_search => (
    (_v, attr: string) => searchPeople(peopleFilter, attr)
);

export const ldapGroup = (cn: string): acl_search => (
    create(filters.memberOf(cn))
);

export const user_id = (user_id: string): acl_search => {
    let attr = user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return create(filters.eq(attr, user_id));
};

export const autoModerateIf = (f: (v) => boolean): acl_search =>
    (v, _attr) => Promise.resolve(f(v) ? ["_AUTO_MODERATE_"] : []);

export const _rolesGeneriques = (rolesFilter: string) => {
    return ldap.searchThisAttr(conf.ldap.base_rolesGeneriques, rolesFilter, 'supannRoleGenerique', '')
};
export const structureRoles = (toCode: (v) => string, rolesFilter: string): acl_search => (
    (v, attr: string) => (    
        _rolesGeneriques(rolesFilter).then(roles => {
            console.log(rolesFilter);
            let code = toCode(v);
            let l = roles.map(role => `(supannRoleEntite=*[role=${role}]*[code=${code}]*)`)
            return searchPeople(filters.or(l), attr);
        })
    )
);
