import * as _ from 'lodash';
import * as utils from '../utils';
import * as step_attrs_option from '../step_attrs_option'
import * as search_ldap from '../search_ldap';

export const group_for_each_attr_codes = (
    codeAttr: string, 
    { group_cn_to_code } : search_ldap.group_and_code_fns, 
    code_to_choice: (code: string, nb: number) => any, 
    group_cn_to_choice: (cn: string, choice: StepAttrOptionChoices) => Promise<StepAttrOptionChoices>,
) => {
    const _to_StepAttrOptionChoices = async (cn_and_const: { code: string, cn: string }) => {
        const choices = await code_to_choice(cn_and_const.code, 1)
        let choice: StepAttrOptionChoices = choices.length ? choices[0] : { const: cn_and_const.code }
        if (group_cn_to_choice) {
            choice = await group_cn_to_choice(cn_and_const.cn, choice)
        }
        return choice
    }
    
    return async (req: req, _sv: sv) => {
        const group_cn_to_ = (cn: string) => {
            const code = group_cn_to_code(cn);
            return code && { code, cn }
        }
        const cn_and_consts = await search_ldap.filter_user_memberOfs(group_cn_to_, req.user);
        const oneOf = await Promise.all(cn_and_consts.map(_to_StepAttrOptionChoices));
        if (oneOf.length === 0) {
            console.error("attrs_override.group_for_each_attr_codes: no group found for logged user", req.user.id)
            throw "Forbidden";
        }
        return { [codeAttr]: { default: oneOf[0].const, oneOf } } as StepAttrsOption
    }
}

export interface MoreAttrOption_cond_overrides { 
    cond_overrides?: Dictionary<StepAttrOptionT<StepAttrOption_no_extensions> | ((v: v) => Promise<StepAttrOptionT<StepAttrOption_no_extensions>>)>;
}

type StepAttrOption_with_cond_overrides = Dictionary<StepAttrOptionT<MoreAttrOption_cond_overrides>>

const compute_overrides = (allowed_conds: Dictionary<boolean>, with_conds: StepAttrOption_with_cond_overrides, v: v) => {
    const override : StepAttrsOption = {};
    _.each(with_conds, (opts, attrName) => {
        if ("cond_overrides" in opts) {
            for (const cond in opts.cond_overrides) {
                if (allowed_conds[cond]) {
                    const val = opts.cond_overrides[cond];
                    override[attrName] = typeof val === "function" ? val(v) : val
                    break;
                } else {
                    if (!(cond in allowed_conds)) throw "unknown cond_overrides " + cond;
                }
            }
        }
        const extend_override = (opts: StepAttrOption) => {
            if (!(attrName in override)) override[attrName] = {};
            override[attrName] = utils.deep_extend(opts, override[attrName])
        }
        if (opts.properties) {
            extend_override({ properties: compute_overrides(allowed_conds, opts.properties, v) })
        }
        if (opts.then?.merge_patch_parent_properties) {
            extend_override({ then: { merge_patch_parent_properties: compute_overrides(allowed_conds, opts.then.merge_patch_parent_properties, v) } })
        }
    });
    return override
}

export const add_not_conds = (conds: Dictionary<(v: v) => boolean>) => {
    conds = {...conds};
    _.each(conds, (predicate, name) => {
        conds[`not_${name}`] = (v) => !predicate(v)
    })
    return conds;
}

export const handle_attrs_cond_overrides = (conds: Dictionary<(v: v) => boolean>) => (with_conds: StepAttrOption_with_cond_overrides) => {
    const attrs = step_attrs_option.mapAttrs(with_conds, (opts) => _.omit(opts, ['cond_overrides']));
    const attrs_override = async (_req: req, sv: sv) => {
        const allowed_conds = _.mapValues(conds, predicate => predicate(sv.v));
        const override = compute_overrides(allowed_conds, with_conds, sv.v)
        return override;
    };
    return { attrs, attrs_override };
}
