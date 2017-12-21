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
