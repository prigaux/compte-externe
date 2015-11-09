'use strict';

import _ = require('lodash');
import mail = require('../mail');
import ldap = require('../ldap');
import utils = require('../utils');
import search_ldap = require('../search_ldap');
import esup_activ_bo = require('../esup_activ_bo');
import conf = require('../conf');
const filters = ldap.filters;

export function getShibAttrs(req, _sv) {
    let v = _.mapValues(conf.shibboleth.header_map, headerName => (
	req.header(headerName)
    ));
    console.log("action getShibAttrs:", v);
    return Promise.resolve({ v: v });
}

export const getCasAttrs = (req, _sv) => (
    getShibAttrs(req, _sv).then(sv => {
	let filter = filters.eq("eduPersonPrincipalName", sv.v.eduPersonPrincipalName);
	return ldap.searchOne(conf.ldap.base_people, filter, { attributes: ["supannAliasLogin", "displayName"] });
    }).then(v => {
	console.log("getCasAttrs", v);
	return { v: v };
    })
);

export const chain = l_actions => (
    (req, sv) => {
	if (!sv || !sv.then) sv = Promise.resolve(sv);
	l_actions.forEach(action => {
	    sv = sv.then(sv => (
		action(req, sv)
	    ));
	});
	return sv;
    }
);

export const createCompte = (req, sv) => {
    let v = sv.v;
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
	    mail.sendWithTemplate('warn_user_account_created.html', { to: v.supannMailPerso, v: v });
	}
	if (v.userPassword) {
	    esup_activ_bo.setPassword(v.uid, v.userPassword);
	}
	return { v: v, response: {login: v.supannAliasLogin} };
    });
};

export const genLogin = (req, sv) => (
    search_ldap.genLogin(sv.v.sn, sv.v.givenName).then(login => {
	let v = _.assign({ supannAliasLogin: login }, sv.v);
	return { v: v, response: {login: login} };
    })
);

export const sendValidationEmail = (req, sv) => {
    let v = sv.v;
    console.log("action sendValidationEmail");
    mail.sendWithTemplate('validation.html', { conf: conf, to: v.supannMailPerso, id: sv.id, v: v });
    return Promise.resolve({ v: v });
};
