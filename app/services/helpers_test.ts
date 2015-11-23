'use strict';

describe('service helpers', function() {

    beforeEach(angular.mock.module('myApp'));

    it('should exists', inject((helpers) => {
      expect(helpers).toBeDefined();
    }));

    describe('formatDifferences', function(){

        var diff;
        
        beforeEach(inject((helpers: Helpers.T, $sce) => {
            diff = function (val1, val2) {
                return helpers.formatDifferences(val1, val2).map($sce.getTrustedHtml);
            };
        }));
        
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
