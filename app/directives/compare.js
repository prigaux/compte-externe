'use strict';

angular.module('myApp')

.directive("compare", function() {
    function compare(val1, val2) {
	var diff = JsDiff.diffChars(val1, val2);
	var fragment1 = angular.element('<span>');
	var fragment2 = angular.element('<span>');
	for (var i=0; i < diff.length; i++) {
	    if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
		var swap = diff[i];
		diff[i] = diff[i + 1];
		diff[i + 1] = swap;
	    }

	    var node;
	    if (diff[i].removed) {
		fragment1.append(angular.element('<ins>').text(diff[i].value));
	    } else if (diff[i].added) {
		fragment2.append(angular.element('<ins>').text(diff[i].value));
	    } else {
		fragment1.append(document.createTextNode(diff[i].value));
		fragment2.append(document.createTextNode(diff[i].value));
	    }
	}
	return [fragment1, fragment2];
    }

    return {
	restrict: 'A',
	scope: {
	    compare: '=',
	    v2: '=',
	},
	link: function (scope, el, attr, ngModel) {
	    scope.$watch('compare', function (comparisons) {
		if (!comparisons) return;

		comparisons.forEach(function (vs) {
		    var r = compare(vs[0], vs[1]);
		    el.append(angular.element('<tr>')
				 .append(angular.element('<td>').append(r[0]))
				 .append(angular.element('<td>').append(r[1])));		    
		});
	    });
	},
    };
});
