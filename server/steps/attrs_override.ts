import * as _ from 'lodash';
import * as utils from '../utils';
import * as search_ldap from '../search_ldap';

export const group_for_each_attr_codes = (codeAttr: string, { group_cn_to_code }, code_to_choice) => {
    const _to_StepAttrOptionChoices = async (code) => {
        const choices = await code_to_choice(code, 1)
        const choice: StepAttrOptionChoices = choices.length ? choices[0] : { const: code }
        return choice
    }
    
    return async (req, _sv) => {
        const codes = await search_ldap.filter_user_memberOfs(group_cn_to_code, req.user);
        const oneOf = await Promise.all(codes.map(_to_StepAttrOptionChoices));
        if (oneOf.length === 0) {
            console.error("attrs_override.group_for_each_attr_codes: no group found for logged user", req.user.id)
            throw "Forbidden";
        }
        return { [codeAttr]: { default: oneOf[0].const, oneOf } } as StepAttrsOption
    }
}

export interface MoreAttrOption_if { 
    if?: Dictionary<StepAttrOptionT<StepAttrOption_no_extensions> | ((v: v) => Promise<StepAttrOptionT<StepAttrOption_no_extensions>>)>;
}

type StepAttrOption_with_if = Dictionary<StepAttrOptionT<MoreAttrOption_if>>

const compute_overrides = (allowed_ifs: Dictionary<boolean>, with_ifs: StepAttrOption_with_if, v: v) => {
    const override : StepAttrsOption = {};
    _.each(with_ifs, (opts, attrName) => {
        if ("if" in opts) {
            for (const cond in opts.if) {
                if (allowed_ifs[cond]) {
                    const val = opts.if[cond];
                    override[attrName] = typeof val === "function" ? val(v) : val
                    break;
                }
            }
        }
        if (opts.properties) {
            if (!(attrName in override)) override[attrName] = {};
            override[attrName] = utils.deep_extend({ properties: compute_overrides(allowed_ifs, opts.properties, v) }, override[attrName])
        }
    });
    return override
}

export const add_not_ifs = (ifs: Dictionary<(v: v) => boolean>) => {
    _.each(ifs, (predicate, name) => {
        ifs[`not_${name}`] = (v) => !predicate(v)
    })
    return ifs;
}

export const handle_attrs_if = (ifs: Dictionary<(v: v) => boolean>) => (with_ifs: StepAttrOption_with_if) => {
    const attrs = utils.mapAttrs(with_ifs, (opts) => _.omit(opts, ['if']));
    const attrs_override = async (_req, sv : sv) => {
        const allowed_ifs = _.mapValues(ifs, predicate => predicate(sv.v));
        const override = compute_overrides(allowed_ifs, with_ifs, sv.v)
        return override;
    };
    return { attrs, attrs_override };
}
