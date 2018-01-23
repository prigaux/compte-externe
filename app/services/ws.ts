import axios, { AxiosError } from 'axios';
import { pick, mapKeys, keyBy, mapValues } from 'lodash';
import { router } from '../router';
import * as Helpers from './helpers';


interface VCommon {
    structureParrain?: string;
    supannAliasLogin?: string;
    jpegPhoto?: string;
    homePostalAddress?: string;
}
export interface VRaw extends VCommon {
    birthDay?: string;
}
export interface V extends VCommon {
    birthDay?: Date;
    noInteraction?: boolean;
}
export interface SVRaw {
    v: VRaw;
    step: string;
    error?: string;
}

interface StepAttrOptionChoices {
  key: string;
  name?: string;
}
export interface StepAttrOption {
  readonly?: boolean;
  optional?: boolean;
  pattern?: string;
  max?: number;
  choices?: StepAttrOptionChoices[];

  choicesMap?: Dictionary<string>; // computed from "choices"
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

export const people_search = (step: string, token: string, maxRows? : number) : Promise<V[]> => (
    axios.get(api_url + '/comptes/search/' + step, { params: { token, maxRows } }).then(resp => resp.data as Promise<V[]>)
);

        export function structures_search(token : string, maxRows? : number) : Promise<Structure[]> {
            return axios.get(api_url + '/structures', { params: { token, maxRows } }).then((resp) => resp.data as Structure[]);
        }
        export function structure_get(id: string) {
            return structures_search(id, 1).then(resp => resp[0]);
        }

        const _toDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
                
        function _fromLDAPDate(date: string) {
            var m = date.match(/^([0-9]{4})([0-9]{2})([0-9]{2})[0-9]{6}Z?$/);
            return m && _toDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
        }
        function _fromFrenchDate(date: string) {
            var m = date.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
            return m && _toDate(parseInt(m[3]), parseInt(m[2]), parseInt(m[1]));
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
                v_.birthDay = new Date(v.birthDay);
            }
            if (v.jpegPhoto) {
                v_.jpegPhoto = _base64_to_jpeg_data_URL(v.jpegPhoto);
            }
            return v_;
        }

        export function toWs(v: V): VRaw {
            var v_: VRaw = <any>Helpers.copy(v);
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

        function initAttrs(attrs: StepAttrsOption) {
            for (const attr in attrs) {
                const opts = attrs[attr];
                if (opts.choices) {
                    opts.choicesMap = mapValues(keyBy(opts.choices, 'key'), choice => choice.name)
                }
            }
            return attrs;
        }

        export function getInScope($scope, id: string, params, expectedStep: string) : Promise<void> {
            var url = api_url + '/comptes/' + id + "/" + expectedStep;
            return axios.get(url, { params }).then((resp) => {
                var sv = <any>resp.data;
                    if (sv.v) {
                        sv.v = fromWs(sv.v);
                        sv.v_orig = Helpers.copy(sv.v);
                    }
                    sv.modifyTimestamp = new Date(sv.modifyTimestamp);
                    Helpers.eachObject(sv.attrs, (attr) => sv.v[attr] = sv.v[attr]); // ensure key exists for Vuejs setters
                    Helpers.assign(sv.v, fromWs(mapKeys(params, (_, k: string) => k.replace(/^default_/, ''))));
                    $scope.v = sv.v;
                    $scope.v_orig = sv.v_orig;
                    $scope.attrs = initAttrs(sv.attrs);
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
                (<any>resp.data).map(fromWs)
                , _handleErr);
        }

        export function set(id: string, step: string, v: V, params) {
            var url = api_url + '/comptes/' + id + "/" + step;
            var v_ = toWs(v);
            return axios.put(url, v_, { params }).then(
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
