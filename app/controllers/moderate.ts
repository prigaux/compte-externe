'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/moderate/:id', {
    templateUrl: 'templates/moderate.html',
    controller: 'ModerateCtrl'
  });
}])

.controller('ModerateCtrl', function($location : ng.ILocationService, attrsEdit : AttrsEditService, ws : WsService, helpers : HelpersService, $scope, $routeParams) {
    var id = $routeParams.id;

    function nextStep (resp) {
	if (resp.login && !resp.step) {
	    // user created
	    if ($scope.v.supannAliasLogin &&
		$scope.v.supannAliasLogin !== resp.login) {
		alert("L'utilisateur a été créé, mais avec l'identifiant « " + resp.login + "». Il faut prévenir l'utilisateur");
	    }
	}
	$location.path('/moderate');
    }

    function computeComparisons(homonyme) {		
	var r = [];
	angular.forEach($scope.v, function (val, attr) {
	    var val1 = ""+val;
	    var val2 = ""+homonyme[attr];
	    if (val1 !== val2) {
		r.push({ attr: attr, cmp: helpers.formatDifferences(val1, val2) });
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
