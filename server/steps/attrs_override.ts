import * as _ from 'lodash';
import * as search_ldap from '../search_ldap';


const _to_oneOf = async (oneOf_async, consts) => (
    _.flatten(await Promise.all(consts.map(code => oneOf_async(code, 1)))) as StepAttrOptionChoices[]
)

export const group_for_each_attr_codes = (codeAttr: string, { group_cn_to_code }, oneOf_async) => (
    async (req, _sv) => {
        const consts = await search_ldap.filter_user_memberOfs(group_cn_to_code, req.user);
        const oneOf = await _to_oneOf(oneOf_async, consts);
        if (oneOf.length === 0) {
            console.error("attrs_override.group_for_each_attr_codes: no group found for logged user", req.user.id)
            throw "Forbidden";
        }
        return { [codeAttr]: { default: oneOf[0].const, oneOf } } as StepAttrsOption
    }
)