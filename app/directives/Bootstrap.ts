'use strict';

angular.module('myApp')

.directive("myHasError", function() {
    return {
	restrict: 'A',
	transclude: true,
	template: function(element, attrs) {
	    // cleanup element:
	    element.removeAttr('my-has-error');

	    var name = attrs.myHasError;    
	    return "<div ng-class=\"{'has-error': submitted && myForm." + name + ".$invalid}\" ng-transclude></div>";    
        }
    };
})

.directive("myErrorMsgs", function() {
    return {
	restrict: 'A',
	transclude: true,
	template: function(element, attrs) {
	    // cleanup element:
	    element.removeAttr('my-error-msgs');

	    var name = attrs.myErrorMsgs;    
	    var error_msgs = '<div ng-messages="myForm.' + name + '.$error" ng-if="submitted">' +
		'<div ng-messages-include="form-errors"></div>' +
		'</div>';
	    var error_msgs2 = '<div ng-repeat="err in [errorMessages.' + name + ']" ng-if="submitted">' +
		'<div ng-include="\'templates/form-errors-custom.html\'"></div>' +
		'</div>';
	    return "<div><div ng-transclude></div>" + error_msgs + error_msgs2 + "</div>";    
        }
    };
})

.directive("myBootstrapFormGroup", function() {
    return {
	restrict: 'A',
        transclude: true,
	template: function(element, attrs) {
	    var name = attrs.myBootstrapFormGroup;
	    // cleanup element:
	    element.removeAttr('my-bootstrap-form-group');
	    element.removeAttr('label');
	    element.removeAttr('multi');
	    element.addClass("form-group");
	    var mayHasErrorAttr = name && !attrs.multi ? "my-has-error='" + name + "'" : '';
	    var error_msgs = name && !attrs.multi ? "my-error-msgs='" + name + "'" : '';
	    var label = attrs.label ? '<label class="col-md-3 control-label" for="' + name + '">' + attrs.label + '</label>' : '';
	    var subClass = (attrs.label || attrs.multi ? '' : 'col-md-offset-3') + ' ' + (attrs.multi ? '' : 'col-md-9');
	    var sub = '<div class="' + subClass + '" ' + error_msgs + '><div ng-transclude></div></div>';
	    return "<div " + mayHasErrorAttr + ">" + label + sub + "</div>";
        }
    };
})

.directive("formControl", function() {
    return {
	restrict: 'A',
	require: 'ngModel', // controller to be passed into directive linking function
	link: function (scope, elem, attr, ctrl) {
	    elem.addClass("form-control");
	    elem.attr('id', attr['name']);
        }
    };
});
