'use strict';

angular.module('myApp')

.directive('sameAs', function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=sameAs"
        },
        link: function(scope, elm, attrs, ctrl) {
            ctrl.$validators.sameAs = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };
            scope.$watch("otherModelValue", function() {
                ctrl.$validate();
            });
        }
    };
})

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

.directive('frenchPostalCode', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
	ctrl.$validators.frenchPostalCode = function(modelValue, viewValue) {
	    var val = viewValue && viewValue.replace(/\s/g, '');
	    return /[0-9]{5}/.test(val);
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
