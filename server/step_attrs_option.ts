import * as _ from 'lodash';
import * as helpers from './helpers';
import * as utils from './utils';
import { compute_mppp_and_handle_default_values } from '../shared/mppp_and_defaults'

export type one_diff = { prev: any, current: any }

function compute_diff(prev: Dictionary<any>, current: Dictionary<any>, key: string): Dictionary<one_diff> {
    const toString = (val: any) => (
        val instanceof Array ? val.join(', ') : val instanceof Date ? val.toISOString() : val || ''
    )
    return toString(prev[key]) === toString(current[key]) ? {} : { 
        [key]: { prev: prev[key], current: current[key] }
    };
}

export const selectUserProfile = (v: v, profilename: string) => {
    const profile = v.up1Profile?.find(p => p.profilename === profilename) as v;
    if (!profile) {
        console.error("no profile " + profilename);
        return undefined;
    }
    v = _.clone(v);
    v.up1Profile.forEach((profile: Dictionary<any>) => {
        _.forEach(profile, (pval, attr) => {
            const val = v[attr];
            if (_.isArray(val)) {
                _.pull(val, ...pval);
            } else if (val === pval) {
                delete v[attr];
            }
        });
    });
    return { ...v, ...profile };
};

export function merge_v(attrs_ : StepAttrsOption, more_attrs: SharedStepAttrsOption, prev: v, v: v, opts?: { no_diff?: true }): v {
    let r: v = { various: prev.various || [] };
    let diff = {};
    function merge_one_level(attrs : StepAttrsOption) {
      _.each(attrs, (opt, key) => {
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
        } else if (opt.hidden || opt.readOnly) {
            /* security: client must NOT modify hidden/readOnly information */
            if (key in prev) r[key] = prev[key];
        } else {
            validate(key, opt, more_attrs[key], v[key], prev, v);
            if (key in v) {
                Object.assign(diff, compute_diff(prev, v, key));
                r[key] = v[key];
            }
        }
        if (opt.properties) merge_one_level(opt.properties);
      });
    }
    let { attrs } = compute_mppp_and_handle_default_values(attrs_, 'ignore_opts_default', v as any)
    merge_one_level(attrs);

    if (!opts?.no_diff) r['various'].diff = diff;

    return r as v;
}

function validate(key: string, opt: StepAttrOption, more_opt: SharedStepAttrOption, val: any, prev: v, v: v) {
        if (opt.serverValidator) {
            const error = opt.serverValidator(val, prev, v);
            if (error) throw { code: 400, error, attrName: key };
        }
        if (val === '' || val === undefined || val === null || _.isArray(val) && _.isEmpty(val)) {
            if (!opt.optional)
                throw `constraint !${key}.optional failed for ${val}`;
            else 
                return; // no more checks if optional
        }
        if (opt.allowUnchangedValue && _.isEqual(val, prev[key])) {
            // bypass checks
            return
        }
        if (opt.max) {
            if (!((""+val).match(/\d+/) && 0 <= val && val <= opt.max))
                throw `constraint ${key}.max <= ${opt.max} failed for ${val}`;
        }
        if (opt.pattern) {
            let val_ = val !== undefined ? val : '';
            if (!(_.isString(val_) && val_.match("^(" + opt.pattern + ")$")))
                throw `constraint ${key}.pattern ${opt.pattern} failed for ${val}`;
        }
        if (opt.oneOf) {
            if (val !== undefined && !find_choice(opt.oneOf, val)) {
                const keys = opt.oneOf.map(e => e.const);
                throw `constraint ${key}.oneOf ${keys} failed for ${val}`;
            }
        }
        if (opt.items || opt.uiType === 'array') {
            if (val !== undefined) {
                if (!_.isArray(val)) throw `constraint ${key} is array failed for ${val}`;
                val.forEach((val_, i) => validate(`${key}-${i}`, { optional: opt.optional, ...opt.items }, more_opt && more_opt.items, val_, prev, v));
            }
        }
        if (more_opt && more_opt.validator) {
            const err = more_opt.validator(val, prev);
            if (err) throw err;
        }
}

function validate_nothrow(key: string, opt: StepAttrOption, more_opt: SharedStepAttrOption, val: any, prev: v, v: v) {
    try {
        validate(key, opt, more_opt, val, prev, v);
        return true;
    } catch (e) {
        return false;
    }
}

