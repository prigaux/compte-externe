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

        it("should handle attr remap & conversion", () => {
            let attrTypes = {sn: '', birthDay: new Date()}
            let attrRemap = { birthDay: 'up1BirthDay' }
            let f = ldap.read
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrRemap).then(e => {
                assert.equal(e.sn, "rigaux");
                assert.equal(e.birthDay.toISOString(), new Date('1975-10-02').toISOString());                
                assert.equal(ldap.convert.to.datetime(e.birthDay), '19751002000000Z');

                let rawLdapValue = ldap.convertToLdap(attrTypes, attrRemap, e);
                assert.deepEqual(rawLdapValue, { sn: "rigaux", up1BirthDay: '19751002000000Z', dn: 'uid=prigaux, ou=people, dc=univ, dc=fr' });
            })
        });
        

    });
});
