'use strict';

angular.module('myApp')

.directive('phone', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
	ctrl.$validators.phone = function(modelValue, viewValue) {
	    var val = viewValue && viewValue.replace(/\s/g, '');
	    return /[0-9]{10}/.test(val);
	};
    }
  };
});
