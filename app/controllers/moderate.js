'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/moderate/:id', {
    templateUrl: 'templates/moderate.html',
    controller: 'ModerateCtrl'
  });
}])

.controller('ModerateCtrl', function($location, $scope, $routeParams, attrsEdit, ws) {
    var id = $routeParams.id;

    function nextStep (resp) {
	$location.path('/moderate');
    }

    function computeComparisons(homonyme) {		
	var r = [];
	angular.forEach($scope.v, function (val, attr) {
	    var val1 = ""+val;
	    var val2 = ""+homonyme[attr];
	    if (val1 !== val2) {
		r.push([val1, val2]);
	    }
	});
	homonyme.comparisons = r;
    }

    $scope.$watchGroup(['v', 'homonymes'], function (l) {
	if (l[0] && l[1]) {
	    $scope.homonymes.forEach(computeComparisons);
	}
    });

    ws.homonymes(id).then(function (l) {
	$scope.homonymes = l;
    });

    attrsEdit.manager($scope, id, null, nextStep);
    
});
