'use strict';

import _ = require('lodash');
import mail = require('../mail');
import ldap = require('../ldap');
import utils = require('../utils');
import search_ldap = require('../search_ldap');
import esup_activ_bo = require('../esup_activ_bo');
import conf = require('../conf');
const filters = ldap.filters;

export const getShibAttrs: simpleAction = (req, _sv) => {
    let v = _.mapValues(conf.shibboleth.header_map, headerName => (
        req.header(headerName)
    ));
    console.log("action getShibAttrs:", v);
    return Promise.resolve({ v });
};

export const getCasAttrs: simpleAction = (req, _sv) => (
    getShibAttrs(req, _sv).then(sv => {
        let filter = filters.eq("eduPersonPrincipalName", sv.v.eduPersonPrincipalName);
        return search_ldap.searchPeople(filter, ['supannAliasLogin', 'displayName'], {});
    }).then(vs => vs && vs[0]).then((v: v) => {
        v.autoCreate = true;
        return { v };
    })
);

export function chain(l_actions: simpleAction[]): action {
    return (req, sv_: sv) => {
        let sv: Promise<vr> = Promise.resolve(sv_);
        l_actions.forEach(action => {
            sv = sv.then(sv => (
                action(req, sv)
            ));
        });
        return sv;
    };
}

export const createCompte: simpleAction = (req, sv) => {
    if (!sv.v) throw "internal error: createCompte with no v";

    if (!sv.v.startdate) sv.v.startdate = new Date();
    if (!sv.v.enddate) sv.v.enddate = utils.addDays(sv.v.startdate, sv.v.duration);

    let v_ldap = ldap.convertToLdap(conf.types, conf.ldap.people, sv.v);
    delete v_ldap['userPassword']; // handled by esup_activ_bo

    return createCompteRaw(req, v_ldap).then(function (uid_and_login) {
        _.assign(sv.v, uid_and_login);
        let v = sv.v;
        if (v.supannMailPerso) {
            mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v });
        }
        if (v.userPassword) {
            esup_activ_bo.setPassword(v.uid, v.userPassword);
        }
        return { v, response: {login: v.supannAliasLogin} };
    });
};

const createCompteRaw = (req, v: Dictionary<ldap.RawValue>) => {
    let { profilename, priority, startdate, enddate, ...attrs } = v;
    
    let param = JSON.stringify({
        id: ["uid"], create: true, dupcreate: "ignore",
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
        if (resp.err && resp.err[0].attr === "supannAliasLogin") {
            // gasp, the generated supannAliasLogin is already in use,
            // retry without supannAliasLogin
            delete v['supannAliasLogin'];
            return createCompteRaw(req, v);
        }
            
        let m = resp.dn && resp.dn.match(/uid=(.*?),/);
        if (m) {
            let uid = m[1];
            return { uid, supannAliasLogin: v['supannAliasLogin'] || uid };
        } else {
            console.error("createCompte should return dn", resp);
        }
    });
}

export const genLogin: simpleAction = (req, sv) => (
    search_ldap.genLogin(sv.v.sn, sv.v.givenName).then(login => {
        let v = <v> _.assign({ supannAliasLogin: login }, sv.v);
        return { v, response: {login} };
    })
);

export const sendValidationEmail: action = (req, sv) => {
    let v = sv.v;
    console.log("action sendValidationEmail");
    mail.sendWithTemplate('validation.html', { conf, v, to: v.supannMailPerso, id: sv.id });
    return Promise.resolve({ v });
};
