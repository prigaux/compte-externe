'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/validate/:id', {
    templateUrl: 'templates/validate.html',
    controller: 'ValidateCtrl'
  });
}])

.controller('ValidateCtrl', function($http: ng.IHttpService, $location: ng.ILocationService, $scope, $routeParams) {
    var url = '/api/comptes/' + $routeParams.id;

    function set(v) {
	$http.put(url, v).success(function (resp: any) {
	    if (resp && resp.success) {
		$scope.finished = true;
	    }
	}).error(function (err) {
	    alert(err);
	});
    }

    $http.get(url).success(function (sv: SVRaw) {
	if (sv.error) {
	    alert(sv);
	} else {
	    set(sv.v);
	    
	}
    }).error(function (err) {
	alert(err);
    });
});
