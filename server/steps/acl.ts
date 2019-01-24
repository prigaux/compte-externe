'use strict';

import { isEqual } from 'lodash';
import * as conf from '../conf';
import * as ldap from '../ldap';
import { parse_composites } from '../ldap_convert';
const filters = ldap.filters;

const has_subv = (v: v, subv: Partial<v>) => (
  !Object.keys(subv).some(k => !isEqual(v[k], subv[k]))
);

export const has_one_subvs = (v: v, subvs: Partial<v>[]) => (
    subvs.some(subv => has_subv(v, subv))
);

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '' as string)
);

const create = (peopleFilter: string): acl_search => ({
    // LDAP search filter matching users that can moderate "v":
    v_to_ldap_filter: async (_v) => peopleFilter,
    // Return: match-all-v if the "user" matches "peopleFilter", otherwise match-none
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
    return ldap.searchThisAttr(conf.ldap.base_rolesGeneriques, rolesFilter, 'up1TableKey', '' as string)
};
export const structureRoles = (code_attr: string, rolesFilter: string): acl_search => ({
    v_to_ldap_filter: (v) => (    
        _rolesGeneriques(rolesFilter).then(roles => {
            let code = v[code_attr];
            let l = roles.map(role => `(supannRoleEntite=*[role=${role}]*[code=${code}]*)`)
            return filters.or(l);
        })
    ),
    user_to_subv: (user) => (
        _rolesGeneriques(rolesFilter).then(roles => {
            const user_roles = user.supannRoleEntite ? parse_composites(user.supannRoleEntite) as { role: string, code: string }[] : [];
            return user_roles.filter(e => roles.includes(e.role)).map(e => ({ [code_attr]: e.code }));
        })
    ),
});
