import * as Helpers from './helpers';

describe('service helpers', function() {

    describe('formatDifferences', function(){

        let diff = function (val1, val2) {
            return Helpers.formatDifferences(val1, val2);
        };
        
        it('should handle same value', () => {
            expect(diff("foo", "foo")).toEqual(['foo', 'foo']);
        });
        
        it('should handle different value', () => {
            expect(diff("foo", "bar")).toEqual(['<ins>foo</ins>', '<ins>bar</ins>']);
        });
        
        it('should handle nearly same value', () => {
            expect(diff("foo", "Foo")).toEqual(['<ins>f</ins>oo', '<ins>F</ins>oo']);
            expect(diff("foo", "fooo")).toEqual(['foo', 'foo<ins>o</ins>']);
        });
        
    });

    describe('checkLuhn', function(){

        let validSirets = ['19911101400015', '19931238000017', '19751718800011', '19751721200019', '19781944400013', '19751719600014', '18004312700067', '19131842700017', '19931827000014', '19932056500492' ];

        it('should work', () => {
            expect(Helpers.checkLuhn("12345678901234")).toBeFalsy();

            expect(Helpers.checkLuhn("484 404 132")).toBeTruthy();

            expect(Helpers.checkLuhn("484 404 132 00025")).toBeTruthy();
            expect(Helpers.checkLuhn("484 404 132 00026")).toBeFalsy();

            expect(Helpers.checkLuhn("484 404 132")).toBeTruthy();

            for (let siret of validSirets) {
                expect(Helpers.checkLuhn(siret)).toBeTruthy("for siret " + siret);
            }
        });
        
        
    });

});
