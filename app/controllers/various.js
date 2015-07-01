'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'templates/welcome.html',
    controller: 'EmptyCtrl'
  }).when('/awaiting-email-validation', {
    templateUrl: 'templates/awaiting-email-validation.html',
    controller: 'EmptyCtrl'
  }).when('/awaiting-moderation/:id', {
    templateUrl: 'templates/awaiting-moderation.html',
    controller: 'IdCtrl'
  });

}])

.controller('EmptyCtrl', function() {
})

.controller('IdCtrl', function($scope, $routeParams) {
    $scope.id = $routeParams.id;
});
