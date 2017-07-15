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

type HomePostalAddress =
    { country: string, 
      lines: string,
      line2?: string, postalCode?: string, town?: string };

interface VCommon {
    structureParrain?: string;
    supannAliasLogin?: string;
    jpegPhoto?: string;
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
    step: string;
    error?: string;
}

interface StepAttrOption {
  readonly?: boolean;
  hidden?: boolean;
}
interface Dictionary<T> {
  [index: string]: T;
}
type StepAttrsOption = Dictionary<StepAttrOption>;

interface Structure {
    key: string;
    name: string;
    description: string;
}

namespace Ws {
        export function structures_search(token : string, maxRows? : number) : Promise<Structure[]> {
            return axios.get('/api/structures', { params: { token, maxRows } }).then((resp) => resp.data as Structure[]);
        }

        function _fromJSONDate(date: string) {
            var d = new Date(date);
            return d && new MyDate(d.getUTCFullYear(), 1 + d.getUTCMonth(), d.getUTCDate());
        }
        function _fromLDAPDate(date: string) {
            var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
            return m && new MyDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
        }

        function _fromHomePostalAddress(addr: string): HomePostalAddress {
            if (!addr) return { lines: '', line2: '', postalCode: '', town: '', country: "FRANCE" };

            let lines = addr.split(/\n/);
            if (lines.length < 3) return { lines: addr, country: '' };
            let country = lines.pop();
            if (country.match(/^france$/i)) {
                let pt = lines.pop();
                let pt_ = pt.match(/(\d+) (.*)/);
                if (!pt_) return { lines: lines.join("\n"), country };

                let l1 = lines.shift();
                let line2 = lines.join(" - "); // we want only 2 lines, group the remaining lines                
                return { lines: l1, line2, postalCode: pt_[1], town: pt_[2], country: "FRANCE" };
            } else {
                return { lines: lines.join("\n"), country };
            }
        }
        function _toHomePostalAddress(addr: HomePostalAddress) : string {
            let pt = [ addr.postalCode, addr.town ].filter(e => e).join(" ");
            return [ addr.lines, addr.line2, pt, addr.country || 'FRANCE' ].filter(s => s).join("\n")
        }

        function _base64_to_jpeg_data_URL(base64: string): string {
            return "data:image/jpeg;base64," + base64;
        }
        function _jpeg_data_URL_to_base64(data_URL: string): string {
            return data_URL.replace(/^data:image\/jpeg;base64,/, '');
        }

        export function fromWs(v: VRaw): V {
            var v_: V = <any> Helpers.copy(v);
            //v.birthDay = "19751002000000Z"; //"1975-10-02";
            if (v.birthDay) {
                v_.birthDay = _fromLDAPDate(v.birthDay) || _fromJSONDate(v.birthDay);
            }
            if (!v_.birthDay) {
                v_.birthDay = new MyDate(undefined, undefined, undefined);
            }
            v_.homePostalAddress = _fromHomePostalAddress(v.homePostalAddress);
            v_.structureParrainS = undefined;
            if (v.structureParrain) {
                structures_search(v.structureParrain, 1).then((resp) => {
                    v_.structureParrainS = resp[0];
                });
            }
            if (v.jpegPhoto) {
                v_.jpegPhoto = _base64_to_jpeg_data_URL(v.jpegPhoto);
            }
            return v_;
        }

        export function toWs(v: V): VRaw {
            var v_: VRaw = <any>Helpers.copy(v);
            if (v.birthDay) {
                v_.birthDay = v.birthDay.toDate().toJSON();
            }
            if (v.homePostalAddress) {
                v_.homePostalAddress = _toHomePostalAddress(v.homePostalAddress);
            }
            if (v.structureParrainS) {
                v_.structureParrain = v.structureParrainS.key;
            }
            if (v.jpegPhoto) {
                v_.jpegPhoto = _jpeg_data_URL_to_base64(v.jpegPhoto);
            }
            return v_;
        }

        function _handleErr(resp) {
            var err = resp.data;
            console.error(err);
            alert(err);
            return Promise.reject(err);
        }

        export function allowGet(id: string) : Promise<boolean> {
            let url = '/api/comptes/' + id;
            return axios.get(url).then(resp => (
                resp.data && !resp.data['error']
            ));
        }

        export function getInScope($scope, id: string, expectedStep: string) : Promise<void> {
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
                    Helpers.eachObject(sv.attrs, (attr) => sv.v[attr] = sv.v[attr]); // ensure key exists for Vuejs setters
                    Helpers.assign($scope, sv);
                }
            }, _handleErr);
        }

        export function listInScope($scope, params, cancelToken) : Promise<"ok" | "cancel"> {
            return axios.get('/api/comptes', { params, cancelToken }).then((resp) => {
                var svs = resp.data;
                if (svs.error) {
                    $scope.err = svs;
                } else {
                    $scope.svs = svs;
                }
                return "ok";
            }, (resp) => {
                if (axios.isCancel(resp)) {
                    return "cancel";
                }
                var err = resp.data;
                alert(err || "server is down, please retry later");
                return Promise.reject(err);
            });
        }

        export function homonymes(id) {
            return axios.get('/api/homonymes/' + id).then((resp) =>
                (<any>resp.data)
                , _handleErr);
        }

        export function set(id: string, v: V) {
            var url = '/api/comptes/' + id;
            var v_ = toWs(v);
            return axios.put(url, v_).then(
                (resp) => resp.data,
                _handleErr);
        }

        export function remove(id: string) {
            var url = '/api/comptes/' + id;
            return axios.delete(url).then( 
                (resp) => resp.data,
                _handleErr);
        }
}
