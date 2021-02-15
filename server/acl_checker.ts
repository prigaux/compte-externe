'use strict';

import * as _ from 'lodash';
import * as conf from './conf';
import * as db from './db';
import * as ldap from './ldap';
import * as search_ldap from './search_ldap';
import { filters as ldap_filters } from './ldap';

const searchPeople = (peopleFilter: string, attr: string) => (
    ldap.searchThisAttr(conf.ldap.base_people, peopleFilter, attr, '' as string)
);

// simple helper using "v_to_ldap_filter" to get LDAP people with a specific attribute
export const v_to_users = (acls: acl_search, v: v, attr: string) => (
    acls.v_to_ldap_filter(v).then(filter => searchPeople(filter, attr))
);

const _simplify_ldap_filters = (l : (string|boolean)[]) => {
    if (l.find(e => e === true)) return true;
    const l_ = l.filter(e => e !== false) as string[];
    if (l_.length === 0) return false;
    return ldap_filters.or(l_)
};

const _simplify_mongo_filters = (l : acl_mongo_filter[]): acl_mongo_filter => {
    if (l.find(e => e === true)) return true;
    const l_ = l.filter(e => e !== false) as Dictionary<unknown>[];
    if (l_.length === 0) return false;
    return db.or(l_)
};

// Returns ldap filter matching "moderators"
const v_to_ldap_filter = (v: v, acls: acl_search[]) => (
    Promise.all(acls.map(acl => acl.v_to_ldap_filter(v))).then(ldap_filters.or)
);

// Returns the ldap filter a "user" is allowed to moderate for "acls"
export const user_to_ldap_filter = async (user: CurrentUser, acls: acl_search[]) => {
    if (!acls) {
        return true;
    } else if (!user) {
        return false;
    } else {
        return Promise.all(acls.map(acl => acl.user_to_ldap_filter(user))).then(_simplify_ldap_filters)
    }
};

// Returns the mongo filter a "user" is allowed to moderate for "acls"
const user_to_mongo_filter = async (user: CurrentUser, acls: acl_search[]) => {
    if (!acls) {
        return true;
    } else if (!user) {
        return false;
    } else {
        return Promise.all(acls.map(acl => acl.user_to_mongo_filter(user))).then(_simplify_mongo_filters)
    }
};

export const checkAcl = async (user: CurrentUser, v: v, acls: acl_search[]) => {
    if (!acls) {
        return true;
    } else if (!user) {
        return { error: "not logged" };
    } else {
        const filter = await v_to_ldap_filter(v, acls);
        const user_ = await search_ldap.onePerson(ldap_filters.and([ filter, search_ldap.currentUser_to_filter(user) ]))
        if (user_) {
            // ensure moderator.mail is available again for actions.sendMail template
            user.mail = user_.mail
            return true
        } else {
            return { error: filter }
        }
    }
}

// compute who will be allowed to act on this "v"
export const moderators = async (acls: acl_search[], v: v): Promise<string[]> => {
    if (!acls) return undefined;

    const filter = await v_to_ldap_filter(v, acls);
    const mails = await searchPeople(filter, 'mail');
    if (!mails.length) throw "no_moderators";
    return mails;
};

const one_allowed_step_ldap_filter = (user: CurrentUser) => (step: step, stepName: string) => (
    user_to_ldap_filter(user, step.acls).then(filter => (
        { step: stepName, filter: filter }
    ))
);

const one_allowed_step_mongo_filter = (user: CurrentUser) => (step: step, stepName: string) => (
    user_to_mongo_filter(user, step.acls).then(filter => (
        { step: stepName, filter: filter }
    ))
);

// for each step, the logged user can be allowed or not ; if allowed, the logged user can be allowed to access only a subset of ldap users
export const allowed_step_ldap_filters = (user: CurrentUser, steps: steps): Promise<{ step: string, filter: string }[]> => (
    Promise.all(_.map(steps, one_allowed_step_ldap_filter(user))).then(l => (
        l.filter(one => one.filter !== false).map(({ filter, step }) => (
            { step, filter: filter === true ? undefined: filter as string } // no filter means no restriction
        ))
    ))
);

// for each step, the logged user can be allowed or not ; if allowed, the logged user can be allowed to access only a subset of database "svs"
export const mongo_query = (user: CurrentUser, steps: steps) => (
    Promise.all(_.map(steps, one_allowed_step_mongo_filter(user))).then(l => (
        db.or(l.filter(one => one.filter !== false).map(({ filter, step }) => (
            { step, ...(filter === true ? {} : filter) }
        )))
    ))
);
