'use strict';

describe("directive password-strength", function() {

    beforeEach(angular.mock.module('myApp'));

    var compile, rootScope;
    
    beforeEach(inject(function($compile, $rootScope) {
	compile = $compile;
	rootScope = $rootScope;
    }));

    function strength(password) {
	var scope = rootScope.$new();
	var element = compile('<div password-strength="v" ></div>')(scope);
	scope.v = password;
	scope.$digest();
	return element;
    }

    function check(element, wantedMsg, wantedColor, wantedWidth) {
	var l = element.children();
	var msg = angular.element(l[0]);
	var bar = angular.element(l[1]);
	expect(msg.html()).toBe(wantedMsg);
	expect(msg.css('color')).toBe(wantedColor);
	expect(bar.css('background-color')).toBe(wantedColor);
	expect(bar.css('width')).toBe(wantedWidth + 'px');
    }
    
    it("should work on very weak password", function() {
	check(strength("a"), 'Très faible', 'red', 20);
    });
    
    it("should work on medium password", function() {
	check(strength("zZ!0"), 'Moyen', 'orange', 125);
    });
       
    it("should work on same digit password", function() {
	check(strength("9999999999999999999"), 'Fort', 'rgb(59, 206, 8)', 140);
    });
    
    it("should work on strong password", function() {
	check(strength("zZ!0zZ!0"), 'Fort', 'rgb(59, 206, 8)', 195);
    });
    
    it("should work on very strong password", function() {
	check(strength("zZ!0zZ!0.............."), 'Très fort', 'rgb(59, 206, 8)', 225);
    });
    
    it("should work on md5 password", function() {
	check(strength("ace39d110acc31299c81b3bae651082a"), 'Fort', "rgb(59, 206, 8)", 155);
    });

});
