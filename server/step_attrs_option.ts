import * as _ from 'lodash';
import * as utils from './utils';

function compute_diff(prev, current, key) {
    const toString = (val) => (
        val instanceof Array ? val.join(', ') : val instanceof Date ? val.toISOString() : val || ''
    )
    return toString(prev[key]) === toString(current[key]) ? {} : { 
        [key]: { prev: prev[key], current: current[key] }
    };
}

export const selectUserProfile = (v: v, profilename: string) => {
    const profile = v.up1Profile.find(p => p.profilename === profilename) as v;
    if (!profile) {
        console.error("no profile " + profilename);
        return undefined;
    }
    v = _.clone(v);
    v.up1Profile.forEach(profile => {
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

export function merge_v(attrs : StepAttrsOption, more_attrs: MoreStepAttrsOption, prev, v: v): v {
    let r = {};
    let diff = {};
    function merge_one_level(attrs : StepAttrsOption) {
      _.each(attrs, (opt, key) => {
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
        } else if (opt.hidden || opt.readOnly) {
            /* security: client must NOT modify hidden/readOnly information */
            if (key in prev) r[key] = prev[key];
        } else {
            validate(key, opt, more_attrs[key], v[key], prev);
            if (key in v) {
                Object.assign(diff, compute_diff(prev, v, key));
                r[key] = v[key];
            }
        }
        if (opt.properties) merge_one_level(opt.properties);
        handle_chosen_oneOf_or_if_then_mppp(opt, r[key], merge_one_level);
      });
    }
    merge_one_level(attrs);

    if (!r['various']) r['various'] = {};
    r['various'].diff = diff;

    return r as v;
}

function validate(key: string, opt: StepAttrOption, more_opt: MoreStepAttrOption, val, prev) {
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
                val.forEach((val_, i) => validate(`${key}-${i}`, { optional: opt.optional, ...opt.items }, more_opt && more_opt.items, val_, prev));
            }
        }
        if (more_opt && more_opt.validator) {
            const err = more_opt.validator(val, prev);
            if (err) throw err;
        }
}

/* before sending to client, remove sensible information */
export function export_v(attrs: StepAttrsOption, v) {
    const r = {};
    function rec(attrs: StepAttrsOption) {
        _.forEach(attrs, (opts, key) => {
            if (!opts.hidden && (key in v || opts.toUser)) {
                let val = v[key];
                if (opts.toUser) val = opts.toUser(v[key], v);
                r[key] = val;
            }
            if (opts.properties) rec(opts.properties);
            handle_chosen_oneOf_or_if_then_mppp(opts, v[key], rec);
        });
    }
    rec(attrs);
    return r;
}

export function flatten_attrs(attrs: StepAttrsOption, v: v) {
    const r: StepAttrsOption = {};
    function rec(attrs: StepAttrsOption) {
        _.forEach(attrs, (opts, key) => {
            r[key] = { ...r[key] || {}, ...opts }; // merge
            if (opts.properties) rec(opts.properties);
            handle_chosen_oneOf_or_if_then_mppp(opts, v[key], rec);
        });
    }
    rec(attrs);
    return r;
}

const handle_then_if_matching = (opts: StepAttrOption, val: string, rec: (attrs: StepAttrsOption) => void) => {
    if (!val) val = opts.default;
    const then_mppp = opts?.then?.merge_patch_parent_properties
    if (opts.if && then_mppp) {
        if (matches_if(opts.if, val) && !opts.then.merge_patch_options) {
            rec(then_mppp);
        }
    }
}

const handle_chosen_oneOf_mppp = (opts: StepAttrOption, val: string, rec: (attrs: StepAttrsOption) => void) => {
    if (!val) val = opts.default;
    if (val && opts.oneOf) {
        const choice = find_choice(opts.oneOf, val);
        if (choice && choice.merge_patch_parent_properties && !choice.merge_patch_options) {
            rec(choice.merge_patch_parent_properties);
        }
    }
}

const handle_chosen_oneOf_or_if_then_mppp = (opts: StepAttrOption, val: string, rec: (attrs: StepAttrsOption) => void) => {
    handle_then_if_matching(opts, val, rec);
    handle_chosen_oneOf_mppp(opts, val, rec);
}

const matches_if = (if_, val: string) => (
    if_.optional || val
)

const find_choice = (oneOf: StepAttrOptionChoices[], val) => oneOf.find(choice => choice.const == val); // allow equality if val is number and choice.const is string

const transform_toUserOnly_into_optional_readonly = ({ toUserOnly, ...opt} : StepAttrOption) => {
    opt = toUserOnly ? { optional: true, readOnly: true, ...opt} : opt;
    delete opt.toUser;
    if (opt.readOnly) opt.optional = true; // readOnly implies optional. Useful when readOnly is set through "attrs_override"
    if (opt.oneOf_async) opt.oneOf_async = true as any;
    if (opt.properties) opt.properties = exportAttrs(opt.properties);

    const rec_mpp = <T extends Mpp<StepAttrOption_no_extensions>>(one : T) => {        
        if (one.merge_patch_parent_properties) {
            one = { ...one, merge_patch_parent_properties: exportAttrs(one.merge_patch_parent_properties) };
        }
        return one;
    }
    if (opt.then) opt.then = rec_mpp(opt.then)
    if (opt.oneOf) opt.oneOf = opt.oneOf.map(rec_mpp)
    return opt;
}

export const exportAttrs = (attrs: StepAttrsOption) => (
    _.mapValues(_.omitBy(attrs, val => val.hidden), transform_toUserOnly_into_optional_readonly)
) as StepAttrsOption;

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
