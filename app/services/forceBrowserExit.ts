'use strict';

angular.module('myApp')

.service("forceBrowserExit", function($rootScope, $location, $cookies) {
    var cookieName = 'forceBrowserExit';
    
    return function(triggerUrl, forcedRoute) {
	$rootScope.$on("$routeChangeStart", function (event, next, current) {
	    if ($cookies.get(cookieName)) {
		$location.path(forcedRoute);
	    }
	});
	$rootScope.$on("$locationChangeSuccess", function (event, url) {
	    if (url.match(triggerUrl)) {
		console.log("forceBrowserExit!");
		$cookies.put(cookieName, true);
	    }
	});
    };
});
