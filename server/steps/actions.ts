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
import client_conf from '../../shared/conf'; // ES6 syntax needed for default export
const filters = ldap.filters;

const remove_accents = _.deburr;

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

export const esup_activ_bo_updatePersonalInformations : simpleAction = (_req, { v }) => {
    const userInfo: any = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, v, { toEsupActivBo: true });
    delete userInfo.userPassword // password is handled specially ("setPassword" action)
    if (!v.supannAliasLogin) return Promise.reject("missing supannAliasLogin");
    if (!v['code']) return Promise.reject("missing code");
    return esup_activ_bo.updatePersonalInformations(v.supannAliasLogin, v['code'], userInfo).then(_ => ({ v }))
}

export const esup_activ_bo_setPassword : simpleAction = async (_req, { v }) => {
    await esup_activ_bo.setPassword(v.supannAliasLogin, v['code'], v.userPassword)
    return { v }
}

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

const ignore_accents_and_case = val => remove_accents(val).toLowerCase()

const compare_v = (v: v, current_v: v) => {
    const attrs_options = [
      { kind: 'major_change', 
        attrs: [ 'supannMailPerso', 'pager', 'birthDay' ] },
      { kind: 'major_change', simplify: ignore_accents_and_case,
        attrs: [ 'sn', 'givenName' ] },
      { kind: 'to_ignore', attrs: [
        'profilename', 'priority', 'startdate', 'enddate', 'duration', // hard to compare (stored in up1Profile)
        'various', // not stored
        'userPassword', // no way
        'homePhone', // we would need conversion to have a correct comparison
      ] },
    ]
    let attr2opts = {};
    _.each(attrs_options, opts => opts.attrs.forEach(attr => attr2opts[attr] = opts));

    let diffs : { major_change?: any; minor_change?: any } = {};
    for (const attr in v) {
        let { kind, simplify } = attr2opts[attr] || { kind: undefined, simplify: undefined };
        if (kind === 'to_ignore') continue;
        if (!kind) kind = 'minor_change';
        const val = v[attr];
        const current_val = current_v[attr];

        if (!_.isEqual(val, current_val)) {
            if (simplify) {
                const [ val_, current_val_ ] = [ val, current_val ].map(simplify);
                if (_.isEqual(val_, current_val_)) kind = 'minor_change';
            }
            diffs[kind] = { attr, val, current_val };
        }
    }
    return diffs;
}

const canAutoMerge = async (v) => {
    let homonymes;
    if (!v.uid) {
        homonymes = await search_ldap.homonymes(v);
        if (homonymes.length) console.log(`createCompteSafe: homonymes found for ${v.givenName} ${v.sn}: ${homonymes.map(v => v.uid + " (score:" + v.score + ")")}`)
        if (homonymes.length === 1) {
            const existingAccount = homonymes[0]
            const diffs = compare_v(v, existingAccount);
            const force_merge = diffs.major_change && v.various && v.various.allow_homonyme_merge && v.various.allow_homonyme_merge(existingAccount, v);
            if (!force_merge && diffs.major_change) {
                console.log("no automatic merge because of", diffs['major_change']);
                return { action: 'need_moderation', homonymes, diffs };
            } else if (diffs.minor_change) {
                console.log("automatic merge with", existingAccount.uid);
                //console.log("automatic merge", diffs, v, existingAccount);
                return { action: 'modify_account', diffs, existingAccount };
            } else {
                console.log("skipping user already created and unmodified:", existingAccount.uid);
                return { action: 'nothing_to_do', existingAccount };
            }
        }
    }
    const action = homonymes && homonymes.length > 0 ? 'need_moderation' : 'create_account';
    return { action, homonymes };
}

export const createCompteSafe = (l_actions: action[], afterCreateCompte: action[] = []): action => async (req, sv) => {
    const orig_v = sv.v;
    sv.v = (await chain(l_actions)(req, sv)).v;
    const suggestion = await canAutoMerge(sv.v);

    // return { v: { uid: 'dry_run' } as v, response: suggestion };

    switch (suggestion.action) {
        case 'nothing_to_do': return { v: suggestion.existingAccount, response: { ignored: true } };
        case 'need_moderation': return { v: orig_v, response: { id: sv.id, in_moderation: true } };
        case 'modify_account': sv.v.uid = suggestion.existingAccount.uid;
    }
    // ok, let's create it
    return chain([ createCompte, ...afterCreateCompte ])(req, sv);
}

