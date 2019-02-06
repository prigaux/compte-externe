import * as _ from 'lodash';
import * as ldap from '../ldap';
import { onePerson } from '../search_ldap';
import * as search_ldap from '../search_ldap';
import { selectUserProfile } from '../step_attrs_option';
import * as esup_activ_bo from '../esup_activ_bo';
import * as conf from '../conf';
const filters = ldap.filters;


const isCasUser = (req) => {
    let idp = req.header('Shib-Identity-Provider');
    return idp && idp === conf.cas_idp;
}

export const getShibAttrs: simpleAction = async (req, _sv) => {
    if (!req.user) throw `Unauthorized`;
    let v = _.mapValues(conf.shibboleth.header_map, headerName => (
        req.header(headerName)
    )) as any as v;
    console.log("action getShibAttrs:", v);
    return { v };
};

export const getCasAttrs: simpleAction = async (req, _sv) => {
    if (!isCasUser(req)) throw `Unauthorized`;
    let filter = search_ldap.currentUser_to_filter(req.user);
    let v: v = await onePerson(filter);
    v.noInteraction = true;
    return { v };
}

export const getShibOrCasAttrs: simpleAction = (req, _sv) => (
    (isCasUser(req) ? getCasAttrs : getShibAttrs)(req, _sv)
)

export const getExistingUser: simpleAction = (req, _sv)  => (
    onePerson(filters.eq("uid", req.query.uid)).then(v => ({ v }))
);

export const getExistingUserWithProfile: simpleAction = (req, _sv)  => (
    onePerson(filters.eq("uid", req.query.uid)).then(v => {
        const profilename = req.query.profilename_to_modify;
        if (profilename) v = selectUserProfile(v, profilename);
        return { v };
    })
);

export const esup_activ_bo_validateAccount = (isActivation: boolean) : simpleAction => (req, _sv) => {
    const userInfo = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, search_ldap.v_from_WS(req.query), { toJson: true });
    delete userInfo.code;
    const { wantedConvert, attrRemapRev } = ldap.convert_and_remap(conf.ldap.people.types, conf.ldap.people.attrs);
    return esup_activ_bo.validateAccount(userInfo as any, _.without(Object.keys(attrRemapRev), 'userPassword')).then(o => {
        if (isActivation && !o.code) throw "Compte déjà activé";
        if (!isActivation && o.code) throw "Compte non activé";
        return { ..._.pick(o, 'possibleChannels', 'code'), ... ldap.handleAttrsRemapAndType(o as any, attrRemapRev, conf.ldap.people.types, wantedConvert) }
    }).then(v => ({ v }))
}

export const esup_activ_bo_validateCode : simpleAction = (req, sv) => (
    esup_activ_bo.validateCode(req.query.supannAliasLogin, req.query.code).then(ok => {
        if (!ok) throw "Code invalide";
        return sv;
    })
)
