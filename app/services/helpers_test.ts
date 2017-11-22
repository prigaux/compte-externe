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
});
