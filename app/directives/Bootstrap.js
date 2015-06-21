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
	    var label = attrs.label ? '<label class="col-md-3 control-label" for="' + name + '">' + attrs.label + '</label>' : '';
	    var subClass = (attrs.label ? '' : 'col-md-offset-3') + ' ' + (attrs.multi ? '' : 'col-md-9');
	    var sub = '<div class="' + subClass + '" ng-transclude></div>';
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
	    elem.attr('id', attr.name);
        }
    };
});
