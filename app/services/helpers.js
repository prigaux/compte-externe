'use strict';

angular.module('myApp')

.service("helpers", function($sce, $http, $q) {

    var h = this;
	
    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    h.escapeHtml = function(str) {
        return String(str).replace(/[&<>"'\/]/g, function (s) {
	    return entityMap[s];
        });
    };

    h.formatDifferences = function(val1, val2) {
	/* globals JsDiff */
	var diff = JsDiff.diffChars(val1, val2);
	var fragment1 = '';
	var fragment2 = '';
	for (var i=0; i < diff.length; i++) {
	    if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
		var swap = diff[i];
		diff[i] = diff[i + 1];
		diff[i + 1] = swap;
	    }

	    var txt = h.escapeHtml(diff[i].value);
	    if (diff[i].removed) {
		fragment1 += '<ins>' + txt + '</ins>';
	    } else if (diff[i].added) {
		fragment2 += '<ins>' + txt + '</ins>';
	    } else {
		fragment1 += txt;
		fragment2 += txt;
	    }
	}
	return [fragment1, fragment2].map($sce.trustAsHtml);
    };

    h.frenchPostalCodeToTowns = function (postalCode) {
	var big3 = { 13: "Marseille", 69: "Lyon", 75: "Paris" };
	var m = postalCode.match(/^(13|69|75)/);
	if (m) {
	    var town = big3[m[1]];
	    return $q.resolve([town]);
	}
	var url = 'http://api.geonames.org/postalCodeLookupJSON';
	var username = 'univp1';
	var params = { postalcode: postalCode, country: 'FR', username: username };
	return $http.get(url, { params: params }).then(function (r) {
	    var l = r.data && r.data.postalcodes;
	    return l && l.map(function (e) {
		return e.placeName;
	    });
	});
    };
});
