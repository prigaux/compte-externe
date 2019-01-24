'use strict';

import * as _ from 'lodash';
import * as acl from './steps/acl';
import { mapKeys } from 'lodash';
import * as conf from './conf';
import * as ldap from './ldap';

type subvs = Partial<v>[]
export type allowed_ssubvs = { step: string, subvs: subvs }[]

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '' as string)
);

// simple helper using "v_to_ldap_filter" to get LDAP people with a specific attribute
export const v_to_users = (acls: acl_search, v: v, attr: string) => (
    acls.v_to_ldap_filter(v).then(filter => searchPeople(filter, attr))
);

export const moderators = (acls: acl_search[], v: v): Promise<string[]> => {
    if (!acls) return <Promise<string[]>> Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        v_to_users(acl, v, "mail")
    ))).then(mails => _.flatten(mails)).then(mails => {
        if (!mails.length) throw "no_moderators";
        return mails;
    });
};

// Returns the "subvs" a "user" is allowed for "step.acls"
export const allowed_subvs = (vuser : v, step: step) => {
    let subvs: Promise<subvs>;
    if (!step.acls) {
        subvs = Promise.resolve([{}]); // allow any v
    } else if (!vuser) {
        subvs = Promise.resolve([]); // empty or, so disallow any v
    } else {
        subvs = Promise.all(step.acls.map(acl => acl.user_to_subv(vuser))).then(ll => (
            simplify_subvs(_.flatten(ll))
        ));
    }
    return subvs;
};

// [{}, { ... }] becomes [{}]
const simplify_subvs = l => (
    l.find(_.isEmpty) ? [{}] : _.uniqWith(l, _.isEqual)
)

const one_allowed_ssubvs = (vuser : v) => (step: step, stepName: string) => (
    allowed_subvs(vuser, step).then(subvs => (
        { step: stepName, subvs }
    ))
);

export const allowed_ssubvs = (vuser: v, steps: steps): Promise<allowed_ssubvs> => (
    Promise.all(_.map(steps, one_allowed_ssubvs(vuser))).then(l => l.filter(e => e.subvs.length > 0))
);

export const is_sv_allowed = (sv: sv, allowed_ssubvs: allowed_ssubvs) => (
    allowed_ssubvs.some(({ step, subvs}) => (
        step === sv.step && acl.has_one_subvs(sv.v, subvs)
    ))
);

const mongo_or = (l: any[]) => l.length === 1 ? l[0] : { $or: l };

export const mongo_query = (allowed_ssubvs: allowed_ssubvs) => (
    mongo_or(allowed_ssubvs.map(({step, subvs}) => (
        { step, ...mongo_or(subvs.map(subv => mapKeys(subv, (_,k) => "v." + k))) }
    )))
);