/* before sending to client, remove sensible information */
export function export_v(attrs: StepAttrsOption, v: v) {
    // resolve mppp, with default taken into account. but do not export "default" values
    let v_ = _.cloneDeep(v)
    const attrs_ = compute_mppp_and_handle_default_values(attrs, {}, v_).attrs
    return export_v_(attrs_, v)
}

function export_v_(attrs: StepAttrsOption, v: v) {
    const r: v = {};
    const ignore = (key: string, opts: StepAttrOption) => (
        opts.ignoreInvalidExistingValue && !validate_nothrow(key, opts, {}, v[key], v, v)
    )
    function rec_items_properties(val: v[], attrs: StepAttrsOption) {
        return _.isArray(val) ? val.map(subv => export_v_(attrs, subv)) : val
    }
    function rec(attrs: StepAttrsOption) {
        _.forEach(attrs, (opts, key) => {
            if (!opts.hidden && (key in v || opts.toUser) && !ignore(key, opts)) {
                let val = v[key];
                if (opts.toUser) val = opts.toUser(v[key], v);
                r[key] = opts.items?.properties ? rec_items_properties(val, opts.items.properties) : val;
            }
            if (opts.properties) rec(opts.properties);
        });
    }
    rec(attrs);
    return r;
}

export function flatten_attrs(attrs: StepAttrsOption, v: v) {
    let v_ = _.cloneDeep(v)
    const attrs_ = compute_mppp_and_handle_default_values(attrs, {}, v_).attrs

    const r: StepAttrsOption = {};
    function rec(attrs: StepAttrsOption) {
        _.forEach(attrs, (opts, key) => {
            r[key] = { ...r[key] || {}, ...opts }; // merge
            if (opts.properties) rec(opts.properties);
        });
    }
    rec(attrs_);
    return r;
}

const find_choice = (oneOf: StepAttrOptionChoices[], val: any) => oneOf.find(choice => choice.const == val); // allow equality if val is number and choice.const is string

type ClientSideStepAttrOption = StepAttrOptionM<ClientSideOnlyStepAttrOption>
const exportAttr = ({ toUserOnly, oneOf_async, properties, toUser, then, oneOf, ...opt_} : StepAttrOption) => {
    const opt : ClientSideStepAttrOption = opt_;
    if (toUserOnly) opt.readOnly = true
    if (oneOf_async) opt.oneOf_async = "true";
    if (properties) opt.properties = exportAttrs(properties);

    function rec_mpp(one: Mpp<StepAttrOption>): Mpp<ClientSideStepAttrOption>
    function rec_mpp(one: StepAttrOptionChoicesT<StepAttrOption>): StepAttrOptionChoicesT<ClientSideStepAttrOption>
    function rec_mpp(one: any) {
        if (one.merge_patch_parent_properties) {
            return { ...one, merge_patch_parent_properties: exportAttrs(one.merge_patch_parent_properties) };
        } else {
            return one;
        }
    }
    if (then) opt.then = rec_mpp(then)
    if (oneOf) opt.oneOf = oneOf.map(rec_mpp)

    if (opt.readOnly) opt.optional = true; // readOnly implies optional. Useful when readOnly is set through "attrs_override"
    return opt;
}

export const exportAttrs = (attrs: StepAttrsOption): Dictionary<ClientSideStepAttrOption> => (
    _.mapValues(_.omitBy(attrs, val => val.hidden), exportAttr)
)

export const eachAttrs = (attrs: StepAttrsOption, f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption, cond: boolean) => void) => {
    const rec_mpp = <T>(mpp : Mpp<T>) => {
        if (mpp.merge_patch_parent_properties) rec(mpp.merge_patch_parent_properties, true);
    }
    const rec = (attrs: StepAttrsOption, cond: boolean) => {
        _.each(attrs, (opts, key) => {
            if (opts && opts.properties) rec(opts.properties, cond);
            if (opts?.then) rec_mpp(opts.then)
            if (opts?.oneOf) opts.oneOf.forEach(rec_mpp)
            f(opts, key, attrs, cond);
        })
    }
    rec(attrs, false)
}

