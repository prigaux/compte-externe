'use strict';

var _ = require('lodash');
var assert = require('assert');
var test_ldap = require('./test_ldap');
require('../helpers');

describe('ldap', function () {
    var conf, ldap;

    before(function () {
	return test_ldap().then_spread(function (_conf_, _ldap_) {
	    conf = _conf_;
	    ldap = _ldap_;
	});
    });

    describe('simple search', function() {

	it("should handle read", function () {
	    return ldap.search("uid=prigaux," + conf.ldap.base_people, null, {}).then(function (l) {
		assert.equal(l.length, 1);
		assert.equal(l[0].sn, "rigaux");
	    });
	});

	it("should handle simple equality filter", function () {
	    return ldap.search(conf.ldap.base_people, "(sn=Rigaux)", {}).then(function (l) {
		assert.equal(l.length, 4);
		assert.deepEqual(_.pluck(l, 'sn'), ["rigaux","rigaux","rigaux","rigaux"]);
	    });
	});

    });
});
