'use strict';

import { assert } from './test_utils';
import * as ldap_convert from '../ldap_convert';

describe('ldap_convert', () => {
    describe('dn convert', () => {
        it ("should work", () => {
            let conv = ldap_convert.dn("ou", "dc=fr")
            assert.equal(conv.toLdap("foo"), "ou=foo,dc=fr");
            assert.equal(conv.fromLdap("ou=foo,dc=fr"), "foo");
            assert.equal(conv.fromLdap("ou=foo,"), undefined);
            assert.equal(conv.fromLdap("ou=foo,dc=fr,"), undefined);
        });
    });
});

describe('parse_composite', () => {
    it ("should work", () => {
        let check = (in_, wanted) => assert.deepEqual(ldap_convert.parse_composite(in_), wanted);
        check("[foo=bar]", { foo: "bar" });
        check("[role={SUPANN}D30][type={SUPANN}S230][code=DGH]", { role: '{SUPANN}D30', type: '{SUPANN}S230', code: 'DGH' })
    });        
});

const up1Profile_tests = [
    { s: '[a=aaa][b=b1;b2]', parsed: { a: [ 'aaa' ], b: [ 'b1', 'b2' ] } },
    { s: '[a=aaa][b=b1#3bb2]', parsed: { a: [ 'aaa' ], b: [ 'b1;b2' ] } },
    { s: '[a#3Ba=aaa]', parsed: { "a;a": [ 'aaa' ] } },
    { s: '[a=#09#09aaa]', parsed: { "a": [ '\t\taaa' ] } },
];

describe('parse_up1Profile', () => {
    it('should work', () => {
        up1Profile_tests.forEach(test => (
            assert.deepEqual(ldap_convert.up1Profile.fromLdapMulti([test.s]), [test.parsed])
        ));
    });
    it('should work with up1Profile_field', () => {
        assert.deepEqual(ldap_convert.up1Profile_field('a').fromLdapMulti(['[a=aaa]']), ['aaa'])
    });
});