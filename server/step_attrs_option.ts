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

export function merge_v(attrs : StepAttrsOption, prev, v: v): v {
    let r = {};
    let diff = {};
    function merge_one_level(attrs : StepAttrsOption) {
      _.each(attrs, (opt, key) => {
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
        } else if (opt.hidden || opt.readonly) {
            /* security: client must NOT modify hidden/readonly information */
            if (key in prev) r[key] = prev[key];
        } else {
            validate(key, opt, v[key]);
            if (key in v) {
                Object.assign(diff, compute_diff(prev, v, key));
                r[key] = v[key];
            }
        }
        if (key in r && opt.choices) {
            const choice = find_choice(opt.choices, r[key]);
            if (choice && choice.sub) merge_one_level(choice.sub);
        }
      });
    }
    merge_one_level(attrs);

    if (!r['various']) r['various'] = {};
    r['various'].diff = diff;

    return r as v;
}

function validate(key: string, opt: StepAttrOption, val) {
        if (val === '' || val === undefined) {
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
        if (opt.choices) {
            if (val !== undefined && !find_choice(opt.choices, val)) {
                const keys = opt.choices.map(e => e.key);
                throw `constraint ${key}.choices ${keys} failed for ${val}`;
            }
        }
}

/* before sending to client, remove sensible information */
export function export_v(attrs: StepAttrsOption, v) {
    return _.omitBy(v, (_val, key) => ( 
        !attrs[key] || attrs[key].hidden
    ));
}

const find_choice = (choices, key) => choices.find(choice => choice.key == key); // allow equality if key is number and choice.key is string

const transform_toUserOnly_into_hidden_readonly = ({ toUserOnly, ...opt}) => (
    toUserOnly ? { optional: true, readonly: true, ...opt} : opt
);

export const exportAttrs = (attrs: StepAttrsOption) => (
    _.mapValues(attrs, transform_toUserOnly_into_hidden_readonly)
) as StepAttrsOption;
