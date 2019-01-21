import axios, { AxiosError } from 'axios';
import { merge, pick } from 'lodash';
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
    prev?: string;
    noInteraction?: boolean;
    startdate?: Date;
    enddate?: Date;
}
export interface SVRaw {
    v: VRaw;
    step: string;
    error?: string;
}

interface StepAttrOptionChoices {
  const: string;
  title?: string;
  sub?: StepAttrsOption;
}
export interface StepAttrOption {
  uiHidden?: boolean;
  readOnly?: boolean;
  optional?: boolean;
  pattern?: string;
  max?: number | Date;
  default?: string;
  oneOf?: StepAttrOptionChoices[];
  format?: 'date-time' | 'data-url';
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

interface Etablissement {
    key: string;
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
        export function etablissements_search(token : string, maxRows? : number) : Promise<Etablissement[]> {
            return axios.get(api_url + '/etablissements', { params: { token, maxRows } }).then((resp) => resp.data as Etablissement[]);
        }
        export function structure_get(id: string) {
            return structures_search(id, 1).then(resp => resp[0]);
        }
        export function etablissement_get(id: string) {
            return etablissements_search(id, 1).then(resp => resp[0]);
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
        const _fromCSVDate = (val: string) => (
            _fromFrenchDate(val) || _fromLDAPDate(val) || new Date(val) || "date invalide"
        );

        function _base64_to_jpeg_data_URL(base64: string): string {
            return "data:image/jpeg;base64," + base64;
        }
        function _jpeg_data_URL_to_base64(data_URL: string): string {
            return data_URL.replace(/^data:image\/jpeg;base64,/, '');
        }

        const attr_format_to_converter = {
            'date': { fromWs: val => new Date(val), fromCSV: _fromCSVDate },
            'data-url': { fromWs: _base64_to_jpeg_data_URL, toWs: _jpeg_data_URL_to_base64 },
        }

        function to_or_from_ws(direction: 'fromWs' | 'fromCSV' | 'toWs', v: {}, attrs: StepAttrsOption): V {
            var v_ = <any> Helpers.copy(v);
            for (const attr in v) {
                const opts = attrs[attr] || {};
                const converters = attr_format_to_converter[opts.format];
                const convert = converters && converters[direction];
                if (convert && v[attr]) v_[attr] = convert(v[attr]);
            }
            return v_;
        }

        const fromWs = (v: VRaw, attrs: StepAttrsOption) => to_or_from_ws('fromWs', v, attrs);
        const toWs = (v: V, attrs: StepAttrsOption) => to_or_from_ws('toWs', v, attrs);

        const fromWs_one = (attr: string, val, attrs) => fromWs({ [attr]: val }, attrs)[attr]

        let restarting = false;

        function _handleErr(err : AxiosError, $scope = null, redirect = false) {
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
                if (redirect) router.replace("/");
                return Promise.reject(msg);
            }
        }

        export function loggedUserInitialSteps() : Promise<InitialSteps> {
            return axios.get(api_url + '/steps/loggedUserInitialSteps').then(resp => (
                resp.data
            ));
        }

        function initAttrs(attrs: StepAttrsOption) {
            for (const attr in attrs) {
                const opts = attrs[attr];
                // recursive merge, especially useful for attr.labels
                attrs[attr] = merge({}, conf.default_attrs_opts[attr], opts);
                // also init "sub" attrs
                (attrs[attr].oneOf || []).forEach(choice => { if (choice.sub) initAttrs(choice.sub) });
            }
            return attrs;
        }

        export function getInScope($scope, id: string, params, expectedStep: string) : Promise<void> {
            var url = api_url + '/comptes/' + id + "/" + expectedStep;
            return axios.get(url, { params }).then((resp) => {
                var sv = <any>resp.data;
                sv.attrs = initAttrs(sv.attrs);
                    if (sv.v) {
                        sv.v = fromWs(sv.v, sv.attrs);
                        if (sv.v_ldap) sv.v_ldap = fromWs(sv.v_ldap, sv.attrs);
                        sv.v_orig = Helpers.copy(sv.v);
                    }
                    sv.modifyTimestamp = new Date(sv.modifyTimestamp);
                    Helpers.eachObject(sv.attrs, (attr, _opts) => {
                        const default_ = fromWs_one(attr, params[`default_${attr}`], sv.attrs);
                        const set_ = fromWs_one(attr, params[attr] || params[`set_${attr}`], sv.attrs);
                        sv.v[attr] = set_ || sv.v[attr] || default_;
                    });
                    $scope.v = sv.v;
                    $scope.v_ldap = sv.v_ldap;
                    $scope.v_orig = sv.v_orig;
                    $scope.attrs = sv.attrs;
                    $scope.step = pick(sv, ['allow_many', 'labels']);
            }, err => _handleErr(err, $scope, true));
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

        export function homonymes(id, v, attrs) {
            const v_ = toWs(v, attrs);
            return axios.post(api_url + '/homonymes/' + id, v_).then((resp) =>
                (<any>resp.data).map(v => fromWs(v, attrs))
                , _handleErr);
        }

        export function set(id: string, step: string, v: V, params, attrs: StepAttrsOption) {
            var url = api_url + '/comptes/' + id + "/" + step;
            var v_ = toWs(v, attrs);
            return axios.put(url, v_, { params }).then(
                (resp) => resp.data,
                _handleErr);
        }

        export function new_many(step: string, vs: V[], attrs: StepAttrsOption) {
            var url = api_url + '/comptes/new_many/' + step;
            var vs_ = vs.map(v => toWs(v, attrs));
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

        export function csv2json(file: File, attrs: StepAttrsOption) : Promise<{ fields: string[], lines: {}[] }> {
            return axios.post(conf.base_pathname + 'csv2json', file).then(
                (resp) => {
                    let o = resp.data;
                    o.lines = o.lines.map(v => to_or_from_ws('fromCSV', v, attrs));
                    return o;
                },
                _handleErr);
        }
