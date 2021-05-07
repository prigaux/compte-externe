import { find, forIn, map, mapValues, pickBy } from 'lodash';

const matches_if = (if_, val: string) => (
    if_.optional || val
)

const find_choice = (oneOf: StepAttrOptionChoicesT<StepAttrOptionM<unknown>>[], val: any) => (
    // tslint:disable-next-line:triple-equals
    find(oneOf, choice => choice.const == val) // allow equality if val is number and choice.const is string
)

const handle_then_if_matching = (opts: StepAttrOptionM<unknown>, val: string, rec: (attrs: StepAttrsOptionM<unknown>, mpo: MergePatchOptions) => void) => {
    const then_mppp = opts?.then?.merge_patch_parent_properties
    if (opts.if && then_mppp) {
        console.log(opts.if, val)
        if (matches_if(opts.if, val)) rec(then_mppp, opts.then.merge_patch_options);
    }
}

const handle_chosen_oneOf_mppp = (opts: StepAttrOptionM<unknown>, val: string, rec: (attrs: StepAttrsOptionM<unknown>, mpo: MergePatchOptions) => void) => {
    if (opts.oneOf) {
        const choice = find_choice(opts.oneOf, val);
        if (choice && choice.merge_patch_parent_properties) rec(choice.merge_patch_parent_properties, choice.merge_patch_options);
    }
}

const handle_chosen_oneOf_or_if_then_mppp = (opts: StepAttrOptionM<unknown>, val: string, rec: (attrs: StepAttrsOptionM<unknown>, mpo: MergePatchOptions) => void) => {
    handle_then_if_matching(opts, val, rec);
    handle_chosen_oneOf_mppp(opts, val, rec);
}

export function filterAttrs(attrs: StepAttrsOptionM<unknown>, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOptionM<unknown>, key: string, attrs: StepAttrsOptionM<unknown>) => boolean): StepAttrsOptionM<unknown> {
    function rec_mpp<T extends MppT<unknown>>(mpp: T) {
        return mpp.merge_patch_parent_properties ? { ...mpp, merge_patch_parent_properties: rec(mpp.merge_patch_parent_properties) } : mpp
    }
    function rec(attrs: StepAttrsOptionM<unknown>) {
        let r = {};  
        forIn(attrs, (opts, key) => {
            if (!f(opts, key, attrs)) return;
            r[key] = opts = { ...opts };
            if (opts.properties) opts.properties = rec(opts.properties);
            if (oneOfTraversal === 'always') {
                if (opts.then) {
                    opts.then = rec_mpp(opts.then)
                }
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

const may_set_default_value = (k: string, opts: StepAttrOptionM<unknown>, v, prev_defaults) => {
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

const is_late_ = (key: string, newRootProperties: MergePatchOptions["newRootProperties"]) => (
    newRootProperties === 'ignore' || newRootProperties?.ignore?.includes(key)
)
const is_late = (key: string, e: { merge_patch_options?: MergePatchOptions }) => (
    is_late_(key, e.merge_patch_options?.newRootProperties)
)

type opts_mpo = Dictionary<{ opts: StepAttrOptionM<unknown>; merge_patch_options: MergePatchOptions }>
type opts_and_deps = {
    opts?: StepAttrOptionM<unknown>;
    deps: opts_mpo;
}
type _opts_and_deps = opts_and_deps & {
    late_deps: opts_mpo;
}

const get_ordered_opts_and_dependencies = (attrs: StepAttrsOptionM<unknown>) => {

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

    function rec_mpp(key: string, mpp: MppT<unknown>) {
        for (const innerkey in mpp.merge_patch_parent_properties || {}) {
            const late = is_late(innerkey, mpp);
            getitem(innerkey, late)[late ? 'late_deps' : 'deps'][key] = null;
        }
        rec(mpp.merge_patch_parent_properties, false);
    }

    function rec(attrs: StepAttrsOptionM<unknown>, always: boolean) {
        forIn(attrs, (opts, key) => {
            if (always) getitem(key, false).opts = opts;
            if (opts.then) {
                rec_mpp(key, opts.then)
            }
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


export function compute_mppp_and_handle_default_values(attrs : StepAttrsOptionM<unknown>, prev_defaults: Dictionary<string>, v: CommonV) {
    let current_defaults = {};
    const handle_default = (opts, k: string) => {
        may_set_default_value(k, opts, v, prev_defaults || {});
        if ("default" in opts) current_defaults[k] = opts.default;
    }

    const one_level = (attrs : StepAttrsOptionM<unknown>) => {
        let attrs_opts_and_deps = get_ordered_opts_and_dependencies(attrs);

        const one_attr = (k: string) : StepAttrOptionM<unknown> => {
            const { opts: always_opts, deps } = attrs_opts_and_deps[k];

            // force recursion on deps to get/update(?) conditional (oneOf / if_then) deps opts
            for (const k in deps) one_attr_with_cache(k);
            
            const more_opts = map(deps, (opts_and_mpopts, k) => (
                opts_and_mpopts && { ...opts_and_mpopts, opts: opts_and_mpopts.opts || one_attr(k) }
            )).filter(e => e);

            //console.log("final opts_ for", k, ":", always_opts, more_opts);
            let opts;
            for (const e of [ { opts: always_opts, merge_patch_options: {} }, ...more_opts ]) {
                if (is_late(k, e) && !opts) break;
                
                // merge
                if (e.opts) opts = { ...opts || {}, ...e.opts };
            }
            // we have finished compute opts
            if (!opts) return undefined

            // see if we need to modify current_defaults / v[k]
            handle_default(opts, k);

            // we have final opts & v[k], set conditional deps opts
            handle_chosen_oneOf_or_if_then_mppp(opts, v[k] as string, (attrs, merge_patch_options) => {
                forIn(attrs, (opts, innerkey) => {
                    if (attrs_opts_and_deps[innerkey]) { // missing in case of lonely "ignore", already warned about conf error
                        attrs_opts_and_deps[innerkey].deps[k] = { opts, merge_patch_options };
                    }
                });
            });

            if (opts.properties) opts.properties = one_level(opts.properties);

            return opts;
        };

        let cache: Dictionary<StepAttrOptionM<unknown>> = {};

        function one_attr_with_cache (k: string) : StepAttrOptionM<unknown> {
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
