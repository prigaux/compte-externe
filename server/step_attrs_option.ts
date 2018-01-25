import * as _ from 'lodash';

export function merge_v(attrs : StepAttrsOption, prev, v: v): v {
    _.each(attrs, (opt, key) => {
        if (opt.hidden || opt.readonly) {
            /* security: client must NOT modify hidden/readonly information */
            delete v[key];
        }
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
            delete prev[key];
        }
        validate(key, opt, v[key]);
    });
    return <v> _.assign(prev, v);
}

function validate(key: string, opt: StepAttrOption, val) {
        if (!opt.optional) {
            if (val === '' || val === undefined)
                throw `constraint !${key}.optional failed for ${val}`;
        }
        if (opt.max) {
            if (!(_.isNumber(val) && 0 <= val && val <= opt.max))
                throw `constraint ${key}.max <= ${opt.max} failed for ${val}`;
        }
        if (opt.pattern) {
            let val_ = val !== undefined ? val : '';
            if (!(_.isString(val_) && val_.match("^(" + opt.pattern + ")$")))
                throw `constraint ${key}.pattern ${opt.pattern} failed for ${val}`;
        }
        if (opt.choices) {
            const keys = opt.choices.map(e => e.key);
            if (val !== undefined && !keys.includes(val))
                throw `constraint ${key}.choices ${keys} failed for ${val}`;
        }
}

/* before sending to client, remove sensible information */
export function export_v(attrs: StepAttrsOption, v) {
    return _.omitBy(v, (_val, key) => ( 
        !attrs[key] || attrs[key].hidden
    ));
}

const transform_toUserOnly_into_hidden_readonly = ({ toUserOnly, ...opt}) => (
    toUserOnly ? { optional: true, readonly: true, ...opt} : opt
);

export const exportAttrs = (attrs: StepAttrsOption) => (
    _.mapValues(_.omitBy(attrs, val => val.hidden), transform_toUserOnly_into_hidden_readonly)
) as StepAttrsOption;