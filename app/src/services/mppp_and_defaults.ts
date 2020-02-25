import { V, Mpp, StepAttrsOption, StepAttrOption, StepAttrOptionChoices, MergePatchOptions } from '../services/ws';
import { find, forIn, map, mapValues, pickBy, Dictionary } from 'lodash';

const find_choice = (oneOf: StepAttrOptionChoices[], val) => (
    find(oneOf, choice => choice.const === val)
)

const handle_chosen_oneOf_mppp = (opts: StepAttrOption, val: string, rec: (attrs: StepAttrsOption, mpo: MergePatchOptions) => void) => {
    if (val && opts.oneOf) {
        const choice = find_choice(opts.oneOf, val);
        if (choice && choice.merge_patch_parent_properties) rec(choice.merge_patch_parent_properties, choice.merge_patch_options);
    }
}

export function filterAttrs(attrs: StepAttrsOption, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOption, key: string, attrs: StepAttrsOption) => boolean): StepAttrsOption {
    function rec_mpp<T extends Mpp>(mpp: T) {
        return mpp.merge_patch_parent_properties ? { ...mpp, merge_patch_parent_properties: rec(mpp.merge_patch_parent_properties) } : mpp
    }
    function rec(attrs: StepAttrsOption) {
        let r = {};  
        forIn(attrs, (opts, key) => {
            if (!f(opts, key, attrs)) return;
            r[key] = opts = { ...opts };
            if (opts.properties) opts.properties = rec(opts.properties);
            if (oneOfTraversal === 'always') {
                if (opts.oneOf) {
                    opts.oneOf = opts.oneOf.map(rec_mpp);
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

const is_late = (e: { merge_patch_options?: MergePatchOptions }) => (
    (e.merge_patch_options || {}).newRootProperties === 'ignore'
)

type opts_mpo = Dictionary<{ opts: StepAttrOption; merge_patch_options: MergePatchOptions }>
type opts_and_deps = {
    opts?: StepAttrOption;
    deps: opts_mpo;
}
type _opts_and_deps = opts_and_deps & {
    late_deps: opts_mpo;
}

const get_ordered_opts_and_dependencies = (attrs: StepAttrsOption) => {

    let normal: Dictionary<_opts_and_deps> = {};
    let late: Dictionary<_opts_and_deps> = {};
    const getitem = (key, is_late_) => {
        let r = normal;
        if (key in r) {
            // easy, we already have the real position
        } else if (is_late_) {
            // we do not know the position, accumulate elsewhere
            r = late;
        } else if (key in late) {
            // we know the real position in "normal"
            normal[key] = late[key];
            delete late[key];
        }

        if (!(key in r)) r[key] = { deps: {}, late_deps: {} };
        return r[key];
    };

    function rec_mpp(key: string, mpp: Mpp) {
        for (const innerkey in mpp.merge_patch_parent_properties || {}) {
            const late = is_late(mpp);
            getitem(innerkey, late)[late ? 'late_deps' : 'deps'][key] = null;
        }
        rec(mpp.merge_patch_parent_properties, false);
    }

    function rec(attrs: StepAttrsOption, always: boolean) {
        forIn(attrs, (opts, key) => {
            if (always) getitem(key, false).opts = opts;
            if (opts.oneOf) {
                for (const one of opts.oneOf) {
                    rec_mpp(key, one);
                }
            }
        });
    }

    rec(attrs, true);

    if (Object.keys(late).length) console.error("configuration error: " + Object.keys(late).join(',') + " is only present with newRootProperties 'ignore'");

    const merge_late_deps = ({ deps, late_deps, ...e } : _opts_and_deps) : opts_and_deps => (
        { ...e, deps: { ...deps, ...late_deps } }
    );
    return mapValues(normal, merge_late_deps)
}


export function compute_mppp_and_handle_default_values(attrs : StepAttrsOption, prev_defaults: Dictionary<string>, v: V) {
    let current_defaults = {};
    const handle_default = (opts, k: string) => {
        may_set_default_value(k, opts, v, prev_defaults || {});
        if ("default" in opts) current_defaults[k] = opts.default;
    }

    const one_level = (attrs : StepAttrsOption) => {
        let attrs_opts_and_deps = get_ordered_opts_and_dependencies(attrs);

        const one_attr = (k: string) : StepAttrOption => {
            const { opts: always_opts, deps } = attrs_opts_and_deps[k];

            // resolve dependencies            
            for (const k in deps) one_attr_with_cache(k);
            
            const more_opts = map(deps, (opts_and_mpopts, k) => (
                opts_and_mpopts && { ...opts_and_mpopts, opts: opts_and_mpopts.opts || one_attr(k) }
            )).filter(e => e);

            //console.log("final opts_ for", k, ":", always_opts, more_opts);
            let opts;
            for (const e of [ { opts: always_opts, merge_patch_options: {} }, ...more_opts ]) {
                if (is_late(e) && !opts) break;
                
                // merge
                if (e.opts) opts = { ...opts || {}, ...e.opts };
            }
            if (!opts) return undefined

            handle_default(opts, k);

            handle_chosen_oneOf_mppp(opts, v[k], (attrs, merge_patch_options) => {
                forIn(attrs, (opts, innerkey) => {
                    attrs_opts_and_deps[innerkey].deps[k] = { opts, merge_patch_options };
                });
            });

            if (opts.properties) opts.properties = one_level(opts.properties);

            return opts;
        };

        let cache: Dictionary<StepAttrOption> = {};

        function one_attr_with_cache (k: string) : StepAttrOption {
            if (!(k in cache)) cache[k] = one_attr(k);
            return cache[k];
        }
        
        // NB: keep order of attrs_opts_and_deps
        let r = mapValues(attrs_opts_and_deps, (_, k) => one_attr_with_cache(k))
        // remove null
        return pickBy(r, opts => opts);
    }
    let r = one_level(attrs);
    //console.log('final result', JSON.stringify(r, undefined, '  '))

    return { attrs: r, current_defaults };
}
