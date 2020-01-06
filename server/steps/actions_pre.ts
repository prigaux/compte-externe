import * as _ from 'lodash';
import * as basic_auth from 'basic-auth';
import * as ldap from '../ldap';
import { oneExistingPerson } from '../search_ldap';
import * as search_ldap from '../search_ldap';
import { selectUserProfile } from '../step_attrs_option';
import * as esup_activ_bo from '../esup_activ_bo';
import * as cas from '../cas';
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
    let v: v = await oneExistingPerson(filter);
    v.noInteraction = true;
    return { v };
}

export const getShibOrCasAttrs: simpleAction = (req, _sv) => (
    (isCasUser(req) ? getCasAttrs : getShibAttrs)(req, _sv)
)

export const getExistingUser: simpleAction = (req, _sv)  => (
    oneExistingPerson(filters.eq("uid", req.query.uid)).then(v => ({ v }))
);

const handle_profilename_to_modify = (req, v: v) => {
    const profilename = req.query.profilename_to_modify;
    if (profilename) v = { ...selectUserProfile(v, profilename), profilename_to_modify: profilename };
    return { v };
}

export const getExistingUserWithProfile: simpleAction = (req, _sv)  => (
    oneExistingPerson(filters.eq("uid", req.query.uid)).then(v => handle_profilename_to_modify(req, v))
);

export const getCasAttrsWithProfile: simpleAction = (req, _sv)  => (
    getCasAttrs(req, null).then(sv => handle_profilename_to_modify(req, sv.v))
);

export const esup_activ_bo_validateAccount = (isActivation: boolean) : simpleAction => (req, _sv) => {
    const userInfo = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, search_ldap.v_from_WS(req.query), { toEsupActivBo: true });
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

export const esup_activ_bo_authentificateUser = (userAuth: 'useSessionUserId' | 'useBasicAuthUser') : simpleAction => async (req, _sv) => {
    const { wantedConvert, attrRemapRev } = ldap.convert_and_remap(conf.ldap.people.types, conf.ldap.people.attrs);
    const auth = basic_auth(req);
    if (!auth) throw "Bad Request";
    if (userAuth === 'useSessionUserId') {
        auth.name = req.user.id
        if (!auth.name) throw "Bad Request";
    }
    const o = await esup_activ_bo.authentificateUser(auth.name, auth.pass, _.without(Object.keys(attrRemapRev), 'userPassword'));
    const v = ldap.handleAttrsRemapAndType(o as any, attrRemapRev, { code: '', ...conf.ldap.people.types }, wantedConvert)
    return { v }
}

export const esup_activ_bo_authentificateUserWithCas : simpleAction = async (req, _sv) => {
    const { wantedConvert, attrRemapRev } = ldap.convert_and_remap(conf.ldap.people.types, conf.ldap.people.attrs);
    const targetUrl = conf.mainUrl; // anything would do... weird esup_activ_bo... 
    const proxyticket = await cas.get_proxy_ticket(req, targetUrl);
    if (!proxyticket) throw "failed getting CAS proxy ticket";
    const o = await esup_activ_bo.authentificateUserWithCas(req.user.id, proxyticket, targetUrl, Object.keys(attrRemapRev));
    if (!o.code) throw "weird account: CAS is authorized by esup-activ-bo thinks user is not activated"
    const v = ldap.handleAttrsRemapAndType(o as any, attrRemapRev, { code: '', ...conf.ldap.people.types }, wantedConvert);
    return { v };
}
