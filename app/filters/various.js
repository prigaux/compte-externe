'use strict';

angular.module('myApp')

.filter('groupBy', function ($parse) {

    function memoize(func, hasher) {
	var memo = {};
	return function() {
	    var key = hasher.apply(this, arguments);
	    return key in memo ? memo[key] : (memo[key] = func.apply(this, arguments));
	};
    }
    
    function groupBy(items, getter) {
        var result = {};
	console.log("groupBy");
        items.forEach(function (elm) {
            var prop = getter(elm);    
            if(!result[prop]) result[prop] = [];
            result[prop].push(elm);
        });
        return result;
    }

    return memoize(function(items, field) {
	if (!items) return undefined;
        var getter = $parse(field);
        return groupBy(items, function(item) {
            return getter(item);
        });
    }, function(items) {
        return JSON.stringify(items);
    });
});
