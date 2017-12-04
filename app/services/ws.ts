import axios, { AxiosError } from 'axios';
import { pick } from 'lodash';
import { router } from '../router';
import * as Helpers from './helpers';

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
export interface VRaw extends VCommon {
    birthDay?: string;
    homePostalAddress?: string;
}
export interface V extends VCommon {
    birthDay?: MyDate;
    homePostalAddress?: HomePostalAddress;
    structureParrainS: { key: string, name: string, description: string };
}
export interface SVRaw {
    v: VRaw;
    step: string;
    error?: string;
}

export interface StepAttrOption {
  readonly?: boolean;
  hidden?: boolean;
}
export interface Dictionary<T> {
  [index: string]: T;
}
export type StepAttrsOption = Dictionary<StepAttrOption>;

export interface InitialSteps {
    attrs: StepAttrsOption;
    attrs_pre: Dictionary<{}>;
    allow_many: boolean;
}

interface Structure {
    key: string;
    name: string;
    description: string;
}

import conf from '../conf';

const api_url = conf.base_pathname + 'api';

        export function structures_search(token : string, maxRows? : number) : Promise<Structure[]> {
            return axios.get(api_url + '/structures', { params: { token, maxRows } }).then((resp) => resp.data as Structure[]);
        }

        function _fromJSONDate(date: string) {
            var d = new Date(date);
            return d && new MyDate(d.getUTCFullYear(), 1 + d.getUTCMonth(), d.getUTCDate());
        }
        function _fromLDAPDate(date: string) {
            var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
            return m && new MyDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
        }
        function _fromFrenchDate(date: string) {
            var m = date.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
            return m && new MyDate(parseInt(m[3]), parseInt(m[2]), parseInt(m[1]));
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
            if (v.birthDay && v.birthDay.year) {
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

        let restarting = false;

        function _handleErr(err : AxiosError, $scope = null) {
            if (restarting) return Promise.reject("restarting");

            if (!err.response) {
                // axios "Network Error" case, no useful information
                console.error(err);
                const msg = "server is down, please retry later";
                alert(msg);
                return Promise.reject(msg);
            }

            let resp = err.response;
            if (resp.status === 401 && $scope && $scope.$route.path !== '/login') {
                console.log("must relog", resp.headers.toString());
                restarting = true;
                document.location.href = conf.base_pathname + 'login/' + ($scope.$route.query.idp || 'local') + '?then=' + encodeURIComponent($scope.$route.fullPath);
                return Promise.reject("logging...");
            } else {
                const msg = resp.data && resp.data.error || err.message;
                console.error(resp || err)
                alert(msg);
                router.replace("/");
                return Promise.reject(msg);
            }
        }

        export function initialSteps() : Promise<InitialSteps> {
            return axios.get(api_url + '/initialSteps').then(resp => (
                resp.data
            ));
        }

        export function getInScope($scope, id: string, params, expectedStep: string) : Promise<void> {
            var url = api_url + '/comptes/' + id + "/" + expectedStep;
            return axios.get(url, { params }).then((resp) => {
                var sv = <any>resp.data;
                    if (sv.v) {
                        sv.v = fromWs(sv.v);
                        sv.v_orig = Helpers.copy(sv.v);
                    }
                    sv.modifyTimestamp = _fromJSONDate(sv.modifyTimestamp);
                    Helpers.eachObject(sv.attrs, (attr) => sv.v[attr] = sv.v[attr]); // ensure key exists for Vuejs setters
                    Helpers.assign(sv.v, params);
                    $scope.v = sv.v;
                    $scope.attrs = sv.attrs;
                    $scope.step = pick(sv, ['allow_many', 'labels']);
            }, err => _handleErr(err, $scope));
        }

        export function listInScope($scope, params, cancelToken) : Promise<"ok" | "cancel"> {
            return axios.get(api_url + '/comptes', { params, cancelToken }).then((resp) => {
                var svs = resp.data;
                $scope.svs = svs;
                return "ok";
            }, (err) => {
                if (axios.isCancel(err)) {
                    return "cancel";
                }
                return _handleErr(err, $scope);
            });
        }

        export function homonymes(id) {
            return axios.get(api_url + '/homonymes/' + id).then((resp) =>
                (<any>resp.data)
                , _handleErr);
        }

        export function set(id: string, step: string, v: V) {
            var url = api_url + '/comptes/' + id + "/" + step;
            var v_ = toWs(v);
            return axios.put(url, v_).then(
                (resp) => resp.data,
                _handleErr);
        }

        export function new_many(step: string, vs: V[]) {
            var url = api_url + '/comptes/new_many/' + step;
            var vs_ = vs.map(toWs);
            return axios.put(url, vs_).then(
                (resp) => resp.data,
                _handleErr);
        }

        export function remove(id: string, step: string) {
            var url = api_url + '/comptes/' + id + "/" + step;
            return axios.delete(url).then( 
                (resp) => resp.data,
                _handleErr);
        }

        export function csv2json(file: File) : Promise<{ fields: string[], lines: {}[] }> {
            return axios.post(conf.base_pathname + 'csv2json', file).then(
                (resp) => {
                    let o = resp.data;
                    o.lines.forEach(v => {
                        if (v.birthDay) v.birthDay = _fromFrenchDate(v.birthDay) || _fromLDAPDate(v.birthDay) || "date invalide";
                    });
                    return o;
                },
                _handleErr);
        }
