function padLeft(n, width) {
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

function date_toString() {
return [ padLeft(this.day, '2'), padLeft(this.month, '2'), padLeft(this.year, '4') ].join('/');
}

class WsService {
 constructor(private $http : ng.IHttpService, private $q : ng.IQService) {
 }

  structures_search(token, maxRows) {
	return this.$http.get('/api/structures', {params: {token: token, maxRows: maxRows}}).then(function (resp) {
	    return resp.data;
	});
    }

    _fromJSONDate(date) {
	var d = new Date(date);
	return d && { year: d.getUTCFullYear(), month: 1 + d.getUTCMonth(), day: d.getUTCDate(), toString: date_toString };
    }
    _fromLDAPDate(date) {
	var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
	return m && { year: parseInt(m[1]), month: parseInt(m[2]), day: parseInt(m[3]),
		      toString: date_toString };
    }
    _toJSONDate(date) {
	return new Date(Date.UTC(date.year, date.month - 1, date.day));
    }
    fromHomePostalAddress(addr) {
	var m = addr.match(/(.*)\$(.*)\$(.*)/);
	if (!m) return { line1: addr };
	var m1 = m[1].match(/(.*)\$(.*)/);
	var m2 = m[2].match(/(\d+) (.*)/);
	return { postalCode: m2[1], town: m2[2], country: m[3], line1: m1 ? m1[1]: m[1], line2: m1 ? m1[2] : '' };
    }
    toHomePostalAddress(addr) {
	if (!addr.postalCode && !addr.town) return undefined;
	return addr.line1 + (addr.line2 ? "$" + addr.line2 : '') + "$" + addr.postalCode + " " + addr.town + "$" + (addr.country || 'FRANCE');
    }
    
    fromWs(v) {
	//v.birthDay = "19751002000000Z"; //"1975-10-02";
	if (v.birthDay) {
	    v.birthDay = this._fromLDAPDate(v.birthDay) || this._fromJSONDate(v.birthDay) || {};
	} else {
	    v.birthDay = {};
	}
	if (v.homePostalAddress) {
	    v.homePostalAddress = this.fromHomePostalAddress(v.homePostalAddress);
	} else {
	    v.homePostalAddress = {};
	}
	if (v.structureParrain) {
	    this.structures_search(v.structureParrain, 1).then(function (resp) {
		v.structureParrainS = resp[0];
	    });
	}
	return v;
    }

    toWs = function(v) {
	v = angular.copy(v);
	v.birthDay = this.toJSONDate(v.birthDay);
	v.homePostalAddress = this.toHomePostalAddress(v.homePostalAddress);
	if (v.structureParrainS) {
	    v.structureParrain = v.structureParrainS.key;
	    delete v.structureParrainS;
	}
	return v;
    }
    
    _handleErr(resp) {
	var err = resp.data;
	console.error(err);
	alert(err);
	return this.$q.reject(err);
    }

    getInScope($scope, id, expectedStep) {
	var url = '/api/comptes/' + id;
	return this.$http.get(url).then(function (resp) {
	    var sv = <any>resp.data;
	    if (sv.error) {
		console.error("error accessing ", url, ":", sv.error, sv.stack);
		alert(sv.error);
	    } else {
		if (expectedStep && sv.step !== expectedStep) alert("expecting " + expectedStep + " got " + sv.step);
		if (sv.v) sv.v = this.fromWs(sv.v);
		sv.modifyTimestamp = this.fromJSONDate(sv.modifyTimestamp);
		angular.extend($scope, sv);
	    }
	}, this._handleErr);
    }

    listInScope($scope, params) {
	return this.$http.get('/api/comptes', { params: params }).then(function (resp) {
	    if ($scope.$$destroyed) return;
	    var svs = <any>resp.data;
	    if (svs.error) {
		$scope.err = svs;
	    } else {
		$scope.svs = svs;
	    }
	}, function (resp) {
	    var err = resp.data;
	    if (!$scope.$$destroyed) alert(err);
	    return this.$q.reject(err);
	});
    }

    homonymes(id) {
	return this.$http.get('/api/homonymes/' + id).then(function (resp) {
	    return (<any>resp.data).map(this.fromWs);
	}, this._handleErr);
    }

    set(id, v) {
	var url = '/api/comptes/' + id;
	v = this.toWs(v);
	return this.$http.put(url, v).then(function (resp) {
	    return resp.data;
	}, this._handleErr);
    }

    delete(id) {
	var url = '/api/comptes/' + id;
	return this.$http.delete(url).then(function (resp) {
	    return resp.data;
	}, this._handleErr);
    }

}

angular.module('myApp').service("ws", WsService);