export const flatMapAttrs = <T>(attrs: StepAttrsOption, f: (opts: StepAttrOption, key: string) => T[]): T[] => {
    let r: T[] = []
    eachAttrs(attrs, (opts, key) => r.push(...f(opts, key)))
    return r
}

export const merge_attrs_overrides = (attrs: StepAttrsOption, attrs_override: StepAttrsOption) => {
    const r = utils.deep_extend(attrs, attrs_override);
    eachAttrs(r, (opts, key, attrs) => {
        if (!opts) delete attrs[key];
    });
    return r;
}

export const checkAttrs = (attrs: StepAttrsOption, stepName: string) => {
    let all: Dictionary<{ cond: StepAttrOption[], no_cond: StepAttrOption[] }> = {}
    eachAttrs(attrs, (opts, key, _attrs, cond) => {        
        if (!all[key]) all[key] = { no_cond: [], cond: [] }
        all[key][cond ? 'cond' : 'no_cond'].push(_.pick(opts, 'readOnly', 'hidden', 'toUserOnly'))
    })
    const merge = (key: string, l: StepAttrOption[], no_cond: StepAttrOption) => {
        let r: StepAttrOption = no_cond
        for (const opts of l) {
            const readOnly = opts.readOnly || opts.toUserOnly
            if (r) {
                if (!readOnly !== !r.readOnly) throw `error in step ${stepName}: mixed readOnly|toUserOnly for attr ${key}`
                if (!opts.hidden !== !r.hidden) throw `error in step ${stepName}: mixed hidden for attr ${key}`                
            } else {
                r = { readOnly, hidden: opts.hidden }
            }
        }
        return r;
    }
    _.each(all, ({ no_cond, cond }, key) => {
        const no_cond_ = merge(key, no_cond, undefined);
        merge(key, cond, no_cond_)
    })
}

const transform_object_items_oneOf_async_to_oneOf_ = async (attrs: StepAttrsOption, items: v[]) => {
    for (const key in attrs) {
        const opts = attrs[key]
        if (opts.oneOf_async) {
            const used_values = _.compact(_.uniq(items.map(v => v[key])))
            console.log('used_values', used_values)
            opts.oneOf = _.flatten(await helpers.pmap(used_values, val => opts.oneOf_async(val, 1)))
            delete opts.oneOf_async
        }
    }
}

export const transform_object_items_oneOf_async_to_oneOf = async (attrs: StepAttrsOption, v: v) => {
    for (const key in attrs) {
        const opts = attrs[key]
        if (opts.items?.properties) {
            await transform_object_items_oneOf_async_to_oneOf_(opts.items.properties, v[key])
        }
    }
}

export const mapAttrs = <T>(attrs: StepAttrsOptionT<T>, f: (opts: StepAttrOptionT<T>, attrName: string) => StepAttrOptionT<T>) => (
    _.mapValues(attrs, (opts, key) => {
        opts = f(opts, key);
        if (opts.properties) opts.properties = mapAttrs(opts.properties, f);
        const rec_mpp = <M extends Mpp<T>>(mpp: M) => (
            mpp.merge_patch_parent_properties ? { ...mpp, merge_patch_parent_properties: mapAttrs(mpp.merge_patch_parent_properties, f) } : mpp
        )
        if (opts.then) opts.then = rec_mpp(opts.then)
        if (opts.oneOf) opts.oneOf = opts.oneOf.map(rec_mpp)
        return opts;        
    })
)

export const findStepAttr = (attrs: StepAttrsOption, f: (opts: StepAttrOption, key: string) => boolean): { key: string, opts: StepAttrOption } => {
    for (const key in attrs) {
        const opts = attrs[key];

        if (f(opts, key)) return { key, opts };

        if (opts.properties) {
            const r = findStepAttr(opts.properties, f);
            if (r) return r;
        }
        if (opts.then?.merge_patch_parent_properties) {
            const r = findStepAttr(opts.then.merge_patch_parent_properties, f);
            if (r) return r;
        }
        if (opts.oneOf) {
            for (const choice of opts.oneOf) {
                if (choice.merge_patch_parent_properties) {
                    const r = findStepAttr(choice.merge_patch_parent_properties, f);
                    if (r) return r;
                }
            }
        }
    }
    return undefined;
}