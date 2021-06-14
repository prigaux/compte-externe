import { find, forIn } from 'lodash';
import { formatDate } from './helpers';

export const find_choice = (oneOf: StepAttrOptionChoicesT<StepAttrOptionM<unknown>>[], val: any) => (
    // tslint:disable-next-line:triple-equals
    find(oneOf, choice => choice.const == val) // allow equality if val is number and choice.const is string
)

export function filterAttrs(attrs: StepAttrsOptionM<unknown>, oneOfTraversal: 'always' | 'never', f: (opts: StepAttrOptionM<unknown>, key: string, attrs: StepAttrsOptionM<unknown>) => boolean): StepAttrsOptionM<unknown> {
    function rec_mpp<T extends MppT<unknown>>(mpp: T) {
        return mpp.merge_patch_parent_properties ? { ...mpp, merge_patch_parent_properties: rec(mpp.merge_patch_parent_properties) } : mpp
    }
    function rec(attrs: StepAttrsOptionM<unknown>) {
        let r: StepAttrsOptionM<unknown> = {};  
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

export function formatValue(val: any) {
    if (val instanceof Date) {
        return formatDate(val, 'dd/MM/yyyy');
    } else {
        return "" + (val || '');
    }
}
