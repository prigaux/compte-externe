import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { merge, pick, omit } from 'lodash';
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

export interface MergePatchOptions {
    newRootProperties?: 'ignore'
}

export interface StepAttrOptionChoices {
  const: string;
  title?: string;
  merge_patch_parent_properties?: StepAttrsOption;
  merge_patch_options?: MergePatchOptions, 
}
interface StepAttrOptionChoicesWithShort {
  const: string;
  title: string;
  short_title?: string;
}
export type StepAttrOption = MoreStepAttrOption & {
  readOnly?: boolean;
  optional?: boolean;
  properties?: StepAttrsOption;
  oneOf?: StepAttrOptionChoices[];
  oneOf_async?: string;
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

import conf from '../conf';

const api_url = conf.base_pathname + 'api';

export function eachAttrs(attrs: StepAttrsOption, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption) => void) {
    function rec(attrs) {
        for (const attr in attrs) {
            const opts = attrs[attr];
            if (opts && opts.properties) rec(opts.properties);
            if (opts && opts.oneOf) {
                if (oneOfTraversal === 'always') {
                    for (const choice of opts.oneOf) {
                        if (choice.merge_patch_parent_properties) rec(choice.merge_patch_parent_properties);
                    }
                }
            }
        f(opts, attr, attrs);
      }
    }
    rec(attrs);
}

export const people_search = (step: string, token: string, maxRows? : number) : Promise<V[]> => (
    axios.get(api_url + '/comptes/search/' + step, { params: { token, maxRows } }).then(resp => resp.data as Promise<V[]>)
);

        export function search(stepName: string, attr: string, token : string, maxRows? : number) : Promise<StepAttrOptionChoicesWithShort[]> {
            return axios.get(api_url + '/search/' + stepName + '/' + attr, { params: { token, maxRows } }).then((resp) => resp.data as StepAttrOptionChoicesWithShort[]);
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
            'date': { fromWs: val => new Date(val), toWs: val => val.toJSON(), fromCSV: _fromCSVDate },
            'data-url': { fromWs: _base64_to_jpeg_data_URL, toWs: _jpeg_data_URL_to_base64 },
            'phone': { fromWs: Helpers.maybeFormatPhone("0"), toWs: Helpers.maybeFormatPhone("+33 ") },
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

        export const fromWs = (v: VRaw, attrs: StepAttrsOption) => to_or_from_ws('fromWs', v, attrs);
        export const toWs = (v: V, attrs: StepAttrsOption) => to_or_from_ws('toWs', v, attrs);

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
                const type = resp.data && resp.data.authenticate && resp.data.authenticate.type || $scope.$route.query.idp || 'local';
                document.location.href = conf.base_pathname + 'login/' + type + '?then=' + encodeURIComponent($scope.$route.fullPath);
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

        function initAttrs(root_attrs: StepAttrsOption) {
            eachAttrs(root_attrs, 'always', (opts, attr, attrs) => {
                // recursive merge, especially useful for attr.labels
                attrs[attr] = merge({}, conf.default_attrs_opts[attr], opts);
            })
        }

        function get_all_attrs_flat(root_attrs: StepAttrsOption) {
            let all_attrs: StepAttrsOption = {};
            eachAttrs(root_attrs, 'always', (opts, attr) => { all_attrs[attr] = opts })
            return all_attrs;
        }

        function handleAttrsValidators(all_attrs: StepAttrsOption, v_orig: V) {
            for (const attr in all_attrs) {
                const opts = all_attrs[attr];
                const validator = opts.validator;
                if (validator) {
                    opts.validator = (val) => validator(val, v_orig);
                }
            }
        }

        function password_to_auth(params): AxiosRequestConfig {
            if (params.userPassword && params.supannAliasLogin) {
                const auth = { username: params.supannAliasLogin, password: params.userPassword }
                return { params: omit(params, 'userPassword', 'supannAliasLogin'), auth };
            } else {
                return { params };
            }
        }

        export function getInScope($scope, id: string, params, hash_params, expectedStep: string) : Promise<void> {
            var url = api_url + '/comptes/' + id + "/" + expectedStep;
            return axios.get(url, password_to_auth(params)).then((resp) => {
                var sv = <any>resp.data;
                initAttrs(sv.attrs);
                $scope.attrs = sv.attrs;
                let all_attrs = get_all_attrs_flat($scope.attrs);
                if (sv.v_ldap) $scope.v_ldap = fromWs(sv.v_ldap, all_attrs);
                let v
                if (sv.v) {
                    v = fromWs(sv.v, all_attrs);
                    $scope.v_orig = Helpers.copy(v);
                    // pass v_orig to attrs opts.validator:
                    handleAttrsValidators(all_attrs, $scope.v_orig);
                }
                    Helpers.eachObject(all_attrs, (attr, opts) => {
                        const default_ = fromWs_one(attr, params[`default_${attr}`] || hash_params[`default_${attr}`], all_attrs);
                        const set_ = fromWs_one(attr, opts.uiType !== 'newPassword' && params[attr] || params[`set_${attr}`] || hash_params[`set_${attr}`], all_attrs);
                        v[attr] = set_ || v[attr] || default_;
                    });
                $scope.v = v;
                $scope.all_attrs_flat = all_attrs;
                $scope.step = pick(sv, ['allow_many', 'labels']);
            }, err => _handleErr(err, $scope, true));
        }

        export async function listInScope($scope, params, cancelToken) : Promise<"ok" | "cancel"> {
            try {
                const resp = await axios.get(api_url + '/comptes', { params, cancelToken });           
                var svs = resp.data;
                $scope.svs = svs;
                return "ok";
            } catch (err) {
                if (axios.isCancel(err)) {
                    return "cancel";
                }
                return _handleErr(err, $scope);
            }
        }

        export function homonymes(id, v, all_attrs_flat) {
            const v_ = toWs(v, all_attrs_flat);
            return axios.post(api_url + '/homonymes/' + id, v_).then((resp) =>
                (<any>resp.data).map(v => fromWs(v, all_attrs_flat))
                , _handleErr);
        }

        export function set(id: string, step: string, v: V, params, all_attrs_flat: StepAttrsOption) {
            var url = api_url + '/comptes/' + id + "/" + step;
            var v_ = toWs(v, all_attrs_flat);
            const params_ = password_to_auth(params);
            return axios.put(url, v_, params_).then(
                (resp) => resp.data,
                _handleErr);
        }

        export function new_many(step: string, vs: V[], all_attrs_flat: StepAttrsOption) {
            var url = api_url + '/comptes/new_many/' + step;
            var vs_ = vs.map(v => toWs(v, all_attrs_flat));
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
            return axios.post(api_url + '/csv2json', file).then(
                (resp) => {
                    let o = resp.data;
                    o.lines = o.lines.map(v => to_or_from_ws('fromCSV', v, attrs));
                    return o;
                },
                _handleErr);
        }
