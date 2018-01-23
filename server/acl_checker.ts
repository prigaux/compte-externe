'use strict';

import * as _ from 'lodash';
import * as acl from './steps/acl';
import { mapKeys } from 'lodash';

type subvs = Partial<v>[]
export type allowed_ssubvs = { step: string, subvs: subvs }[]

export const moderators = (acls: acl_search[], v: v): Promise<string[]> => {
    if (!acls) return <Promise<string[]>> Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        acl.v_to_users(v, "mail")
    ))).then(mails => _.flatten(mails));
};

const one_allowed_ssubvs = (vuser : v) => (step: step, stepName: string) => {
    let subvs: Promise<subvs>;
    if (!step.acls) {
        subvs = Promise.resolve([{}]); // allow any v
    } else if (!vuser) {
        subvs = Promise.resolve([]); // empty or, so disallow any v
    } else {
        subvs = Promise.all(step.acls.map(acl => acl.user_to_subv(vuser))).then(ll => (
            _.flatten(ll)
        ));
    }
    return subvs.then(subvs => ({ step: stepName, subvs }));
};

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
