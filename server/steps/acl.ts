'use strict';

import * as conf from '../conf';
import * as ldap from '../ldap';
import { parse_composites } from '../ldap_convert';
const filters = ldap.filters;

const has_subv = (v: v, subv: Partial<v>) => (
  !Object.keys(subv).some(k => v[k] !== subv[k])
);

export const has_one_subvs = (v: v, subvs: Partial<v>[]) => (
    subvs.some(subv => has_subv(v, subv))
);

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '' as string)
);

// "includes" is optional, it will be computed from "list"
const create = (peopleFilter: string, subvs: Partial<v>[]): acl_search => ({
    v_to_users: (v, attr: string) => (
        has_one_subvs(v, subvs) ? searchPeople(peopleFilter, attr) : Promise.resolve([])
    ),
    user_to_subv: (user) => {
        if (!user.mail) console.error("no user mail!?");
        return searchPeople(peopleFilter, "mail").then(l => l.includes(user.mail) ? subvs : [])
    },
});

export const ldapGroup = (cn: string, subvs : Partial<v>[] = [{}]): acl_search => (
    create(filters.memberOf(cn), subvs)
);

export const user_id = (user_id: string, subvs : Partial<v>[] = [{}]): acl_search => {
    let attr = user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return create(filters.eq(attr, user_id), subvs);
};

export const _rolesGeneriques = (rolesFilter: string) => {
    return ldap.searchThisAttr(conf.ldap.base_rolesGeneriques, rolesFilter, 'up1TableKey', '' as string)
};
export const structureRoles = (code_attr: string, rolesFilter: string): acl_search => ({
    v_to_users: (v, attr: string) => (    
        _rolesGeneriques(rolesFilter).then(roles => {
            let code = v[code_attr];
            let l = roles.map(role => `(supannRoleEntite=*[role=${role}]*[code=${code}]*)`)
            return searchPeople(filters.or(l), attr).then(vals => {
                if (!vals.length) throw "no_moderators";
                return vals;
            })
        })
    ),
    user_to_subv: (user) => (
        _rolesGeneriques(rolesFilter).then(roles => {
            const user_roles = user.supannRoleEntite ? parse_composites(user.supannRoleEntite) as { role: string, code: string }[] : [];
            return user_roles.filter(e => roles.includes(e.role)).map(e => ({ [code_attr]: e.code }));
        })
    ),
});
