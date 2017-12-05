'use strict';

import _ = require('lodash');
import mail = require('../mail');
import ldap = require('../ldap');
import utils = require('../utils');
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

type createCompteOptions = {
    dupcreate: "ignore"|"warn"|"err";
}

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
            return { v, response: { ignored: true } };
        }
        // no exact match, calling crejsonldap with homonyme detection
        return createCompte_(sv.v, { dupcreate: "err" }).catch(errS => {
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
    createCompte_(sv.v, { dupcreate: "ignore" })
);
    
const prepare_v = (v: v) => {
    if (!v) throw "internal error: createCompte with no v";

    if (!v.startdate) v.startdate = new Date();
    if (!v.enddate) {
        if (!v.duration) throw "no duration nor enddate";
        // "enddate" is *expiration* date and is rounded down to midnight (by ldap_convert.date.toLdap)
        // so adding a full 23h59m to help 
        v.enddate = utils.addDays(v.startdate, v.duration + 0.9999);
    }
    let v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, v, { toJson: true });
    delete v_ldap.userPassword; // handled by esup_activ_bo
    delete v_ldap.duration; // only useful to compute "enddate"
    return v_ldap;
}

const createCompte_ = (v: v, opts : createCompteOptions) => {
    let v_ldap = prepare_v(v);
    return createCompteRaw(v_ldap, opts).then(function (uid_and_login) {
        console.log("createCompteRaw returned", uid_and_login);
        _.assign(v, uid_and_login);
        return v;
    }).tap((v) => {
        if (v_ldap.uid) {
            // we merged the account. ignore new password + no mail
        } else if (v.userPassword) {
            return esup_activ_bo.setPassword(v.uid, v.userPassword);
            // NB: if we have a password, it is a fast registration, so do not send a mail
        } else if (v.supannMailPerso) {
            mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v });
        }
        return null;
    }).then((v) => (
        { v, response: {login: v.supannAliasLogin} }
    ));
};

// NB: crejsonldap performance:
// - 200ms minimal response time
// - 200ms ssh overhead
// - 14MB RSS memory usage
const createCompteRaw = (v: Dictionary<ldap_RawValue>, opts : createCompteOptions) => {
    let { profilename, priority, startdate, enddate, ...attrs } = v;
    
    let param = JSON.stringify({
        id: ["uid"], create: true, ...opts,
        users: [
            { profilename, priority, startdate, enddate, attrs } ],
    });
    console.log("action createCompte:", param);
    return utils.popen(param, 'createCompte', []).then(data => {
        let resp;
        try { 
            resp = JSON.parse(data);
            resp = resp.users[0];
        } catch (e) {
            console.error(e);
            throw "createCompte error:" + data;
        }
        if (resp.err) console.error("createCompte returned", resp);
        if (resp.err && resp.err[0].attr === "supannAliasLogin") {
            // gasp, the generated supannAliasLogin is already in use,
            // retry without supannAliasLogin
            delete v['supannAliasLogin'];
            return createCompteRaw(v, opts);
        }
            
        let m = resp.dn && resp.dn.match(/uid=(.*?),/);
        if (m) {
            let uid = m[1];
            return { uid, supannAliasLogin: v['supannAliasLogin'] || uid };
        } else {
            console.error("createCompte should return dn");
            throw resp.err ? JSON.stringify(resp.err[0]) : "createCompte should return dn";
        }
    });
}

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