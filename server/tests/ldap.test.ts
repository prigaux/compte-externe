'use strict';

import _ = require('lodash');
import assert = require('assert');
import test_ldap = require('./test_ldap');
require('../helpers');

describe('ldap', () => {
    let conf, ldap;

    before(() => (
	test_ldap().then_spread((_conf_, _ldap_) => {
	    conf = _conf_;
	    ldap = _ldap_;
	})
    ));

    describe('simple search', () => {

	it("should handle read", () => (
	    ldap.search("uid=prigaux," + conf.ldap.base_people, null, {}).then(l => {
		assert.equal(l.length, 1);
		assert.equal(l[0].sn, "rigaux");
	    })
	));

	it("should handle simple equality filter", () => (
	    ldap.search(conf.ldap.base_people, "(sn=Rigaux)", {}).then(l => {
		assert.equal(l.length, 4);
		assert.deepEqual(_.pluck(l, 'sn'), ["rigaux","rigaux","rigaux","rigaux"]);
	    })
	));

    });
});
