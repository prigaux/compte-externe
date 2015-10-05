'use strict';

var _ = require('lodash');
var mail = require('../mail');
var ldap = require('../ldap');
var utils = require('../utils');
var search_ldap = require('../search_ldap');
var esup_activ_bo = require('../esup_activ_bo');
var conf = require('../conf');
var filters = ldap.filters;

function getShibAttrs(req, _sv) {
    var v = _.mapValues(conf.shibboleth.header_map, function (headerName) {
	return req.header(headerName);
    });
    console.log("action getShibAttrs:", v);
    return Promise.resolve({ v: v });
}
exports.getShibAttrs = getShibAttrs;

exports.getCasAttrs = function(req, _sv) {
    return getShibAttrs(req, _sv).then(function (sv) {
	var filter = filters.eq("eduPersonPrincipalName", sv.v.eduPersonPrincipalName);
	return ldap.searchOne(conf.ldap.base_people, filter, { attributes: ["supannAliasLogin", "displayName"] });
    }).then(function (v) {
	console.log("getCasAttrs", v);
	return { v: v };
    });
};

exports.chain = function (l_actions) {
    return function(req, sv) {
	if (!sv || !sv.then) sv = Promise.resolve(sv);
	l_actions.forEach(function (action) {
	    sv = sv.then(function (sv) {
		return action(req, sv);
	    });
	});
	return sv;
    };
};

exports.createCompte = function(req, sv) {
    var v = sv.v;
    console.log("action createCompte:", v);
    return utils.popen(JSON.stringify(v), 'createCompte', []).then(function (data) {
	try { 
	    var resp = JSON.parse(data);
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

exports.genLogin = function (req, sv) {
    return search_ldap.genLogin(sv.v.sn, sv.v.givenName).then(function (login) {
	var v = _.assign({ supannAliasLogin: login }, sv.v);
	return { v: v, response: {login: login} };
    });
};

exports.sendValidationEmail = function(req, sv) {
    var v = sv.v;
    console.log("action sendValidationEmail");
    mail.sendWithTemplate('validation.html', { conf: conf, to: v.supannMailPerso, id: sv.id, v: v });
    return Promise.resolve({ v: v });
};
