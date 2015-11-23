'use strict';

function CreateCtrl($location: ng.ILocationService, helpers: Helpers.T, $scope, $routeParams) {
    let kind = $routeParams.kind;
    
    let o = helpers.inject(AttrsEditController.create)($scope, { 
      id: 'new/' + kind, 
      expectedStep: kind, 
      nextStep,
    });

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
    
    return o;
}

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/create/:kind', {
    templateUrl: 'templates/create.html',
    controller: 'CreateCtrl'
  });
}])

.controller('CreateCtrl', CreateCtrl);
