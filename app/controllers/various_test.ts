'use strict';

describe('controller various', function() {

  beforeEach(module('myApp'));

  describe('create controller', function(){

    it('should create EmptyCtrl', inject(function($controller) {
      var ctrl = $controller('EmptyCtrl');
      expect(ctrl).toBeDefined();
    }));

  });
});
