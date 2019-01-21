import { V, StepAttrsOption, StepAttrOption } from '../services/ws';
import { find, forIn, mapValues, pickBy, Dictionary } from 'lodash';

// assign "default" values
// handle the complex case where "default" values has changed because of "oneOf" "sub"

const may_set_default_value = (k: string, opts: StepAttrOption, v, prev_defaults) => {
    if (!("default" in opts) && !(k in prev_defaults)) {
        // never had defaults
    } else if (!(k in prev_defaults) && !v[k] &&opts.default) {
        console.log(`${k}: replacing ${v[k]} with default value ${opts.default} (no prev_default)`);
        v[k] = opts.default;
    } else if (opts.default !== prev_defaults[k] && v[k] === prev_defaults[k]) { // opts.default changed AND user did not modify the value
        console.log(`${k}: replacing ${v[k]} with default value ${opts.default} (prev_default ${prev_defaults[k]})`);
        v[k] = opts.default;
    }
};
 
export function compute_subAttrs_and_handle_default_values(attrs : StepAttrsOption, prev_defaults: Dictionary<string>, v: V) {
    let attrs_ = {};
    const add_subAttrs = (attrs : StepAttrsOption) => {
        forIn(attrs, (opts : StepAttrOption, k) => {
            attrs_[k] = { ...attrs_[k] || {}, ...opts }; // merge
            may_set_default_value(k, attrs_[k], v, prev_defaults || {});

            if (opts.oneOf && v[k]) {
                const selected = find(opts.oneOf, choice => choice.const === v[k]);
                if (selected && selected.sub) {
                    add_subAttrs(selected.sub);
                }
            }
        });
    }
    add_subAttrs(attrs);

    //console.log(JSON.stringify(attrs_.duration, null, ' '), JSON.stringify(v.duration, null, ' '));

    prev_defaults = mapValues(pickBy(attrs_, (opts) => "default" in opts), (opts) => opts['default']);

    return { attrs: attrs_, prev_defaults };
}
