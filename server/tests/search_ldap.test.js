'use strict';

var _ = require('lodash');
var assert = require('assert');
var require_fresh = require('./test_utils').require_fresh;
var test_ldap = require('./test_ldap');

describe('genLogin', function() {
    
    describe('simple', function() {
	var search_ldap = require_fresh('../search_ldap');
	search_ldap.existLogin = function () { return Promise.resolve(false); };
	
	function check(sn, givenName, wantedLogin) {
	    return function () {
		return search_ldap.genLogin(sn, givenName).then(function (login) {
		    assert.equal(login, wantedLogin);
		});
	    };
	}

	it('should use sn', 
	   check("rigaux", "", "rigaux"));
	it('should need sn', 
	   check('', 'xxx', undefined));
	it('should use both sn & givenName', 
	   check('Rigaux', 'Pascal', "prigaux"));
	it('should use givenNames', 
	   check('Rigaux', 'Jean-Pierre', "jprigaux"));
	it('should truncate', 
	   check('Abcdefghijkl', 'Pascal', "pabcdefghi"));
	it('should remove accents', 
	   check('Éxxé', 'Édouard', "eexxe"));
	it('should handle spaces in sn', 
	   check('K. Le Guin', 'Ursula', "ukleguin"));
	it('should handle spaces in sn', 
	   check('Kroeber Le Guin', 'Ursula', "ukroeberle"));
	it('should handle dash in sn', 
	   check('Di-Lö', 'Pascal', "pdilo"));
	it('should remove quotes', 
	   check("D'Aa", 'Pascal', "pdaa"));
	it('should remove quotes', 
	   check("D' Aa", 'Pascal', "pdaa"));
	it('should remove quotes',
	   check("Bouvaist--Rigaux", 'Coline', "cbouvaistr"));

    });

    describe('handle existing', function() {
	var search_ldap = require_fresh('../search_ldap');
	var added = {};
	search_ldap.existLogin = function (s) {
	    return Promise.resolve(added[s]);
	};
	
	function iterate(sn, givenName, max) {
	    var iter = function (r) {
		return search_ldap.genLogin(sn, givenName).then(function (login) {
		    if (login && r.length < max) {
			added[login] = true;
			return iter(r.concat(login));
		    } else {
			return r;
		    }
		});
	    };
	    return iter([]);
	}

	function check(sn, givenName, max, wantedLogins) {
	    return function () {
		return iterate(sn, givenName, max).then(function (logins) {
		    assert.deepEqual(logins, wantedLogins);
		});
	    };
	}

	it('multiple no givenName', 
	    check('rigaux', '', 12, 
		  _.range(0, 12).map(function (n) { return "rigaux" + (n || ''); })));

	it('multiple',
	   check('rigaux', 'pascal', 10,
		 [ 'prigaux', 'parigaux', 'pasrigaux', 'pascrigaux', 'pascarigau', 'pascalriga',
		   'prigaux1', 'prigaux2', 'prigaux3', 'prigaux4' ]));

	it('multiple with givenNames', 
	   check('rigaux', 'jean-pierre', 10,
		 [ 'jprigaux', 'jepirigaux', 'jeapieriga', 'jeanpierri', 'jeanpierrr', 'jeanpierre',
		   'jprigaux1', 'jprigaux2', 'jprigaux3', 'jprigaux4' ]));
    });


    describe('use test ldap', function() {
	var search_ldap;
	before(function () {
	    return test_ldap().then(function () {
		search_ldap = require_fresh('../search_ldap');
	    });
	});
	
	function check(sn, givenName, wantedLogin) {
	    return function () {
		return search_ldap.genLogin(sn, givenName).then(function (login) {
		    assert.equal(login, wantedLogin);
		});
	    };
	}

	it('should not use first solution', 
	   check('Rigaux', 'Pascal', "parigaux"));

	it('should not use first&second solution', 
	   check('Rigaux', 'Ayme', "aymrigaux"));
       
    });
});
