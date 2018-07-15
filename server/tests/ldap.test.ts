'use strict';

import { assert } from './test_utils';
import * as ldap_convert from '../ldap_convert';
import * as test_ldap from './test_ldap';
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
            ldap.searchSimple(conf.ldap.base_people, "(sn=rigaux)", {sn: ''}).then(l => {
                let sns = l.map(e => e.sn);
                assert.deepEqual(sns, ["rigaux", "rigaux", "rigaux", "rigaux"]);
            })
        ));

        it("should handle attr remap & conversion", () => {
            let attrTypes = {sn: '', birthDay: new Date()}
            let attrsConvert = { birthDay: { ldapAttr: 'up1BirthDay', convert: ldap_convert.datetime } }
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.equal(e.sn, "rigaux");
                assert.equal(e.birthDay.toISOString(), new Date('1975-10-02').toISOString());                
                assert.equal(ldap_convert.datetime.toLdap(e.birthDay), '19751002000000Z');

                let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
                assert.deepEqual(rawLdapValue, { sn: "rigaux", up1BirthDay: '19751002000000Z' });
            })
        });
    });

    describe("etiquette conversion", () => {

        it("should handle simple fromLdap", () => {
            assert.equal(ldap_convert.withEtiquette("{FOO}").fromLdapMulti(["{FOO}bar"]), "bar");
            assert.equal(ldap_convert.withEtiquette("{FOO}").fromLdapMulti(["{BAR}bar"]), null);
            assert.equal(ldap_convert.withEtiquette("{FOO}").fromLdapMulti(["xxx", "{FOO}bar"]), "bar");
        });
        
        let attrsConvert = { 
            idpId: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette('{SAML}') },
            mifare: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette('{MIFARE}') },
        };
        it("should convert toLdap", () => {
            let attrTypes = {idpId: ''}
            let e = { idpId: "https://univ-test.fr" }
            let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
            assert.deepEqual(rawLdapValue['supannEtablissement'], "{SAML}https://univ-test.fr");
        });
        it("should convert toLdap (complex)", () => {
            let attrTypes = {idpId: '', mifare: '', supannEtablissement: []}
            let e = { idpId: "https://univ-test.fr", mifare: 'mifare_id', supannEtablissement: ["{UAI}0751717J"] };
            let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
            assert.deepEqual(rawLdapValue['supannEtablissement'], ["{SAML}https://univ-test.fr", "{MIFARE}mifare_id", "{UAI}0751717J" ]);
        });
        it("should work with ldap.read (simple)", () => {
            let attrTypes = {idpId: ''}            
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.equal(e.idpId, "https://univ-test.fr");
                assert.equal("mifare" in e, false);

                let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
                assert.deepEqual(rawLdapValue['supannEtablissement'], "{SAML}https://univ-test.fr");
            });
        });
        it("should work with in ldap.read", () => {
            let attrTypes = {idpId: '', mifare: ''}
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.equal(e.idpId, "https://univ-test.fr");
                assert.equal(e.mifare, "mifare_id");
            });
        });
        it("should work with in ldap.read (complex)", () => {
            let attrTypes = {idpId: '', mifare: '', supannEtablissement: [], supannEtuAnneeInscription: [0]}
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.equal(e.idpId, "https://univ-test.fr");
                assert.equal(e.mifare, "mifare_id");
                assert.deepEqual(e.supannEtablissement, ["{UAI}0751717J", "{SAML}https://univ-test.fr", "{MIFARE}mifare_id"]);
                assert.deepEqual(e.supannEtuAnneeInscription, [2016, 2017]);
            });
        });
        

    });

    describe("up1Profile conversion", () => {
        let attrsConvert = { 
            global_profilename: { ldapAttr: 'up1Profile', convert: ldap_convert.up1Profile_field('up1Source') },
            up1Profile: { convert: ldap_convert.up1Profile },
            up1StartDate: { convert: ldap_convert.date },
            mifare: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{MIFARE}")  },
        };

        it("should work with ldap.read (simple)", () => {
            let attrTypes = { sn: '', eduPersonAffiliation: [], eduPersonPrimaryAffiliation: '', mifare: '', up1Profile: [], up1Source: '', up1StartDate: '' }
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.deepEqual(e, <any> {
                      eduPersonAffiliation: [ "member", "employee", "staff" ],
                      sn: "rigaux",
                      up1Profile: [ {
                          eduPersonAffiliation: [ "member", "employee", "staff" ],
                          eduPersonPrimaryAffiliation: "staff",
                          mifare: "803853C2593A04",
                          up1Source: "{HARPEGE}carriere",
                          up1StartDate: new Date('2011-09-15'),
                      }, {
                          eduPersonAffiliation: [ "employee", "member", "teacher" ],
                          eduPersonPrimaryAffiliation: "teacher",
                          mifare: "803853C2593A04",
                          sn: "Rigaux",
                          up1Source: "{COMPTEX}PLB.SC4",
                          up1StartDate: new Date('2017-12-16'),
                      } ],
                    }
              );
            });
        });
        it("should work with ldap.read & global_profilename", () => {
            let attrTypes = { global_profilename: [''] }
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.deepEqual(e, { global_profilename: [ "{HARPEGE}carriere", "{COMPTEX}PLB.SC4" ] });
            });
        });
    });

});
