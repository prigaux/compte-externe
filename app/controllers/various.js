'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'templates/welcome.html',
    controller: 'EmptyCtrl'
  }).when('/create', {
    templateUrl: 'templates/welcome-create.html',
    controller: 'EmptyCtrl'
  }).when('/created/:id', {
    templateUrl: 'templates/created.html',
    controller: 'IdCtrl'
  }).when('/awaiting-email-validation', {
    templateUrl: 'templates/awaiting-email-validation.html',
    controller: 'EmptyCtrl'
  }).when('/browser-exit', {
    templateUrl: 'templates/browser-exit.html',
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
