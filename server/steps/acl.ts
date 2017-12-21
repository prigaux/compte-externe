'use strict';

import * as conf from '../conf';
import * as ldap from '../ldap';
import { parse_composites } from '../ldap_convert';
const filters = ldap.filters;

const has_subv = (v: v, subv: Partial<v>) => (
  !Object.keys(subv).find(k => v[k] !== subv[k])
);

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '' as string)
);

// "includes" is optional, it will be computed from "list"
const create = (peopleFilter: string): acl_search => ({
    v_to_users: (_v, attr: string) => searchPeople(peopleFilter, attr),
    user_to_subv: (user) => {
        if (!user.mail) console.error("no user mail!?");
        return searchPeople(peopleFilter, "mail").then(l => l.includes(user.mail) ? [{}] : [])
    },
});

export const ldapGroup = (cn: string): acl_search => (
    create(filters.memberOf(cn))
);

export const user_id = (user_id: string): acl_search => {
    let attr = user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return create(filters.eq(attr, user_id));
};

export const _rolesGeneriques = (rolesFilter: string) => {
    return ldap.searchThisAttr(conf.ldap.base_rolesGeneriques, rolesFilter, 'supannRoleGenerique', '' as string)
};
export const structureRoles = (code_attr: string, rolesFilter: string): acl_search => ({
    v_to_users: (v, attr: string) => (    
        _rolesGeneriques(rolesFilter).then(roles => {
            console.log(rolesFilter);
            let code = v[code_attr];
            let l = roles.map(role => `(supannRoleEntite=*[role=${role}]*[code=${code}]*)`)
            return searchPeople(filters.or(l), attr);
        })
    ),
    user_to_subv: (user) => (
        _rolesGeneriques(rolesFilter).then(roles => {
            const user_roles = user.supannRoleEntite ? parse_composites(user.supannRoleEntite) as { role: string, code: string }[] : [];
            return user_roles.filter(e => roles.includes(e.role)).map(e => ({ [code_attr]: e.code }));
        })
    ),
});
