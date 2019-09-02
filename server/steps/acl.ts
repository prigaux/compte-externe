'use strict';

import * as _ from 'lodash';
import * as conf from '../conf';
import * as ldap from '../ldap';
import * as search_ldap from '../search_ldap';
import * as db from '../db';
import { parse_composites } from '../ldap_convert';
const filters = ldap.filters;

type simple_acl_search = {    
    v_to_ldap_filter(v: v): Promise<string>
    user_to_subv(user: CurrentUser): Promise<Partial<v>[] | boolean>
}

const _normalize__or_subv = (l : boolean | Partial<v>[]) => (
    _.isBoolean(l) ? l : l.length === 0 ? false : l
);

const _convert_simple_acl_search = ({ user_to_subv, ...other } : simple_acl_search): acl_search => ({
    ...other,
    async user_to_ldap_filter(user) {
        const or_subv = _normalize__or_subv(await user_to_subv(user));
        return _.isBoolean(or_subv) ? or_subv : filters.or(or_subv.map(l => filters.and(search_ldap.subv_to_eq_filters(l))));
    },
    async user_to_mongo_filter(user) {
        const or_subv = _normalize__or_subv(await user_to_subv(user));
        return _.isBoolean(or_subv) ? or_subv : db.or(or_subv.map(subv => _.mapKeys(subv, (_,k) => "v." + k)));
    },
})

const peopleFilter = (filter: string): acl_search => _convert_simple_acl_search({
    // search users that can moderate "v":
    v_to_ldap_filter: async (_v) => filter,
    // can the user moderate any "v":
    user_to_subv: (user) => {
        if (!user.id) console.error("no user id!?");
        return search_ldap.existPeople(filters.and([ filter, search_ldap.currentUser_to_filter(user) ]))
    },
});

export const ldapGroup = (cn: string): acl_search => (
    peopleFilter(filters.memberOf(cn))
);

export const user_id = (user_id: string): acl_search => {
    return peopleFilter(search_ldap.currentUser_to_filter({ id: user_id }));
};

export const _rolesGeneriques = (rolesFilter: string) => {
    return ldap.searchThisAttr(conf.ldap.base_rolesGeneriques, rolesFilter, 'up1TableKey', '' as string)
};
export const structureRoles = (code_attr: string, rolesFilter: string): acl_search => _convert_simple_acl_search({
    v_to_ldap_filter: (v) => (    
        _rolesGeneriques(rolesFilter).then(roles => {
            let code = v[code_attr];
            let l = roles.map(role => `(supannRoleEntite=*[role=${role}]*[code=${code}]*)`)
            return filters.or(l);
        })
    ),
    user_to_subv: (user) => (
      ldap.searchOne(conf.ldap.base_people, search_ldap.currentUser_to_filter(user), { supannRoleEntite: [''] }, {}).then(user => (
        _rolesGeneriques(rolesFilter).then(roles => {
            const user_roles = user.supannRoleEntite ? parse_composites(user.supannRoleEntite) as { role: string, code: string }[] : [];
            return user_roles.filter(e => roles.includes(e.role)).map(e => ({ [code_attr]: e.code }));
        })
      ))
    ),
});

const _filter_user_memberOfs = async (group_cn_to_code: (cn: string) => string, user: CurrentUser) => {
    const user_ = await ldap.searchOne(conf.ldap.base_people, search_ldap.currentUser_to_filter(user), { memberOf: [''] }, {});
    const r = [];
    for (const memberOf of user_.memberOf) {
        const cn = conf.ldap.memberOf_to_group_cn(memberOf);
        const code = cn && group_cn_to_code(cn);
        if (code) r.push(code);
    }
    return r;
}

// Usage example:
//   acl.group_for_each_attr_codes('structureParrain', 
//       code => `applications.comptex.invite.${code}-managers`,
//       cn => { const m = cn.match(/applications\.comptex\.invite\.(.*)-managers/); return m && m[1] })
export const group_for_each_attr_codes = (codeAttr: string, code_to_group_cn: (code: string) => string, group_cn_to_code: (cn: string) => string): acl_search => _convert_simple_acl_search({
    v_to_ldap_filter: async (v) => (
        filters.memberOf(code_to_group_cn(v[codeAttr]))
    ),
    user_to_subv: async (user) => {
      const codes = await _filter_user_memberOfs(group_cn_to_code, user);
      return codes.map(code => ({ [codeAttr]: code }))
    },
});
