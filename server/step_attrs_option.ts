import * as _ from 'lodash';

function compute_diff(prev, current, key) {
    const toString = (val) => (
        val instanceof Array ? val.join(', ') : val || ''
    );
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
        handle_chosen_oneOf_sub(opt, r[key], merge_one_level);
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
                val.forEach((val_, i) => validate(`${key}-${i}`, opt.items, more_opt.items, val_, prev));
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
            if (!opts.hidden && key in v) r[key] = v[key];

            handle_chosen_oneOf_sub(opts, v[key], rec);
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
            handle_chosen_oneOf_sub(opts, v[key], rec);
        });
    }
    rec(attrs);
    return r;
}

const handle_chosen_oneOf_sub = (opts: StepAttrOption, val: string, rec: (StepAttrsOption) => void) => {
    if (val && opts.oneOf) {
        const choice = find_choice(opts.oneOf, val);
        if (choice && choice.sub) rec(choice.sub);
    }
}

const find_choice = (oneOf, val) => oneOf.find(choice => choice.const == val); // allow equality if val is number and choice.const is string

const transform_toUserOnly_into_optional_readonly = ({ toUserOnly, ...opt} : StepAttrOption) => {
    opt = toUserOnly ? { optional: true, readOnly: true, ...opt} : opt;
    if (opt.oneOf_async) opt.oneOf_async = true as any;
    (opt.oneOf || []).forEach(one => {        
        if (one.sub) one.sub = exportAttrs(one.sub);
    });
    return opt;
}

export const exportAttrs = (attrs: StepAttrsOption) => (
    _.mapValues(_.omitBy(attrs, val => val.hidden), transform_toUserOnly_into_optional_readonly)
) as StepAttrsOption;
