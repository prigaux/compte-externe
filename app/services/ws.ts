'use strict';

angular.module('myApp')

.service("ws", function($http, $q) {

    var ws = this;

    this.structures_search = function (token, maxRows) {
	return $http.get('/api/structures', {params: {token: token, maxRows: maxRows}}).then(function (resp) {
	    return resp.data;
	});
    };

    function padLeft(n, width) {
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
    }

    var date_toString = function() {
	return [ padLeft(this.day, '2'), padLeft(this.month, '2'), padLeft(this.year, '4') ].join('/');
    };
    function fromJSONDate(date) {
	var d = new Date(date);
	return d && { year: d.getUTCFullYear(), month: 1 + d.getUTCMonth(), day: d.getUTCDate(), toString: date_toString };
    }
    function fromLDAPDate(date) {
	var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
	return m && { year: parseInt(m[1]), month: parseInt(m[2]), day: parseInt(m[3]),
		      toString: date_toString };
    }
    function toJSONDate(date) {
	return new Date(Date.UTC(date.year, date.month - 1, date.day));
    }
    function fromHomePostalAddress(addr) {
	var m = addr.match(/(.*)\$(.*)\$(.*)/);
	if (!m) return { line1: addr };
	var m1 = m[1].match(/(.*)\$(.*)/);
	var m2 = m[2].match(/(\d+) (.*)/);
	return { postalCode: m2[1], town: m2[2], country: m[3], line1: m1 ? m1[1]: m[1], line2: m1 ? m1[2] : '' };
    }
    function toHomePostalAddress(addr) {
	if (!addr.postalCode && !addr.town) return undefined;
	return addr.line1 + (addr.line2 ? "$" + addr.line2 : '') + "$" + addr.postalCode + " " + addr.town + "$" + (addr.country || 'FRANCE');
    }
    ws.fromWs = function(v) {
	//v.birthDay = "19751002000000Z"; //"1975-10-02";
	if (v.birthDay) {
	    v.birthDay = fromLDAPDate(v.birthDay) || fromJSONDate(v.birthDay) || {};
	} else {
	    v.birthDay = {};
	}
	if (v.homePostalAddress) {
	    v.homePostalAddress = fromHomePostalAddress(v.homePostalAddress);
	} else {
	    v.homePostalAddress = {};
	}
	if (v.structureParrain) {
	    ws.structures_search(v.structureParrain, 1).then(function (resp) {
		v.structureParrainS = resp[0];
	    });
	}
	return v;
    };

    ws.toWs = function(v) {
	v = angular.copy(v);
	v.birthDay = toJSONDate(v.birthDay);
	v.homePostalAddress = toHomePostalAddress(v.homePostalAddress);
	if (v.structureParrainS) {
	    v.structureParrain = v.structureParrainS.key;
	    delete v.structureParrainS;
	}
	return v;
    };
    
    function handleErr(resp) {
	var err = resp.data;
	console.error(err);
	alert(err);
	return $q.reject(err);
    }

    this.getInScope = function ($scope, id, expectedStep) {
	var url = '/api/comptes/' + id;
	return $http.get(url).then(function (resp) {
	    var sv = resp.data;
	    if (sv.error) {
		console.error("error accessing ", url, ":", sv.error, sv.stack);
		alert(sv.error);
	    } else {
		if (expectedStep && sv.step !== expectedStep) alert("expecting " + expectedStep + " got " + sv.step);
		if (sv.v) sv.v = ws.fromWs(sv.v);
		sv.modifyTimestamp = fromJSONDate(sv.modifyTimestamp);
		angular.extend($scope, sv);
	    }
	}, handleErr);
    };

    this.listInScope = function($scope, params) {
	return $http.get('/api/comptes', { params: params }).then(function (resp) {
	    if ($scope.$$destroyed) return;
	    var svs = resp.data;
	    if (svs.error) {
		$scope.err = svs;
	    } else {
		$scope.svs = svs;
	    }
	}, function (resp) {
	    var err = resp.data;
	    if (!$scope.$$destroyed) alert(err);
	    return $q.reject(err);
	});
    };

    this.homonymes = function(id, params) {
	return $http.get('/api/homonymes/' + id).then(function (resp) {
	    return resp.data.map(ws.fromWs);
	}, handleErr);
    };

    this.set = function(id, v) {
	var url = '/api/comptes/' + id;
	v = ws.toWs(v);
	return $http.put(url, v).then(function (resp) {
	    return resp.data;
	}, handleErr);
    };

    this.delete = function(id) {
	var url = '/api/comptes/' + id;
	return $http.delete(url).then(function (resp) {
	    return resp.data;
	}, handleErr);
    };

});
