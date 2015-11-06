'use strict';

describe('service helpers', function() {

    beforeEach(angular.mock.module('myApp'));

    it('should exists', inject(function(helpers) {
      expect(helpers).toBeDefined();
    }));

    describe('formatDifferences', function(){

	var diff;
	
	beforeEach(inject(function(helpers, $sce) {
	    diff = function (val1, val2) {
		return helpers.formatDifferences(val1, val2).map($sce.getTrustedHtml);
	    };
	}));
	
	it('should handle same value', inject(function(helpers, $sce) {
	    expect(diff("foo", "foo")).toEqual(['foo', 'foo']);
	}));
	
	it('should handle different value', inject(function(helpers, $sce) {
	    expect(diff("foo", "bar")).toEqual(['<ins>foo</ins>', '<ins>bar</ins>']);
	}));
	
	it('should handle nearly same value', inject(function(helpers, $sce) {
	    expect(diff("foo", "Foo")).toEqual(['<ins>f</ins>oo', '<ins>F</ins>oo']);
	    expect(diff("foo", "fooo")).toEqual(['foo', 'foo<ins>o</ins>']);
	}));
	
    });
});
