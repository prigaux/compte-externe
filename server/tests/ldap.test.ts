'use strict';

import { assert } from './test_utils';
import test_ldap = require('./test_ldap');
require('../helpers');

describe('ldap', () => {
    let conf: test_ldap.conf;
    let ldap: test_ldap.ldap;

    before(() => (
        test_ldap.create().then((m) => {
            conf = m.conf;
            ldap = m.ldap;
        })
    ));

    describe('simple search', () => {

        it("should handle read", () => (
            ldap.read("uid=prigaux," + conf.ldap.base_people, {sn: ''}, null).then(e => {
                assert.equal(e.sn, "rigaux");
            })

        ));
        
        it("should handle read multiple attr", () => (
            ldap.searchThisAttr("uid=prigaux," + conf.ldap.base_people, null, "eduPersonAffiliation", ['']).then(l => {
                assert.deepEqual(l, [ [ 'member', 'employee', 'staff' ] ]);
            })
        ));

        it("should handle simple equality filter", () => (
            ldap.searchSimple(conf.ldap.base_people, "(sn=Rigaux)", {sn: ''}).then(l => {
                let sns = l.map(e => e.sn);
                assert.deepEqual(sns, ["rigaux", "rigaux", "rigaux", "rigaux"]);
            })
        ));

    });
});
