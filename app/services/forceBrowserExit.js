'use strict';

angular.module('myApp')

.service("forceBrowserExit", function($rootScope, $location, $cookies) {
    var cookieName = 'forceBrowserExit';
    
    return function(triggerRoute, forcedRoute) {
	$rootScope.$on("$routeChangeStart", function (event, next, current) {
	    if ($cookies.get(cookieName)) {
		$location.path(forcedRoute);
	    } else {
		var route = next.$$route.originalPath;
		if (route.match(triggerRoute)) {
		    $cookies.put(cookieName, true);
		}
	    }
	});
    };
});
