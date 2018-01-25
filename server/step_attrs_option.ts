import * as _ from 'lodash';

export function merge_v(attrs : StepAttrsOption, prev, v: v): v {
    _.each(attrs, (opt, key) => {
        let val = v[key];
        if (opt.hidden || opt.readonly) {
            /* security: client must NOT modify hidden/readonly information */
            delete v[key];
        }
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
            delete prev[key];
        }
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
    });
    return <v> _.assign(prev, v);
}

/* before sending to client, remove sensible information */
export function export_v(attrs: StepAttrsOption, v) {
    return _.omitBy(v, (_val, key) => ( 
        !attrs[key] || attrs[key].hidden
    ));
}

export const exportAttrs = (attrs: StepAttrsOption) => (
    <StepAttrsOption> _.omitBy(attrs, val => val.hidden)
);