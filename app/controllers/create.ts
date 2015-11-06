'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/create/:kind', {
    templateUrl: 'templates/create.html',
    controller: 'CreateCtrl'
  });
}])

.controller('CreateCtrl', function($location, $scope, $routeParams, attrsEdit) {
    var kind = $routeParams.kind;
    var newId = 'new/' + kind;

    function nextStep(resp) {
	if (resp.step === 'validate_email') {
	    $location.path('/awaiting-email-validation');
	} else if (resp.login && !resp.step) {
	    $location.path('/created/' + resp.login);
	} else if (resp.login) {
	    $location.path('/awaiting-moderation/' + resp.login);
	} else {
	    // TODO need to pass by SP shib
	    //$location.path('/location');
	    $location.path('/');
	}
    }

    attrsEdit.manager($scope, newId, kind, nextStep);
});
