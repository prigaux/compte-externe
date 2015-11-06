'use strict';

angular.module('myApp')

.directive('autoFocus', function($timeout : ng.ITimeoutService) {
    return {
        link: {
            post: function postLink(scope, elem, attrs) {
                $timeout(function () {
		    elem[0].focus();
		});
            }
        }
    };
});
