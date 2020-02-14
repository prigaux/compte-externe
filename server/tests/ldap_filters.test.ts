import { assert } from './test_utils';
import { filters } from '../ldap';

describe('ldap filters', () => {
    describe('eq', () => {
        it("should escape", () => {
            assert.equal(filters.eq("a", "* b"), "(a=\\2a b)");
            assert.equal(filters.eq("a", "(b=c)"), "(a=\\28b=c\\29)");

            // https://www.owasp.org/index.php/Testing_for_LDAP_Injection_(OTG-INPVAL-006)
            const user = '*)(uid=*))(|(uid=*';
            const base64 = 'xxx';
            assert.equal(filters.and([ filters.eq("uid", user), filters.eq('userPassword', "{MD5}" + base64) ]),
                         "(&(uid=\\2a\\29\\28uid=\\2a\\29\\29\\28|\\28uid=\\2a)(userPassword={MD5}xxx))");
        });

    });

    describe('alike_same_accents', () => {
        it("should not escape *", () => {
            assert.equal(filters.alike_same_accents("a", "*b"), "(a=*b)");
        });
        it("should not need escape", () => {
            assert.equal(filters.alike_same_accents("a", "(b=c)\\"), "(a=*b*c*)");
        });
    });

    describe('fuzzy', () => {
        it("should work handle simple long token", () => {
            assert.equal(filters.fuzzy(["a"], "abcd"), "(a=*abcd*)")
        })
        it("should work handle one char token", () => {
            assert.equal(filters.fuzzy(["a"], "a"), "(a=a)")
        })
        it("should work handle two/three char token", () => {
            assert.equal(filters.fuzzy(["a"], "ab"), "(|(a=ab*)(a=*ab))")
        })
        it("should work handle accents", () => {
            assert.equal(filters.fuzzy(["a"], "éternel"), "(|(a=*éternel*)(a=*eternel*))")
            assert.equal(filters.fuzzy(["a"], "soleil éternel"), "(&(a=*soleil*)(|(a=*éternel*)(a=*eternel*)))")
        })
    })

    describe('fuzzy_prefixedAttrs', () => {
        it("should work handle simple long token", () => {
            assert.equal(filters.fuzzy_prefixedAttrs({ a: "{FOO}"}, "abcd"), "(a={FOO}*abcd*)")
        })
        it("should work handle one char token", () => {
            assert.equal(filters.fuzzy_prefixedAttrs({ a: "{FOO}" }, "a"), "(a={FOO}a)")
        })
        it("should work handle two/three char token", () => {
            assert.equal(filters.fuzzy_prefixedAttrs({ a: "{FOO}" }, "ab"), "(|(a={FOO}ab*)(a={FOO}*ab))")
        })
    })

});
