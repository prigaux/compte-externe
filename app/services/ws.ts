function padLeft(s: string | number, width: number) {
    let n = s + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

class MyDate {
    constructor(public year: number, public month: number, public day: number) {
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
    constructor(public line1: string, public line2: string, public postalCode: string, public town: string, public country: string) {
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
    birthDay?: string;
    homePostalAddress?: string;
}
interface V extends VCommon {
    birthDay?: MyDate;
    homePostalAddress?: HomePostalAddress;
    structureParrainS: { key: string, name: string, description: string };
}
interface SVRaw {
    v: VRaw;
    error?: string;
}

namespace WsService {
    export function create() {

        function structures_search(token, maxRows) {
            return axios.get('/api/structures', { params: { token, maxRows } }).then((resp) => resp.data);
        }

        function _fromJSONDate(date: string) {
            var d = new Date(date);
            return d && new MyDate(d.getUTCFullYear(), 1 + d.getUTCMonth(), d.getUTCDate());
        }
        function _fromLDAPDate(date: string) {
            var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
            return m && new MyDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
        }

        function _fromHomePostalAddress(addr): HomePostalAddress {
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
        function _toHomePostalAddress(addr: HomePostalAddress) {
            return addr.toString();
        }

        function fromWs(v: VRaw): V {
            var v_: V = <any>angular.copy(v);
            //v.birthDay = "19751002000000Z"; //"1975-10-02";
            if (v.birthDay) {
                v_.birthDay = _fromLDAPDate(v.birthDay) || _fromJSONDate(v.birthDay);
            }
            if (!v_.birthDay) {
                v_.birthDay = new MyDate(undefined, undefined, undefined);
            }
            if (v.homePostalAddress) {
                v_.homePostalAddress = _fromHomePostalAddress(v.homePostalAddress);
            } else {
                v_.homePostalAddress = new HomePostalAddressPrecise('', '', '', '', '');
            }
            if (v.structureParrain) {
                structures_search(v.structureParrain, 1).then((resp) => {
                    v_.structureParrainS = resp[0];
                });
            }
            return v_;
        }

        function toWs(v: V): VRaw {
            var v_: VRaw = <any>angular.copy(v);
            if (v.birthDay) {
                v_.birthDay = v.birthDay.toDate().toJSON();
            }
            if (v.homePostalAddress) {
                v_.homePostalAddress = _toHomePostalAddress(v.homePostalAddress);
            }
            if (v.structureParrainS) {
                v_.structureParrain = v.structureParrainS.key;
            }
            return v_;
        }

        function _handleErr(resp) {
            var err = resp.data;
            console.error(err);
            alert(err);
            return Promise.reject(err);
        }

        function getInScope($scope, id: string, expectedStep: string) {
            var url = '/api/comptes/' + id;
            return axios.get(url).then((resp) => {
                var sv = <any>resp.data;
                if (sv.error) {
                    console.error("error accessing ", url, ":", sv.error, sv.stack);
                    alert(sv.error);
                } else {
                    if (expectedStep && sv.step !== expectedStep) alert("expecting " + expectedStep + " got " + sv.step);
                    if (sv.v) sv.v = fromWs(sv.v);
                    sv.modifyTimestamp = _fromJSONDate(sv.modifyTimestamp);
                    angular.extend($scope, sv);
                }
                $scope.$apply();
            }, _handleErr);
        }

        function listInScope($scope, params) {
            return axios.get('/api/comptes', { params }).then((resp) => {
                if ($scope.$$destroyed) return;
                var svs = <any>resp.data;
                if (svs.error) {
                    $scope.err = svs;
                } else {
                    $scope.svs = svs;
                }
                $scope.$apply();
            }, (resp) => {
                var err = resp.data;
                if (!$scope.$$destroyed) alert(err);
                return Promise.reject(err);
            });
        }

        function homonymes(id) {
            return axios.get('/api/homonymes/' + id).then((resp) =>
                (<any>resp.data).map(fromWs)
                , _handleErr);
        }

        function set(id: string, v: V) {
            var url = '/api/comptes/' + id;
            var v_ = toWs(v);
            return axios.put(url, v_).then(
                (resp) => resp.data,
                _handleErr);
        }

        function remove(id: string) {
            var url = '/api/comptes/' + id;
            return axios.delete(url).then( 
                (resp) => resp.data,
                _handleErr);
        }

        return { fromWs, toWs, remove, set, homonymes, listInScope, getInScope, structures_search };
    }

    let o = Ts.getReturnType(create);
    export type T = typeof o;
}

angular.module('myApp').service("ws", WsService.create);
