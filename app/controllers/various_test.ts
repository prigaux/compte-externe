/// <reference path="../../typings/angularjs/angular-mocks.d.ts" />
/// <reference path="../../typings/jasmine/jasmine.d.ts" />

'use strict';

describe('controller various', function() {

  beforeEach(angular.mock.module('myApp'));

  describe('create controller', function(){

    it('should create EmptyCtrl', angular.mock.inject(function($controller) {
      var ctrl = $controller('EmptyCtrl');
      expect(ctrl).toBeDefined();
    }));

  });
});
