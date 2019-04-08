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

const create = (peopleFilter: string): acl_search => _convert_simple_acl_search({
    // search users that can moderate "v":
    v_to_ldap_filter: async (_v) => peopleFilter,
    // can the user moderate any "v":
    user_to_subv: (user) => {
        if (!user.id) console.error("no user id!?");
        return search_ldap.existPeople(filters.and([ peopleFilter, search_ldap.currentUser_to_filter(user) ]))
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

// Usage example:
//   acl.group_for_each_attr_codes('structureParrain', 
//       code => `applications.comptex.invite.${code}-managers`,
//       memberOf => { const m = memberOf.match(/applications\.comptex\.invite\.(.*)-managers/); return m && m[1] })
export const group_for_each_attr_codes = (codeAttr: string, code2groupId: (string) => string, groupId2code: (string) => string): acl_search => _convert_simple_acl_search({
    v_to_ldap_filter: async (v) => (
        filters.memberOf(code2groupId(v[codeAttr]))
    ),
    user_to_subv: async (user) => {
      const user_ = await ldap.searchOne(conf.ldap.base_people, search_ldap.currentUser_to_filter(user), { memberOf: [''] }, {});
      const r = [];
      for (const memberOf of user_.memberOf) {
          const code = groupId2code(memberOf);
          if (code) r.push({ [codeAttr]: code });
      }
      return r;
    },
});
