class AttrsEditService {
 constructor(private helpers, private ws, private conf) {
 }

 manager($scope, id, expectedStep, nextStep) {
	$scope.label = this.conf.attr_labels;
	$scope.attr_formatting = this.conf.attr_formatting;
	var accentsRange = '\u00C0-\u00FC';
	$scope.allowedCharsInNames = "[A-Za-z" + accentsRange + "'. -]";
	$scope.passwordPattern = /(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z]).{8,}/;
	$scope.maxDay = 31;
	$scope.maxYear = new Date().getUTCFullYear();

	var month2maxDay = [ undefined,
			     31,29,31,30,31,30,
			     31, // july
			     31,30,31,30,31 ];
	$scope.$watch('v.birthDay.month', (month) => {
	    $scope.maxDay = month2maxDay[month] || 31;
	});

	$scope.$watch('v.homePostalAddress.postalCode', (postalCode) => {
	    if (!postalCode) return;	    
	    var address = $scope.v && $scope.v.homePostalAddress;
	    if (address && !address.town) {
		this.helpers.frenchPostalCodeToTowns(postalCode).then((towns) => {
		    if (!address.town && towns && towns.length === 1) {
			address.town = towns[0];
		    }
		});
	    }
	});

	this.ws.getInScope($scope, id, expectedStep);

	$scope.structures_search = this.ws.structures_search;
	$scope.frenchPostalCodeToTowns = this.helpers.frenchPostalCodeToTowns;

	$scope.errorMessages = {};
	
	$scope.submit = () => {
	    //if (!$scope.myForm.$valid) return;
	    this.ws.set(id, $scope.v).then(nextStep);
	};
	$scope.reject = () => {
	    this.ws.delete(id).then(nextStep);
	};
 };
}

angular.module('myApp').service("attrsEdit", AttrsEditService);
