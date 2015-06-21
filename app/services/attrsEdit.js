'use strict';

angular.module('myApp')

.service("attrsEdit", function(ws) {
    this.manager = function($scope, id, expectedStep, nextStep) {
	$scope.maxYear = new Date().getUTCFullYear();

	ws.getInScope($scope, id, expectedStep);

	$scope.structures_search = ws.structures_search;

	$scope.submit = function () {
	    //if (!$scope.myForm.$valid) return;
	    ws.set(id, $scope.v).then(nextStep);
	};
	$scope.reject = function () {
	    ws.delete(id).then(nextStep);
	};
    };
});
