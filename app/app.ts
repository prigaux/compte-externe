/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/angularjs/angular-cookies.d.ts" />
/// <reference path="../typings/diff/diff.d.ts" />

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngMessages',
  'ngRoute',
  'ngCookies',
  'ui.bootstrap',
]).
service("conf", function($window) {
    angular.extend(this, $window.conf);
}).
config(['$locationProvider', function($locationProvider) {
    // use the HTML5 History API
    $locationProvider.html5Mode(true);
}]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/'});
}]);