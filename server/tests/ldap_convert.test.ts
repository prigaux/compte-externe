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
