'use strict';

import * as _ from 'lodash';
import * as mail from '../mail';
import * as ldap from '../ldap';
import * as helpers from '../helpers';
import * as crejsonldap from '../crejsonldap';
import { onePerson } from '../search_ldap';
import * as search_ldap from '../search_ldap';
import * as esup_activ_bo from '../esup_activ_bo';
import { flatten_attrs } from '../step_attrs_option';
import v_display from '../v_display';
import * as conf from '../conf';
import client_conf from '../../app/src/conf'; // ES6 syntax needed for default export
const filters = ldap.filters;

export const addAttrs = (v: Partial<v>) => (_req, sv) => {
    _.assign(sv.v, v);
    return Promise.resolve(sv);
}

export const addProfileAttrs = (profiles: profileValues[]) => (_req, sv) => {
    _.defaults(sv.v, { profilename: profiles[0].const });
    let profile = _.find(profiles, p => p.const === sv.v.profilename);
    if (!profile) throw "invalid profile " + sv.v.profilename;
    _.assign(sv.v, profile.fv());
    return Promise.resolve(sv);
}

export const esup_activ_bo_sendCode : simpleAction = (_req, { v }) => (
    esup_activ_bo.sendCode(v.supannAliasLogin, v['channel']).then(_ => ({ v }))
)

export const add_full_v: simpleAction = (_req, sv)  => (
    onePerson(filters.eq("uid", sv.v.uid)).then(full_v => {
        let v = sv.v;
        if (!v.various) v.various = {};
        v.various.full_v = full_v;
        return { v };
    })
);

export const if_v = (test_v, action: action): action => async (req, sv: sva) => (
    test_v(sv.v) ? await action(req, sv) : { v: sv.v, response: {} }
);

export function chain(l_actions: action[]): action {
    return (req, sv: sva) => {
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

    let filters2 = search_ldap.subv_to_eq_filters(subv);
    if (!_.isEqual(_.sortBy(filters_), _.sortBy(filters2))) console.error("accountExactMatch assertion failed", filters_, "vs", filters2);

    if (filters_.length < 3) throw "refusing to create account with so few attributes. Expecting at least 3 of " + attrs_exact_match.join(',');
    return onePerson(filters.and(filters_));
}

export const createCompteSafe = (l_actions: action[]): action => async (req, sv) => {
    const orig_v = sv.v;
    sv.v = (await chain(l_actions)(req, sv)).v;
    {
        const existingAccount = await accountExactMatch(sv.v);
        if (existingAccount) return { v: existingAccount, response: { ignored: true } };
    }
    {
        const homonymes = await search_ldap.homonymes(sv.v);
        if (homonymes.length) return { v: orig_v, response: { id: sv.id, in_moderation: true } };
    }
    // ok, let's create it
    return createCompte(req, sv);
}

export const createCompte: action = (_req, sv) => (
    createCompte_(sv, { dupcreate: "ignore", dupmod: "warn", create: true })
);
    
const createCompte_ = async (sv: sva, opts : crejsonldap.options) => {
    let v = sv.v;

    if (!v.startdate) v.startdate = new Date();
    if (!v.enddate) {
        if (!v.duration) throw "no duration nor enddate";
        // "enddate" is *expiration* date and is rounded down to midnight (by ldap_convert.date.toLdap)
        // so adding a full 23h59m to help 
        v.enddate = helpers.addDays(v.startdate, v.duration + 0.9999);
    }
    
    const resp_subv = await crejsonldap.createMayRetryWithoutSupannAliasLogin(v, opts);
    console.log("createCompteRaw returned", resp_subv.uid);
    v.uid = resp_subv.uid;
    if (!v.supannAliasLogin) v.supannAliasLogin = resp_subv.uid;

    await after_createAccount(v, sv.attrs, resp_subv.accountStatus);

    return { v, response: {login: v.supannAliasLogin, accountStatus: resp_subv.accountStatus } }
};

const mailFrom = (v) => {
    const email = v.mailFrom_email;
    return !email ? conf.mail.from : v.mailFrom_text ? `${v.mailFrom_text} <${email}>` : email;
}

const after_createAccount = async (v: v, attrs: StepAttrsOption, accountStatus: crejsonldap.accountStatus) => {
    if (v.userPassword && !accountStatus) {
        await esup_activ_bo.setNewAccountPassword(v.uid, v.supannAliasLogin, v.userPassword);
        // NB: if we have a password, it is a fast registration, so do not send a mail
    }
    if (v.supannMailPerso) {
        const v_ = v_display(v, flatten_attrs(attrs, v));
        mail.sendWithTemplateFile('warn_user_account_created.html', { from: mailFrom(v), to: v.supannMailPerso, v, v_display: v_, isActive: !!accountStatus });
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

export const sendMail = (template: string, params = {}): action => async (req, sv) => {
    const v = sv.v;
    const v_ = v_display(v, flatten_attrs(sv.attrs, v));
    const sv_url = conf.mainUrl + "/" + sv.step + "/" + sv.id;
    let to = params['to'];
    if (!to) to = v.mail || v.supannMailPerso;
    if (!to && v.various && v.various.full_v) to = v.various.full_v.mail || v.various.full_v.supannMailPerso;
    mail.sendWithTemplate(template, { ...params, to, moderator: req.user, v, v_display: v_, sv_url });
    return { v };
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
    mail.sendWithTemplateFile('validation.html', { conf, v, to: v.supannMailPerso, sv_url });
    return Promise.resolve({ v });
};

// simple flag sent to the browser
export const forceBrowserExit: action = (_req, { v }) => (
    Promise.resolve({ v, response: { forceBrowserExit: true } })
);

export const homePhone_to_pager_if_mobile : simpleAction = async function(_req, { v }) {
    const { homePhone, ...v_ } = v;
    if (homePhone && homePhone.match("^(" + client_conf.pattern.frenchMobilePhone + ")$")) {
        v = { pager: homePhone, ...v_ } as v;
    }
    return { v };
}

export const pager_to_homePhone_if_no_homePhone : simpleAction = async function(_req, { v }) {
    if (!v.homePhone) {
        const { pager, ...v_ } = v;
        if (pager) v = { homePhone: pager, ...v_ } as v;
    }
    return { v };
}

const map_attrs = (attr2f: Dictionary<(string) => string>) : simpleAction => async (_req, { v }) => {
    _.each(attr2f, (f, attr) => { if (v[attr]) v[attr] = f(v[attr]) });
    return { v }
}

export const anonymize_phoneNumber = (attr: string) => (
    map_attrs({ [attr]: helpers.anonymize_phoneNumber })
)
export const anonymize_email = (attr: string) => (
    map_attrs({ [attr]: helpers.anonymize_email })
)

export const sendMailNewEtablissement = (to: string): simpleAction => (_req, sv) => {
    let v = sv.v;
    if (!v['etablissement_description']) {
        return Promise.resolve({ v });
    }
    const isEtabAttr = (_, attr) => attr.match(/etablissement_.*/);
    const text = JSON.stringify(_.pickBy(v, isEtabAttr), undefined, '  ')
    console.log("sending mail", text);
    mail.send({ to, text,
        subject: "Etablissement a ajouter dans LDAP", 
    });
    v = { ..._.omitBy(v, isEtabAttr), etablissementExterne: conf.ldap.etablissements.attrs.siret.convert.toLdap(v['etablissement_siret']) } as v;
    return Promise.resolve({ v });
};

