import { assert } from 'chai';
import * as Helpers from '@/services/helpers';
import * as JsDiff from 'diff';

describe('service helpers', function() {

    describe('formatDifferences', function() {

        let diff = function (val1, val2) {
            return Helpers.formatDifferences(val1, val2, JsDiff);
        };
        
        it('should handle same value', () => {
            assert.deepEqual(diff("foo", "foo"), ['foo', 'foo']);
        });
        
        it('should handle different value', () => {
            assert.deepEqual(diff("foo", "bar"), ['<ins>foo</ins>', '<ins>bar</ins>']);
        });
        
        it('should handle nearly same value', () => {
            assert.deepEqual(diff("foo", "Foo"), ['Foo', 'Foo']);
            assert.deepEqual(diff("foo", "Fooo"), ['Foo', 'Foo<ins>o</ins>']);
            assert.deepEqual(diff("foo", "fooo"), ['foo', 'foo<ins>o</ins>']);
        });
        
    });

    describe('checkLuhn', function() {

        let validSirets = ['19911101400015', '19931238000017', '19751718800011', '19751721200019', '19781944400013', '19751719600014', '18004312700067', '19131842700017', '19931827000014', '19932056500492' ];

        it('should work', () => {
            assert.equal(Helpers.checkLuhn("12345678901234"), false);

            assert.equal(Helpers.checkLuhn("484 404 132"), true);

            assert.equal(Helpers.checkLuhn("484 404 132 00025"), true);
            assert.equal(Helpers.checkLuhn("484 404 132 00026"), false);

            assert.equal(Helpers.checkLuhn("484 404 132"), true);

            for (let siret of validSirets) {
                assert.equal(Helpers.checkLuhn(siret), true, "for siret " + siret);
            }
        });
        
        
    });

    describe('to_csv', function() {

        it('should handle simple values', () => {
            assert.equal(Helpers.to_csv([{ foo: "Foo1" }], { foo: { title: "Foo" } }), "Foo\r\nFoo1");
            assert.equal(Helpers.to_csv([{ foo: "Foo 1" }], { foo: { title: "Foo" } }), "Foo\r\nFoo 1");
            assert.equal(Helpers.to_csv([{ foo: "Foo1" }, { foo: "Foo2" }], { foo: { title: "Foo" } }), "Foo\r\nFoo1\r\nFoo2");
            assert.equal(Helpers.to_csv([{ foo: "Foo1", bar: "Bar1" }], { foo: { title: "Foo" }, bar: { title: "Bar" } }), "Foo,Bar\r\nFoo1,Bar1");
        })
        it('should handle missing values', () => {
            assert.equal(Helpers.to_csv([{ foo: "Foo1" }], { foo: { title: "Foo" }, bar: { title: "Bar" } }), "Foo,Bar\r\nFoo1,");
        })
        it('should handle complex strings', () => {
            assert.equal(Helpers.to_csv([{ foo: `Foo"\n,Bar` }], { foo: { title: "Foo" } }), `Foo\r\n"Foo""\n,Bar"`);
        })
        it('should handle numbers', () => {
            assert.equal(Helpers.to_csv([{ foo: 12345 }], { foo: { title: "Foo" } }), "Foo\r\n12345");
        })
        it('should handle dates', () => {
            assert.equal(Helpers.to_csv([{ foo: new Date("2020-01-31") }], { foo: { title: "Foo" } }), "Foo\r\n2020-01-31");
        })
        it('should handle special cases', () => {
            assert.equal(Helpers.to_csv([], { foo: { title: "Foo" } }), "Foo");
        })
        it('should handle oneOf', () => {
            assert.equal(Helpers.to_csv([{ foo: "foo1" }], { foo: { oneOf: [ { const: "foo1", title: "Foo1" } ], title: "Foo" } }), "Foo\r\nFoo1");
        })
    })

    describe('to_absolute_date', function() {
        it('should handle xxD', () => {
            assert.deepEqual(Helpers.compute_absolute_date('+0D', new Date("2020-01-01")), new Date("2020-01-01"))
            assert.deepEqual(Helpers.compute_absolute_date('+1D', new Date("2020-01-01")), new Date("2020-01-02"))
            assert.deepEqual(Helpers.compute_absolute_date('-1D', new Date("2020-01-01")), new Date("2019-12-31"))
        })
        it('should handle xxY', () => {
            assert.deepEqual(Helpers.compute_absolute_date('+0Y', new Date("2020-01-01")), new Date("2020-01-01"))
            assert.deepEqual(Helpers.compute_absolute_date('+1Y', new Date("2020-01-01")), new Date("2021-01-01"))
            assert.deepEqual(Helpers.compute_absolute_date('-1Y', new Date("2020-01-01")), new Date("2019-01-01"))
        })
        it('should handle xxEY', () => {
            assert.deepEqual(Helpers.compute_absolute_date('+0EY', new Date("2020-01-01")), new Date("2020-12-31"))
            assert.deepEqual(Helpers.compute_absolute_date('+0EY', new Date("2020-12-31")), new Date("2020-12-31"))
            assert.deepEqual(Helpers.compute_absolute_date('+1EY', new Date("2020-01-01")), new Date("2021-12-31"))
            assert.deepEqual(Helpers.compute_absolute_date('-1EY', new Date("2020-01-01")), new Date("2019-12-31"))
        })
        it('should handle xxSY', () => {
            assert.deepEqual(Helpers.compute_absolute_date('-0SY', new Date("2020-01-01")), new Date("2019-01-01")) // to fix?
            assert.deepEqual(Helpers.compute_absolute_date('-0SY', new Date("2020-01-02")), new Date("2020-01-01"))
            assert.deepEqual(Helpers.compute_absolute_date('-1SY', new Date("2020-01-02")), new Date("2019-01-01"))
            assert.deepEqual(Helpers.compute_absolute_date('+1SY', new Date("2020-01-02")), new Date("2021-01-01"))
        })
    })
});
