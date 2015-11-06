'use strict';

angular.module('myApp')

.service("attrsEdit", function(helpers, ws, conf) {
    this.manager = function($scope, id, expectedStep, nextStep) {
	$scope.label = conf.attr_labels;
	$scope.attr_formatting = conf.attr_formatting;
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

	$scope.$watch('v.homePostalAddress.postalCode', function (postalCode) {
	    if (!postalCode) return;	    
	    var address = $scope.v && $scope.v.homePostalAddress;
	    if (address && !address.town) {
		helpers.frenchPostalCodeToTowns(postalCode).then(function (towns) {
		    if (!address.town && towns && towns.length === 1) {
			address.town = towns[0];
		    }
		});
	    }
	});

	ws.getInScope($scope, id, expectedStep);

	$scope.structures_search = ws.structures_search;
	$scope.frenchPostalCodeToTowns = helpers.frenchPostalCodeToTowns;

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
