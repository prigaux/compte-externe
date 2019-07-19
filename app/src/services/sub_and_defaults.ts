import { V, StepAttrsOption, StepAttrOption, StepAttrOptionChoices } from '../services/ws';
import { find, forIn, Dictionary } from 'lodash';

const find_choice = (oneOf: StepAttrOptionChoices[], val) => (
    find(oneOf, choice => choice.const === val)
)

const handle_chosen_oneOf_mppp = (opts: StepAttrOption, val: string, rec: (StepAttrsOption) => void) => {
    if (val && opts.oneOf) {
        const choice = find_choice(opts.oneOf, val);
        if (choice && choice.merge_patch_parent_properties) rec(choice.merge_patch_parent_properties);
    }
}

export function filterAttrs(attrs: StepAttrsOption, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption) => boolean): StepAttrsOption {
    function rec(attrs: StepAttrsOption) {
        let r = {};  
        forIn(attrs, (opts, key) => {
            if (!f(opts, key, attrs)) return;
            r[key] = opts = { ...opts };
            if (opts && opts.properties) opts.properties = rec(opts.properties);
            if (opts && opts.oneOf) {
                if (oneOfTraversal === 'always') {
                    opts.oneOf = opts.oneOf.map(choice => (
                        choice.merge_patch_parent_properties ? { ...choice, merge_patch_parent_properties: rec(choice.merge_patch_parent_properties) } : choice
                    ));
                }
            }
        });
        return r;
    }
    return rec(attrs);
}

// assign "default" values
// handle the complex case where "default" values has changed because of "oneOf" "merge_patch_parent_properties"

const may_set_default_value = (k: string, opts: StepAttrOption, v, prev_defaults) => {
    if (!("default" in opts) && !(k in prev_defaults)) {
        // never had defaults
    } else if (!(k in prev_defaults) && !v[k] && opts.default) {
        console.log(`${k}: replacing ${v[k]} with default value ${opts.default} (no prev_default)`);
        v[k] = opts.default;
    } else if (opts.default !== prev_defaults[k] && v[k] === prev_defaults[k]) { // opts.default changed AND user did not modify the value
        console.log(`${k}: replacing ${v[k]} with default value ${opts.default} (prev_default ${prev_defaults[k]})`);
        v[k] = opts.default;
    }
};
 
export function compute_subAttrs_and_handle_default_values(attrs : StepAttrsOption, prev_defaults: Dictionary<string>, v: V) {
    let current_defaults = {};
    const rec = (attrs : StepAttrsOption, attrs_: StepAttrsOption) => {
        forIn(attrs, (opts : StepAttrOption, k) => {
            attrs_[k] = { ...attrs_[k] || {}, ...opts }; // merge
            may_set_default_value(k, attrs_[k], v, prev_defaults || {});
            if ("default" in opts) current_defaults[k] = opts.default;

            if (opts.properties) attrs_[k].properties = rec(opts.properties, {});
            handle_chosen_oneOf_mppp(opts, v[k], attrs => rec(attrs, attrs_));
        });
        return attrs_;
    }
    let attrs_ = rec(attrs, {});

    return { attrs: attrs_, current_defaults };
}