export const createCompte: action = (req, sv) => (
    createCompte_(req, sv, { dupcreate: "ignore", dupmod: "warn", create: true })
);
    
const createCompte_ = async (req: req, sv: sva, opts : crejsonldap.options) => {
    let v = sv.v;

    if (!v.startdate) v.startdate = new Date();
    if (!v.enddate) {
        if (!v.duration) throw "no duration nor enddate";
        // "enddate" is *expiration* date and is rounded down to midnight (by ldap_convert.date.toLdap)
        // so adding a full 23h59m to help 
        v.enddate = helpers.addDays(v.startdate, v.duration + 0.9999);
    }
    
    const resp_subv = await crejsonldap.createMayRetryWithoutSupannAliasLogin(v, opts);
    const created = resp_subv.uid && !v.uid;
    console.log(req.user?.id + ":/" + sv.step + ": createCompte", created ? "created" : "modified", resp_subv.uid);
    v.uid = resp_subv.uid;
    if (!v.supannAliasLogin) v.supannAliasLogin = resp_subv.uid;

    await after_createAccount(v, sv.attrs, resp_subv.accountStatus);

    return { v, response: {login: v.supannAliasLogin, created, accountStatus: resp_subv.accountStatus } }
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

export const validatePassword : simpleAction = async (_req, sv) => {
    if (!sv.v.supannAliasLogin) throw "validatePassword needs supannAliasLogin";
    if (!sv.v.userPassword) throw "validatePassword needs userPassword";
    await esup_activ_bo.validatePassword(sv.v.supannAliasLogin, sv.v.userPassword)
    return sv
}

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

const prepareMailTemplateParams = (req, sv, params = {}) => {
    const v = sv.v;
    const v_ = v_display(v, flatten_attrs(sv.attrs, v));
    const sv_url = conf.mainUrl + "/" + sv.step + "/" + sv.id;
    let to = params['to'];
    if (!to) to = v.mail || v.supannMailPerso;
    if (!to && v.various && v.various.full_v) to = v.various.full_v.mail || v.various.full_v.supannMailPerso;
    return { ...params, to, moderator: req.user, v, v_display: v_, sv_url };
}

export const sendMail = (template: string, params = {}): action => async (req, sv) => {
    mail.sendWithTemplate(template, prepareMailTemplateParams(req, sv, params));
    return { v: sv.v };
};

export const sendMailWithFileTemplate = (templateName: string, params = {}): action => async (req, sv) => {
    mail.sendWithTemplateFile(templateName, prepareMailTemplateParams(req, sv, params));
    return { v: sv.v };
}

export const ask_confirmation = (attr_to_save_confirmation: string, msg_template: string, title: string = "Attention"): action => async (req, sv) => {
    if (sv.v[attr_to_save_confirmation]) {
        // we have the confirmation, go on
        return sv;
    } else {
        // tell frontend to popup the msg
        const msg = await mail.mustache_async_render(msg_template, prepareMailTemplateParams(req, sv))
        throw { code: "OK", ask_confirmation: { attr_to_save_confirmation, msg, title } };
    }
}

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

// if supannMailPerso is an internal mail address, it must exist and not create a loop
export const validateMailNoLoop = (idAttr): simpleAction => async (_req, { v }) => {
    const email = v.supannMailPerso
    const r = await search_ldap.searchInternalMail(email)
    if (r.external) {
        // ok
    } else if (!r.internal) {
        throw `L'adresse mail ${email} n'existe pas dans notre université. Conseil : utilisez une adresse mail personnelle.`
    } else if (r.internal[idAttr] === v[idAttr]) {
        throw `Votre propre adresse mail n'est pas autorisée comme email personnel.`
    }    
    return Promise.resolve({ v });
}