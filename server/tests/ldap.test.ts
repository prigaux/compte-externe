'use strict';

import { assert } from './test_utils';
import * as ldap_convert from '../ldap_convert';
import * as test_ldap from './test_ldap';
require('../helpers');

import * as conf from '../conf'
import * as ldap from '../ldap'

describe('ldap', () => {

    before(() => test_ldap.create())
    after(() => test_ldap.stop())   
    
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

        it("should handle special dn attribute", async () => {
            await ldap.searchSimple(conf.ldap.base_people, "(uid=prigaux)", {}).then(l => {
                assert.deepEqual(l, [{}]);
            })
            await ldap.searchSimple(conf.ldap.base_people, "(uid=prigaux)", { dn: '' }).then(l => {
                assert.deepEqual(l, [{ dn: "uid=prigaux,ou=people,dc=univ,dc=fr" }]);
            })
        });

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

    describe('search', () => {
        it("should handle attr fallbackLdapAttrs", async () => {
            await ldap.search(conf.ldap.base_people, "(sn=rigaux)", { birthName: '' }, { birthName: { ldapAttr: 'up1BirthName', fallbackLdapAttrs: ['sn'] } }, {}).then(l => {
                let birthNames = l.map(e => e.birthName);
                assert.deepEqual(birthNames, ["Nomdavant", "rigaux", "rigaux", "rigaux"]);
            })
        })
    })

    describe('has_value conversion', () => {
        it("should convert toLdap", () => {
            let attrsConvert = { 
                'termsOfUse': { ldapAttr: 'up1TermsOfUse' },
                '{PHOTO}PUBLIC': { ldapAttr: 'up1TermsOfUse', convert: ldap_convert.has_value('{PHOTO}PUBLIC') },
                '{PHOTO}STUDENT': { ldapAttr: 'up1TermsOfUse', convert: ldap_convert.has_value('{PHOTO}STUDENT') },
            };
            function check(v: any, wanted_rawLdapValue: Dictionary<ldap_RawValue>) {
                let rawLdapValue = ldap.convertToLdap({ termsOfUse: [''] }, attrsConvert, v, {});
                assert.deepEqual(rawLdapValue, wanted_rawLdapValue);
            }
            check({ '{PHOTO}PUBLIC': '' }, {});
            check({ '{PHOTO}PUBLIC': true }, { up1TermsOfUse: "{PHOTO}PUBLIC" });
            check({ '{PHOTO}PUBLIC': true, '{PHOTO}STUDENT': true }, { up1TermsOfUse: [ "{PHOTO}PUBLIC", "{PHOTO}STUDENT" ] });
            check({ termsOfUse: [], '{PHOTO}STUDENT': true }, { up1TermsOfUse: [ "{PHOTO}STUDENT" ] });
            check({ termsOfUse: ['{PHOTO}STUDENT'], '{PHOTO}STUDENT': true }, { up1TermsOfUse: [ "{PHOTO}STUDENT" ] });
            check({ termsOfUse: ['{PHOTO}STUDENT'], '{PHOTO}STUDENT': '' }, { up1TermsOfUse: [] });
            check({ termsOfUse: ['{PHOTO}PUBLIC'], '{PHOTO}STUDENT': true }, { up1TermsOfUse: [ "{PHOTO}PUBLIC", "{PHOTO}STUDENT" ] });
        })
    })

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
            assert.deepEqual(rawLdapValue['supannEtablissement'], ["{SAML}https://univ-test.fr"]);
        });
        it("should convert toLdap (complex)", () => {
            let attrTypes = {idpId: '', mifare: '', supannEtablissement: ([] as string[])}
            let e = { idpId: "https://univ-test.fr", mifare: 'mifare_id', supannEtablissement: ["{UAI}0751717J"] };
            let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
            assert.deepEqual(rawLdapValue['supannEtablissement'], ["{SAML}https://univ-test.fr", "{MIFARE}mifare_id", "{UAI}0751717J" ]);
        });
        it("should convert toLdap (complex2)", () => {
            let attrTypes = {idpId: '', mifare: '', supannEtablissement: ([] as string[])}
            let e = { supannEtablissement: ["{UAI}0751717J", "{MIFARE}xxx"], idpId: "https://univ-test.fr", mifare: 'mifare_id' };
            let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
            assert.deepEqual(rawLdapValue['supannEtablissement'], ["{UAI}0751717J", "{SAML}https://univ-test.fr", "{MIFARE}mifare_id" ]);
        });
        it("should work with ldap.read (simple)", () => {
            let attrTypes = {idpId: ''}            
            return ldap.read("uid=prigaux," + conf.ldap.base_people, attrTypes, attrsConvert).then(e => {
                assert.equal(e.idpId, "https://univ-test.fr");
                assert.equal("mifare" in e, false);

                let rawLdapValue = ldap.convertToLdap(attrTypes, attrsConvert, e, {});
                assert.deepEqual(rawLdapValue['supannEtablissement'], ["{SAML}https://univ-test.fr"]);
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
            let attrTypes = {idpId: '', mifare: '', supannEtablissement: ([] as string[]), supannEtuAnneeInscription: [0]}
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
            // @ts-expect-error
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

describe('convertAttrToLdapFilter', () => {
    it('should work', () => {
        assert.equal(ldap.convertAttrToLdapFilter('attr1', { convert: ldap_convert.dn("ou", "dc=fr") }, 'foo'), '(attr1=ou=foo,dc=fr)')
        assert.equal(ldap.convertAttrToLdapFilter('ignored', { ldapAttr: 'attr1', convert: ldap_convert.withEtiquette('{FOO}') }, 'foo'), '(attr1={FOO}foo)')
    })
})