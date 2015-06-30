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
})

.directive('allowedChars', function() {
  return {
    require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
	  var name = attrs.name;
	  var allowedChars = attrs.allowedChars;
	  ctrl.$validators.allowedChars = function(modelValue, viewValue) {
	      var errChars = (viewValue || '').replace(new RegExp(allowedChars, "g"), '');
	      var ok = errChars === '';
	      if (scope.errorMessages) {
		  if (!scope.errorMessages[name]) scope.errorMessages[name] = {};
		  scope.errorMessages[name].allowedChars = ok ? undefined : { forbiddenChars: errChars };
	      }
	      return ok;
	  };
    }
  };
});
