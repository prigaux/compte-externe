'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/created', {
    templateUrl: 'templates/created-quit.html',
    controller: 'EmptyCtrl'
  }).when('/', {
    templateUrl: 'templates/welcome.html',
    controller: 'EmptyCtrl'
  }).when('/awaiting-email-validation', {
    templateUrl: 'templates/awaiting-email-validation.html',
    controller: 'EmptyCtrl'
  });

}])

.controller('EmptyCtrl', function() {
});
