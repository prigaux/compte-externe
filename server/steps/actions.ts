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
    let v = sv.v;
    if (!v) throw "internal error: createCompte with no v";
    console.log("action createCompte:", v);
    return utils.popen(JSON.stringify(v), 'createCompte', []).then(data => {
        try { 
            let resp = JSON.parse(data);
            if (!resp.uid) console.error("createCompte should return uid");
            if (!resp.supannAliasLogin) console.error("createCompte should return supannAliasLogin");
            v.uid = resp.uid;
            v.supannAliasLogin = resp.supannAliasLogin;
        } catch (e) { 
            throw "createCompte error:" + data;
        }
            
        if (v.supannMailPerso) {
            mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v });
        }
        if (v.userPassword) {
            esup_activ_bo.setPassword(v.uid, v.userPassword);
        }
        return { v, response: {login: v.supannAliasLogin} };
    });
};

export const genLogin: simpleAction = (req, sv) => (
    search_ldap.genLogin(sv.v.sn, sv.v.givenName).then(login => {
        let v = _.assign({ supannAliasLogin: login }, sv.v);
        return { v, response: {login} };
    })
);

export const sendValidationEmail: action = (req, sv) => {
    let v = sv.v;
    console.log("action sendValidationEmail");
    mail.sendWithTemplate('validation.html', { conf, v, to: v.supannMailPerso, id: sv.id });
    return Promise.resolve({ v });
};
