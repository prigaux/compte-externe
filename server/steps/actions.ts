'use strict';

import _ = require('lodash');
import mail = require('../mail');
import ldap = require('../ldap');
import utils = require('../utils');
import crejsonldap = require('../crejsonldap');
import search_ldap = require('../search_ldap');
import acl_checker = require('../acl_checker');
import esup_activ_bo = require('../esup_activ_bo');
import conf = require('../conf');
const filters = ldap.filters;

export const addAttrs = (v: Partial<v>) => (_req, sv) => {
    _.assign(sv.v, v);
    return Promise.resolve(sv);
}

type profileValues = StepAttrOptionChoices & { fv: () => Partial<v> }

export const addProfileAttrs = (profiles: profileValues[]) => (_req, sv) => {
    _.defaults(sv.v, { profilename: profiles[0].key });
    let profile = _.find(profiles, p => p.key === sv.v.profilename);
    if (!profile) throw "invalid profile " + sv.v.profilename;
    _.assign(sv.v, profile.fv());
    return Promise.resolve(sv);
}

const isCasUser = (req) => {
    let idp = req.header('Shib-Identity-Provider');
    return idp && idp === conf.cas_idp;
}

export const getShibAttrs: simpleAction = (req, _sv) => {
    if (!req.user) throw `Unauthorized`;
    let v = _.mapValues(conf.shibboleth.header_map, headerName => (
        req.header(headerName)
    )) as v;
    console.log("action getShibAttrs:", v);
    return Promise.resolve({ v });
};

const onePerson = (filter) => ldap.searchOne(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, {})

export const getCasAttrs: simpleAction = (req, _sv) => {
    if (!isCasUser(req)) throw `Unauthorized`;
    let filter = filters.eq("eduPersonPrincipalName", req.user.id);
    return onePerson(filter).then((v: v) => {
        v.noInteraction = true;
        return { v };
    });
}

export const getShibOrCasAttrs: simpleAction = (req, _sv) => (
    (isCasUser(req) ? getCasAttrs : getShibAttrs)(req, _sv)
)

export const getExistingUser: simpleAction = (req, _sv)  => (
    onePerson(filters.eq("uid", req.query.uid)).then(v => ({ v }))
);

export function chain(l_actions: action[]): action {
    return (req, sv: sv) => {
        let vr: Promise<vr> = Promise.resolve(sv);
        l_actions.forEach(action => {
            vr = vr.then(vr => (
                action(req, { ...sv, v: vr.v }).then(vr2 => (
                    // merge "response"s
                    { v: vr2.v, response: { ...vr.response, ...vr2.response } }
                ))
            ));
        });
        return vr;
    };
}

export const aclChecker = (acls: acl_search[]) => (
    (req, { v }) => (
        acl_checker.moderators(acls, v).then(moderators => {
            acl_checker.checkAuthorized(moderators, req.user);
            return { v };
        })
    )
) as simpleAction

const accountExactMatch = (v: v) => {
    // first lookup exact match in LDAP
    let v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, v, {});    
    let attrs_exact_match = [ 'sn', 'givenName', 'supannMailPerso', 'birthDay' ];
    let filters_ = attrs_exact_match.filter(attr => attr in v_ldap).map(attr => filters.eq(attr, v_ldap[attr] as string));
    if (filters_.length < 3) throw "refusing to create account with so few attributes. Expecting at least 3 of " + attrs_exact_match.join(',');
    return onePerson(filters.and(filters_));
}

export const createCompteSafe: simpleAction = (_req, sv) => {
    return accountExactMatch(sv.v).then(v => {
        if (v) {
            return Promise.resolve({ v, response: { ignored: true } } as vr);
        }
        // no exact match, calling crejsonldap with homonyme detection
        return createCompte_(sv.v, { dupcreate: "err", create: true }).catch(errS => {
            const err = JSON.parse(errS);
            if (err.code === 'homo') {
                return { v: sv.v, response: { in_moderation: true } };
             } else {
                 throw errS;
             }
        });
    });
}

export const createCompte: simpleAction = (_req, sv) => (
    createCompte_(sv.v, { dupcreate: "ignore", create: true })
);
    
const createCompte_ = (v: v, opts : crejsonldap.options) => {
    let is_new_account = !v.uid;

    if (!v.startdate) v.startdate = new Date();
    if (!v.enddate) {
        if (!v.duration) throw "no duration nor enddate";
        // "enddate" is *expiration* date and is rounded down to midnight (by ldap_convert.date.toLdap)
        // so adding a full 23h59m to help 
        v.enddate = utils.addDays(v.startdate, v.duration + 0.9999);
    }
    
    return crejsonldap.createMayRetryWithoutSupannAliasLogin(v, opts).then(function (uid) {
        console.log("createCompteRaw returned", uid);
        v.uid = uid;
        if (!v.supannAliasLogin) v.supannAliasLogin = uid;
        return v;
    }).tap((v) => {
        return after_createAccount(v, is_new_account);
    }).then((v) => (
        { v, response: {login: v.supannAliasLogin} }
    ));
};

const after_createAccount = (v: v, is_new_account: boolean) => {
    if (!is_new_account) {
        // we merged the account. ignore new password + no mail
    } else if (v.userPassword) {
        return esup_activ_bo.setPassword(v.uid, v.userPassword);
        // NB: if we have a password, it is a fast registration, so do not send a mail
    } else if (v.supannMailPerso) {
        mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v });
    }
    return null;
}

const crejsonldap_simple = (v: v, opts : crejsonldap.options) => (
    crejsonldap.call(v, opts)
    .then(crejsonldap.throw_if_err)
    .then(_ =>({ v })) 
)

export const modifyAccount : simpleAction = (_req, sv) => {
    if (!sv.v.uid) throw "modifyAccount needs uid";
    return crejsonldap_simple(sv.v, { create: false });
};

// throw a list of errors, if any
export const validateAccount : simpleAction = (_req, sv) => (
    crejsonldap_simple(sv.v, { action: "validate" })
);

// NB: expires only one profile. It will expire account if no more profiles
export const expireAccount : simpleAction = (_req, sv) => {
    const { uid, profilename } = sv.v;
    if (!uid) throw "expireAccount need uid";
    if (!profilename) throw "expireAccount need profilename";
    const v = { uid, profilename, enddate: new Date("1970-01-01") } as v;
    return crejsonldap_simple(v, { create: false }); // should we return sv.v?
};

export const genLogin: simpleAction = (_req, sv) => {
    let createResp = login => {
        let v = <v> _.assign({ supannAliasLogin: login }, sv.v);
        return { v, response: {login} };
    };
    if (sv.v.uid) {
        return Promise.resolve(sv.v.supannAliasLogin).then(createResp);
    } else {
        return search_ldap.genLogin(sv.v.sn, sv.v.givenName).then(createResp);
    }
};

export const sendValidationEmail: action = (_req, sv) => {
    let v = sv.v;
    console.log("action sendValidationEmail to " + v.supannMailPerso);
    const sv_url = conf.mainUrl + "/" + sv.step + "/" + sv.id;
    mail.sendWithTemplate('validation.html', { conf, v, to: v.supannMailPerso, sv_url });
    return Promise.resolve({ v });
};

// simple flag sent to the browser
export const forceBrowserExit: action = (_req, { v }) => (
    Promise.resolve({ v, response: { forceBrowserExit: true } })
);