function padLeft(n: string, width: number) {
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

class MyDate {
    constructor(public year, public month, public day) {
    }
    toString() {
        return [padLeft(this.day, 2), padLeft(this.month, 2), padLeft(this.year, 4)].join('/');
    }
    toDate() {
        return new Date(Date.UTC(this.year, this.month - 1, this.day));
    }
}

class HomePostalAddress {
    constructor(public line1) { }
    toString() {
        return this.line1;
    }
}

class HomePostalAddressPrecise extends HomePostalAddress {
    constructor(public line1, public line2, public postalCode, public town, public country) {
        super(line1);
    }
    toString() {
        if (!this.postalCode && !this.town) return undefined;
        return this.line1 + (this.line2 ? "$" + this.line2 : '') + "$" + this.postalCode + " " + this.town + "$" + (this.country || 'FRANCE');
    }
}

interface VCommon {
    structureParrain?: string;
    supannAliasLogin?: string;
}
interface VRaw extends VCommon {
    birthDay?: string,
    homePostalAddress?: string
}
interface V extends VCommon {
    birthDay?: MyDate,
    homePostalAddress?: HomePostalAddress,
    structureParrainS: { key: string, name: string, description: string }
}
interface SVRaw {
     v : VRaw;
     error? : string;
}

class WsService {
 constructor(private $http : ng.IHttpService, private $q : ng.IQService) {
 }

  structures_search(token, maxRows) {
	return this.$http.get('/api/structures', {params: {token: token, maxRows: maxRows}}).then(function (resp) {
	    return resp.data;
	});
    }

    _fromJSONDate(date : string) {
	var d = new Date(date);
  return d && new MyDate(d.getUTCFullYear(), 1 + d.getUTCMonth(), d.getUTCDate());
    }
    _fromLDAPDate(date : string) {
	var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
  return m && new MyDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
    }
    _toJSONDate(date : MyDate) {
        return date.toDate();
    }

    _fromHomePostalAddress(addr) : HomePostalAddress {
	var m = addr.match(/(.*)\$(.*)\$(.*)/);
  if (!m) return new HomePostalAddress(addr);
	var m1 = m[1].match(/(.*)\$(.*)/);
	var m2 = m[2].match(/(\d+) (.*)/);
  return new HomePostalAddressPrecise(
            m1 ? m1[1] : m[1],
            m1 ? m1[2] : '',
            m2[1], m2[2],
            m[3]);
    }
    _toHomePostalAddress(addr: HomePostalAddress) {
        return addr.toString();
    }
    
    fromWs(v : VRaw) : V {
  var v_: V = <any>angular.copy(v);
	//v.birthDay = "19751002000000Z"; //"1975-10-02";
	if (v.birthDay) {
            v_.birthDay = this._fromLDAPDate(v.birthDay) || this._fromJSONDate(v.birthDay);
	}
  if (!v_.birthDay) {
            v_.birthDay = new MyDate(undefined, undefined, undefined);
	}
	if (v.homePostalAddress) {
            v_.homePostalAddress = this._fromHomePostalAddress(v.homePostalAddress);
	} else {
            v_.homePostalAddress = new HomePostalAddress('');
	}
	if (v.structureParrain) {
	    this.structures_search(v.structureParrain, 1).then(function (resp) {
		v_.structureParrainS = resp[0];
	    });
	}
	return v_;
    }

    toWs(v : V) : VRaw {
        var v_: VRaw = <any>angular.copy(v);
        if (v.birthDay) {
            v_.birthDay = v.birthDay.toDate().toString();
        }
				v_.homePostalAddress = this._toHomePostalAddress(v.homePostalAddress);
				if (v.structureParrainS) {
	    		v_.structureParrain = v.structureParrainS.key;
				}
				return v_;
    }
    
    _handleErr(resp) {
	var err = resp.data;
	console.error(err);
	alert(err);
	return this.$q.reject(err);
    }

    getInScope($scope, id  : string, expectedStep : string) {
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

    set(id : string, v : V) {
	var url = '/api/comptes/' + id;
	var v_ = this.toWs(v);
	return this.$http.put(url, v_).then(function (resp) {
	    return resp.data;
	}, this._handleErr);
    }

    delete(id : string) {
	var url = '/api/comptes/' + id;
	return this.$http.delete(url).then(function (resp) {
	    return resp.data;
	}, this._handleErr);
    }

}

angular.module('myApp').service("ws", WsService);
