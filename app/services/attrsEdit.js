'use strict';

angular.module('myApp')

.service("attrsEdit", function(ws, conf) {
    this.manager = function($scope, id, expectedStep, nextStep) {
	$scope.label = conf.attr_labels;
	var accentsRange = '\u00C0-\u00FC';
	$scope.allowedCharsInNames = "[A-Za-z" + accentsRange + "'. -]";
	$scope.passwordPattern = /(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z]).{8,}/;
	$scope.maxDay = 31;
	$scope.maxYear = new Date().getUTCFullYear();

	var month2maxDay = [ undefined,
			     31,29,31,30,31,30,
			     31, // july
			     31,30,31,30,31 ];
	$scope.$watch('v.birthDay.month', function (month) {
	    $scope.maxDay = month2maxDay[month] || 31;
	});

	ws.getInScope($scope, id, expectedStep);

	$scope.structures_search = ws.structures_search;

	$scope.errorMessages = {};
	
	$scope.submit = function () {
	    //if (!$scope.myForm.$valid) return;
	    ws.set(id, $scope.v).then(nextStep);
	};
	$scope.reject = function () {
	    ws.delete(id).then(nextStep);
	};
    };
});
