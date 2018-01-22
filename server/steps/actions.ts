'use strict';

import * as _ from 'lodash';
import * as mail from '../mail';
import * as ldap from '../ldap';
import * as utils from '../utils';
import * as crejsonldap from '../crejsonldap';
import { onePerson } from '../search_ldap';
import * as search_ldap from '../search_ldap';
import * as esup_activ_bo from '../esup_activ_bo';
import v_display from '../v_display';
import * as conf from '../conf';
const filters = ldap.filters;

export const addAttrs = (v: Partial<v>) => (_req, sv) => {
    _.assign(sv.v, v);
    return Promise.resolve(sv);
}

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

export const autoModerateIf = (f: (v: v) => boolean) : simpleAction => (_req, { v }) => (
    Promise.resolve({ v, response: { autoModerate: f(v) } })
);

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

const accountExactMatch = (v: v) => {
    // first lookup exact match in LDAP
    const ignored_attrs = [
        'profilename', 'priority', 'startdate', 'enddate', 'duration', // hard to compare (stored in up1Profile)
        'various', // not stored
        'userPassword', // no way
        'jpegPhoto', // not handled correctly by convertToLdap
        'homePhone', 'pager', // we would need conversion to have a correct comparison
    ]
    const attrs_exact_match = _.difference(Object.keys(v), ignored_attrs);
    const subv = _.pick(v, attrs_exact_match) as v;
    let v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, subv, {});
    let filters_ = attrs_exact_match.filter(attr => attr in v_ldap).map(attr => filters.eq(attr, v_ldap[attr] as string));
    if (filters_.length < 3) throw "refusing to create account with so few attributes. Expecting at least 3 of " + attrs_exact_match.join(',');
    return onePerson(filters.and(filters_));
}

export const createCompteSafe: action = async (_req, sv) => {
    {
        const existingAccount = await accountExactMatch(sv.v);
        if (existingAccount) return { v: existingAccount, response: { ignored: true } };
    }
    {
        const homonymes = await search_ldap.homonymes(sv.v);
        if (homonymes.length) return { v: sv.v, response: { id: sv.id, in_moderation: true } };
    }
    // ok, let's create it
    return createCompte_(sv, { dupcreate: "ignore", create: true });
}

export const createCompte: action = (_req, sv) => (
    createCompte_(sv, { dupcreate: "ignore", create: true })
);
    
const createCompte_ = (sv: sv, opts : crejsonldap.options) => {
    const v = sv.v;
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
        const attrs = require('../steps/conf').steps[sv.step].attrs;
        return after_createAccount(v, attrs, is_new_account);
    }).then((v) => (
        { v, response: {login: v.supannAliasLogin} }
    ));
};

const after_createAccount = (v: v, attrs: StepAttrsOption, is_new_account: boolean) => {
    if (!is_new_account) {
        // we merged the account. ignore new password + no mail
    } else if (v.userPassword) {
        return esup_activ_bo.setPassword(v.uid, v.supannAliasLogin, v.userPassword);
        // NB: if we have a password, it is a fast registration, so do not send a mail
    } else if (v.supannMailPerso) {
        const v_ = v_display(v, attrs);
        mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v, v_display: v_ });
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
        return search_ldap.genLogin(sv.v.birthName || sv.v.sn, sv.v.givenName).then(createResp);
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

export const homePhone_to_pager_if_mobile : simpleAction = async function(_req, { v }) {
    const { homePhone, ...v_ } = v;
    if (homePhone && homePhone.match("^(" + conf.pattern.isFrenchMobilePhone + ")$")) {
        v = { pager: homePhone, ...v_ } as v;
    }
    return { v };
}