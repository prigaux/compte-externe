import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { merge, omit, cloneDeep } from 'lodash';
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
export type SVRaw = ClientSideSVA

interface StepAttrOptionChoicesWithShort {
  const: string;
  title: string;
  short_title?: string;
}
export type StepAttrOption = StepAttrOptionM<ClientSideOnlyStepAttrOption & SharedStepAttrOption>
export type StepAttrsOption = Dictionary<StepAttrOption>
export type Mpp = MppT<StepAttrOption>
export type StepAttrOptionChoices = StepAttrOptionChoicesT<StepAttrOption>

export interface InitialSteps {
    attrs: StepAttrsOption;
    allow_many: boolean;
}

import conf from '../conf';

const api_url = conf.base_pathname + 'api';

export function eachAttrs(attrs: StepAttrsOption, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption) => void) {
    function rec_mpp(mpp: Mpp) {
        if (mpp.merge_patch_parent_properties) rec(mpp.merge_patch_parent_properties)
    }
    function rec(attrs : StepAttrsOption) {
        for (const attr in attrs) {
            const opts = attrs[attr];
            if (opts?.properties) rec(opts.properties);
            if (oneOfTraversal === 'always') {
                if (opts?.then) rec_mpp(opts.then)
                if (opts?.oneOf) opts.oneOf.forEach(rec_mpp)
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
    _fromFrenchDate(val) || _fromLDAPDate(val) || new Date(val) || "date invalide"
);

function _base64_to_jpeg_data_URL(base64: string): string {
    return "data:image/jpeg;base64," + base64;
}
function _jpeg_data_URL_to_base64(data_URL: string): string {
    return data_URL.replace(/^data:image\/jpeg;base64,/, '');
}

const attr_format_to_converter = {
    'date': { fromWs: (val: string) => new Date(val), toWs: (val: Date) => val.toJSON(), fromCSV: _fromCSVDate },
    'image/jpeg': { fromWs: _base64_to_jpeg_data_URL, toWs: _jpeg_data_URL_to_base64 },
    'phone': { fromWs: Helpers.maybeFormatPhone("0"), toWs: Helpers.maybeFormatPhone("+33 ") },
}

function to_or_from_ws(direction: 'fromWs' | 'fromCSV' | 'toWs', v: {}, attrs: StepAttrsOption) {
    var v_ = Helpers.copy(v);

    const _to_converter = (format: MinimalStepAttrOption["format"]) => {
        const converters = format && attr_format_to_converter[format];
        return converters && converters[direction];
    };
    for (const attr in v) {
        const opts = attrs[attr] || {};
        const convert = _to_converter(opts.format);
        if (convert && v[attr]) v_[attr] = convert(v[attr]);

        const item_converter = _to_converter(opts.items?.format);
        if (item_converter && Array.isArray(v[attr])) v_[attr] = v[attr].map(item_converter)
        
        if (direction === 'fromCSV' && opts.normalize) v_[attr] = opts.normalize(v_[attr]);
    }
    return v_;
}

export const fromWs = (v: VRaw, attrs: StepAttrsOption): V => to_or_from_ws('fromWs', v, attrs);
export const toWs = (v: V, attrs: StepAttrsOption): VRaw => to_or_from_ws('toWs', v, attrs);

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
    } else if (resp.status === 401) {
        if (confirm("Votre session a expiré, vous allez devoir recommencer.")) {
            document.location.reload();
        }
        return Promise.reject("restarting...");
    } else {
        const json_error = resp.data && resp.data.error ? resp.data : { error: err.message }
        const msg = json_error.error
        console.error(resp || err)
        if (redirect && !window.history.state) {
            $scope.fatal_error = msg;
        } else {
            alert(msg);
            if (redirect) router.back();
        }
        return Promise.reject(json_error);
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
    eachAttrs(root_attrs, 'always', (opts, attr) => {
        if (all_attrs[attr]) {
            // argh, weird stuff can happen (eg: handleAttrsValidators_and_allowUnchangedValue will handle on one attr)
            // try to warn...
            const opts_ = all_attrs[attr]
            if (opts.validator || opts.allowUnchangedValue || opts_.validator || opts_.allowUnchangedValue) {
                const a1 = JSON.stringify(omit(opts_, 'default'))
                const a2 = JSON.stringify(omit(opts, 'default'))
                console.error("duplicated attribute badly handled", a1, a2)
            }
        }
        all_attrs[attr] = opts
    })
    return all_attrs;
}

function handleAttrsValidators_and_allowUnchangedValue(all_attrs: StepAttrsOption, v_orig: V) {
    for (const attr in all_attrs) {
        const opts = all_attrs[attr];
        const validator = opts.validator;
        if (validator) {
            opts.validator = (val) => validator(val, v_orig);
        }
        if (opts.allowUnchangedValue) {
            // save the orig value here
            opts.allowUnchangedValue = v_orig[attr]
        }
    }
}

function password_to_auth(params): AxiosRequestConfig {
    if (params.userPassword) {
        const auth = { username: params.supannAliasLogin || '', password: params.userPassword }
        return { params: omit(params, 'userPassword', 'supannAliasLogin'), auth };
    } else {
        return { params };
    }
}

export function getInScope($scope, id: string, params, hash_params, expectedStep: string) : Promise<void> {
    var url = api_url + '/comptes/' + id + "/" + expectedStep;
    return axios.get(url, password_to_auth(params)).then((resp) => {
        var sv = <SVRaw>resp.data;
        initAttrs(sv.attrs);
        $scope.attrs = sv.attrs;
        let all_attrs = get_all_attrs_flat($scope.attrs);
        if (sv.v_ldap) $scope.v_ldap = fromWs(sv.v_ldap, all_attrs);
        let vs: {}[]
        if (sv.vs || sv.v) {
            vs = (sv.vs || [ sv.v ]).map(v => (
                fromWs(v, all_attrs)
            ));
        }
        if (sv.v) {
            let v = vs[0];
            // pass v_orig to attrs opts.validator:
            handleAttrsValidators_and_allowUnchangedValue(all_attrs, Helpers.copy(v));
            Helpers.eachObject(all_attrs, (attr, opts) => {
                let param = opts.uiType !== 'newPassword' && params[attr]

                // NB: hash params is useful for very long values (think jpegPhoto) since GET URI length has limitations
                if (!param) {
                    param = params[`set_${attr}`] || hash_params[`set_${attr}`]
                }
                if (!param) {
                    param = params[`readOnly_${attr}`] || hash_params[`readOnly_${attr}`]
                    if (param) all_attrs[attr].readOnly = true
                }
                if (!param && !v[attr]) {
                    param = params[`default_${attr}`] || hash_params[`default_${attr}`]
                }
                if (param) {
                    v[attr] = fromWs_one(attr, param, all_attrs)
                } else if (!v[attr]) {
                    // NB: important to set v[attr] for Vue.js 2 reactivity
                    v[attr] = undefined;
                }
            });
        }
        $scope.vs_orig = cloneDeep(vs);
        $scope.vs = vs // assign it when it is fully computed. Needed for Vue.js
        $scope.all_attrs_flat = all_attrs;
        $scope.step = sv.step;
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
