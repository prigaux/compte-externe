import * as _ from 'lodash';
import * as utils from './utils';

function compute_diff(prev, current, key) {
    const toString = (val) => {
        const val_ = val instanceof Array ? val.join(', ') : val instanceof Date ? val.toISOString() : val || ''
        return val_.length > 1000 ? "<i>valeur cachée</i>" : val_;
    };
    const one_diff = {
        prev: toString(prev[key]),
        current: toString(current[key]),
    };
    return one_diff.prev === one_diff.current ? {} : { [key]: one_diff };
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
        handle_chosen_oneOf_mppp(opt, r[key], merge_one_level);
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
            if (!opts.hidden && key in v) {
                let val = v[key];
                if (opts.anonymize) val = opts.anonymize(v[key]);
                r[key] = val;
            }
            if (opts.properties) rec(opts.properties);
            handle_chosen_oneOf_mppp(opts, v[key], rec);
        });
    }
    rec(attrs);
    return r;
}

export function flatten_attrs(attrs: StepAttrsOption, v: v) {
    const r = {};
    function rec(attrs: StepAttrsOption) {
        _.forEach(attrs, (opts, key) => {
            r[key] = { ...r[key] || {}, ...opts }; // merge
            if (opts.properties) rec(opts.properties);
            handle_chosen_oneOf_mppp(opts, v[key], rec);
        });
    }
    rec(attrs);
    return r;
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

const find_choice = (oneOf: StepAttrOptionChoices[], val) => oneOf.find(choice => choice.const == val); // allow equality if val is number and choice.const is string

const transform_toUserOnly_into_optional_readonly = ({ toUserOnly, ...opt} : StepAttrOption) => {
    opt = toUserOnly ? { optional: true, readOnly: true, ...opt} : opt;
    delete opt.anonymize;
    if (opt.readOnly) opt.optional = true; // readOnly implies optional. Useful when readOnly is set through "attrs_override"
    if (opt.oneOf_async) opt.oneOf_async = true as any;
    if (opt.properties) opt.properties = exportAttrs(opt.properties);
    if (opt.oneOf) {
        opt.oneOf = opt.oneOf.map(one => {        
            if (one.merge_patch_parent_properties) {
                one = { ...one, merge_patch_parent_properties: exportAttrs(one.merge_patch_parent_properties) };
            }
            return one;
        });
    }
    return opt;
}

export const exportAttrs = (attrs: StepAttrsOption) => (
    _.mapValues(_.omitBy(attrs, val => val.hidden), transform_toUserOnly_into_optional_readonly)
) as StepAttrsOption;

export const eachAttrs = (attrs: StepAttrsOption, f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption) => void) => {
    _.each(attrs, (opts, key) => {
        if (opts && opts.properties) eachAttrs(opts.properties, f);
        if (opts && opts.oneOf) {
            for (const choice of opts.oneOf) {
                if (choice.merge_patch_parent_properties) eachAttrs(choice.merge_patch_parent_properties, f);
            }
        }
        f(opts, key, attrs);
    })
}

export const merge_attrs_overrides = (attrs: StepAttrsOption, attrs_override: StepAttrsOption) => {
    const r = utils.deep_extend(attrs, attrs_override);
    eachAttrs(r, (opts, key, attrs) => {
        if (!opts) delete attrs[key];
    });
    return r;
}
