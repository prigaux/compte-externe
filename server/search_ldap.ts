'use strict';

import * as _ from 'lodash';
import * as conf from './conf';
import shared_conf from '../shared/conf';
import * as ldap from './ldap';
import * as helpers from './helpers';
const filters = ldap.filters;

const maxLoginLength = 10;

const remove_accents = _.deburr;

export const persons = (filter: string, options: ldap.Options) => (
    ldap.search(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, options)
);

export const onePerson = (filter: string) => (
    ldap.searchOne(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, {})
);

export const onePersonAttr = (filter: string, attr: string) => (
    ldap.searchOneThisAttr(conf.ldap.base_people, filter, attr, '', {})
);


export const oneExistingPerson = (filter: string) => (
    onePerson(filter).then(v => {
        if (!v) throw "no match for " + filter;
        return v;
    })
)

export const onePersonLoginToMail = (login: string) => (
    onePersonAttr(filters.eq("uid", login), 'mail')
)

export const oneGroupAttr = (cn: string, attr: string) => (
    ldap.searchOneThisAttr(conf.ldap.base_groups, filters.eq('cn', cn), attr, '')
)

export const v_from_WS = (v: Dictionary<any>) => (
    _.mapValues(v, (val, attr) => {
        let attrType = (conf.ldap.people.types as Dictionary<any>)[attr];
        return _.isDate(attrType) ? new Date(val) : 
          _.isNumber(attrType) && val ? parseFloat(val) :
          val;
    }) as v
)

export const currentUser_to_filter = (user: CurrentUser) => {
    const user_id = user && user.id
    const attr = user_id && user_id.match(/@/) ? "eduPersonPrincipalName" : "uid";
    return filters.eq(attr, user_id)
}

export const structures = (token: string, sizeLimit: number) => {
    let words_filter = filters.fuzzy(['description', 'ou'], token);
    let many = [filters.eq("supannCodeEntite", token), 
                filters.and([ words_filter, "(supannCodeEntite=*)"])];
    return ldap.searchMany(conf.ldap.base_structures, many, 'const', conf.ldap.structures.types, conf.ldap.structures.attrs, {sizeLimit});
};

export const filtered_etablissements = (global_filter: string) => (token: string, sizeLimit: number) => {
    let filters_;
    if (token.match(/\{.*/)) {
        filters_ = [filters.eq("up1TableKey", token)]
    } else if (token.match(/^[0-9\s-]{5,14}$/)) {
        filters_ = [filters.startsWith("up1TableKey", ldap.convert_toLdap_string(conf.ldap.etablissements.attrs.siret, token))];
    } else if (helpers.is_valid_uai_code(token)) {
        filters_ = [filters.startsWith("up1TableKey", ldap.convert_toLdap_string(conf.ldap.etablissements.attrs.uai, token))];
    } else {
        filters_ = [
            filters.eq('ou', token),
            filters.fuzzy(['ou'], token),
            filters.fuzzy(['description', 'cn', 'displayName'], token),
        ]
    }
    if (global_filter) {
        filters_ = filters_.map(filter => filters.and([ filter, global_filter ]))
    }
    return ldap.searchMany(conf.ldap.base_etablissements, filters_, 'const', conf.ldap.etablissements.types, conf.ldap.etablissements.attrs, {sizeLimit})
};

export const etablissements = filtered_etablissements(null)

const people_filters = (token: string) => ([ 
    filters.eq('uid', token),
    filters.fuzzy(['displayName', 'cn'], token),
])

const people_filters_ = (token: string, and_filters: string[]) => (
    people_filters(token).map(filter => filters.and([ ...and_filters, filter ]))
)

export const people_choices = (filter: string) => async (token: string, sizeLimit: number) => {
    sizeLimit = Math.min(sizeLimit, 10);
    let filters_ = people_filters_(token, filter ? [filter] : []);
    const l = await ldap.searchMany(conf.ldap.base_people, filters_, 'uid', { uid: '', displayName: '', global_eduPersonPrimaryAffiliation: '' }, undefined, { sizeLimit })
    const affs = [ ...Object.keys(shared_conf.affiliation_labels), undefined ] // NB: we want no affiliation users displayed last
    const l_ = _.sortBy(l, e => affs.indexOf(e.global_eduPersonPrimaryAffiliation)).map(e => ({ const: e.uid, 
        title: `${e.displayName} (${e.uid})`,
        header: `${shared_conf.affiliation_labels[e.global_eduPersonPrimaryAffiliation] || 'Divers'}`,
    }))
    helpers.replace_same_field_value_with_idem(l_, 'header', '')
    return l_
}

function suggested_mail(sn: string, givenName: string) {
    let s = remove_accents(sn);
    if (givenName) {
        givenName = remove_accents(givenName);
        // prénom présent: on exclue les points et on le préfixe au sn
        s = givenName.replace(/\./g, '') + "." + s.replace(/\./g, '');
    }
    s = s.replace(/\([^()]*\)/g, ''); // suppr. texte entre prenthèses
    s = s.replace(/["',;:]/g, '');    // suppr. apostrophes et quotes et ponctuation
    s = s.replace(/[^a-z0-9.]+/gi, '-'); // remplace tous autres car. indésirables par "-"
    s = s.replace(/^-+|-+$/g, '');    // purge tirets+points début/fin
    s = s.replace(/-*\.-*/g, '.');    // purge tirets autour du "."
    return s;
}

function homonymes_filter(sns: string[], givenNames: string[], birthDay: Date, supannMailPerso?: string): ldap.filter {

    function cn_filter() {
        return filters.alike_no_accents('cn', sns[0] + '*' + (givenNames[0] || ""));
    }

    function sn_givenName_filter() {
        let l = [];
        l.push(filters.or(shared_conf.sns.map(attr =>
            filters.alike_many(ldap.toLdapAttr((conf.ldap.people.attrs as Dictionary<any>)[attr], attr), sns)
        )));

        if (givenNames && givenNames.length) {
            l.push(filters.alike_many('givenName', givenNames));
        }
        return filters.and(l);
    }

    function mail_filter() {
        return filters.startsWith("mail", suggested_mail(sns[0], givenNames[0]) + '@');
    }

    const [ birthDay_filter ] = subv_to_eq_filters({ birthDay });

    let l = [ filters.and([ cn_filter(), birthDay_filter ]),
              filters.and([ sn_givenName_filter(), birthDay_filter ]),
              filters.and([ mail_filter(), birthDay_filter ]) ];
    if (supannMailPerso) {
        l.push(filters.eq('supannMailPerso', supannMailPerso));
        l.push(filters.eq('mail', supannMailPerso));
    }
    //console.log("homonymes_filter", l);
    return filters.or(l);
}

export type Homonyme = typeof conf.ldap.people.types & { score: number }

const _homonymes_accountStatus_score: Dictionary<number> = {
    "active": 3,
    "": 2,
    "disabled": 1,
    "deleted": 0
}

function homonymes_scoring(l: typeof conf.ldap.people.types[], preferStudent: boolean): Homonyme[] {
    let l_ = _.map(l, e => {
      let scores = [
        ... (preferStudent ? [
            e.supannEtuId ? 1 : 0, // Apogée user
            (e.mailHost || '').match(/^malix/) ? 1 : 0,
        ] : []),
            _homonymes_accountStatus_score[e.accountStatus || ''] || 0,
            e.up1KrbPrincipal ? 1 : 0, // has password
            e.mailHost ? 1 : 0, // has email address
            e.supannEmpId ? 1 : 0, // SIHAM user. Why prefer it over ???
            e.global_eduPersonPrimaryAffiliation === 'student' ? 1 : 0, // still prefer student ???
      ];
      let score = scores.reduce((score, subscore) => score * 10 + subscore, 0);
      return <Homonyme> _.merge({ score }, e);
    });
    return _.sortBy(l_, 'score').reverse();
}

const homonymes_ = (sns: string[], givenNames: string[], birthDay: Date, supannMailPerso: string, preferStudent: boolean) : Promise<Homonyme[]> => {
    let filter = homonymes_filter(sns, givenNames, birthDay, supannMailPerso);
    if (conf.ldap.people.homonymes_restriction) {
        filter = filters.and([filter, conf.ldap.people.homonymes_restriction]);
        //console.log("homonymes filter", filter);
    }
    //console.log("homonymes", sns, givenNames, birthDay);
    const sizeLimit = 99; // big enough to handle many results, eg for "Philippe Martin"
    return persons(filter, { sizeLimit }).then(l => homonymes_scoring(l, preferStudent));
};

const _flatten_at = (v: v, attrs: string[]) => (
    _.flatten(
        _.at(v, attrs) as (string|string[])[]
    ).filter(s => s)
)

export const homonymes = (v: v) : Promise<Homonyme[]> => {
    let sns: string[] = _.compact(_flatten_at(v, shared_conf.sns));
    let givenNames = _flatten_at(v, shared_conf.givenNames);    
    if (sns[0] === undefined || !v.birthDay) return Promise.resolve([]);
    console.log("sns", sns);
    const preferStudent = conf.ldap.people.homonymes_preferStudent(v.profilename);
    return homonymes_(sns, givenNames, v.birthDay, v.supannMailPerso, preferStudent);    
};

export const subv_to_eq_filters = (subv: Partial<v>) => {
    // limitation: do not handle multi-valued attrs
    const v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, subv as any, {});
    return _.map(v_ldap, (val, attr) => filters.eq(attr, val as string));
}

export function searchPeople_matching_acl_ldap_filter<T extends {}>(acl_filter: acl_ldap_filter, step_filter: string, token: string, attrTypes: T, options: ldap.Options): Promise<T[]> {
    if (acl_filter === false) return Promise.resolve([]);
    const many_filters = people_filters_(token, [
        ... acl_filter !== true ? [acl_filter] : [],
        ... step_filter ? [step_filter] : [],
    ])
    console.log("searchPeople_matching_acl_ldap_filter with filter", many_filters);
    return ldap.searchMany(conf.ldap.base_people, many_filters, 'uid', attrTypes, conf.ldap.people.attrs, options);
}

// export it to allow override
export let existLogin = (login: string): Promise<boolean> => (
    ldap.searchOne(conf.ldap.base_people, filters.eq("uid", login), {}, null).then(v => (
        !!v
    ))
);

export const existPeople = (peopleFilter: string): Promise<boolean> => (
    ldap.searchRaw(conf.ldap.base_people, peopleFilter, ['uid'], { sizeLimit: 1 }).then(l => l.length > 0)
);

function truncateLogin(login: string) {
    return login.substr(0, maxLoginLength);
}

function checkLogin(login: string) {
    let ok = login.match(/[a-z]/);
    if (!ok) {
        console.error('genLogin: ' + login + ': le login doit contenir au moins un caractère alphabétique');
    }
    return !!ok;
}

function accronyms(l: string[], length: number) {
    length = length || 1;
    return l.map(s => (
        s.substr(0, length)
    )).join('');
}

function accronyms_and_sn(sn: string, givenNames: string[], coll: number): string {
    return truncateLogin(accronyms(givenNames, coll) + sn);
}

function genLogin_numeric_suffix(base: string, coll: number): Promise<string> {
    let login = base.substr(0, maxLoginLength - ("" + coll).length) + coll;
    if (!checkLogin(login)) {
        // argh, no letters anymore :-(
        return undefined;   
    } else {
        return existLogin(login).then(exist => {
            if (!exist) {
                // yeepee
                return login;
            } else {
                return genLogin_numeric_suffix(base, coll + 1);
            }
        });
    }
}

function genLogin_accronyms_prefix(sn: string, givenNames: string[], coll: number, prev: string = null): Promise<string> {
    // composition initiales du prénom + nom avec test conflits
    if (coll >= maxLoginLength) return undefined;
    let login = accronyms_and_sn(sn, givenNames, coll);
    if (!checkLogin(login)) {
        // weird...
        return undefined;
    } else if (login === prev) {
        return undefined;
    } else {
        return existLogin(login).then(exist => {
            if (!exist) {
                // yeepee
                return login;
            } else {
                return genLogin_accronyms_prefix(sn, givenNames, coll + 1, login);
            }
        });
    }
}

// génère un login unique
export const genLogin = (sn: string, givenName: string): Promise<string> => {
    if (!sn) return <Promise<string>> Promise.resolve(undefined);
    sn = remove_accents(sn);
    sn = sn.toLowerCase().replace(/[^a-z0-9]/g, '');

    givenName = remove_accents(givenName || "");
    givenName = givenName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let givenNames = _.compact(givenName.split("-"));

    return genLogin_accronyms_prefix(sn, givenNames, 1).then(login => (
        login ||
            genLogin_numeric_suffix(accronyms_and_sn(sn, givenNames, 1), 1)
    ));

};

export type group_and_code_fns = {
    code_to_group_cn(code: string): string
    group_cn_to_code(cn: string): string
}

export const prefix_suffix_to_group_and_code = (prefix: string, suffix: string): group_and_code_fns => {
    const regexp_cn_to_code = new RegExp("^" + _.escapeRegExp(prefix) + "(.*)" + _.escapeRegExp(suffix) + "$");
    return {
        code_to_group_cn: (code: string) => prefix + code + suffix,
        group_cn_to_code: (cn: string) => (cn.match(regexp_cn_to_code) || [])[1],
    }
}

export const filter_user_memberOfs = async <T>(group_cn_to: (cn: string) => T, user: CurrentUser) => {
    const user_ = await ldap.searchOne(conf.ldap.base_people, currentUser_to_filter(user), { memberOf: [''] }, {});
    const r: T[] = [];
    for (const memberOf of user_.memberOf || []) {
        const cn = conf.ldap.memberOf_to_group_cn(memberOf);
        const o = cn && group_cn_to(cn);
        if (o) r.push(o);
    }
    return r;
}

export const searchInternalMail = async (email: string): Promise<{ internal?: v; external?: true }> => {
    if (!email) return { external: true };

    const domain = email.match(/@(.*)/)?.[1]
    if (!domain) throw "invalid mail address " + email
    
    if (!conf.ldap.people.mail_domains.includes(domain)) return { external: true };

    const user = await onePerson(filters.eq('mail', email));
    return { internal: user }
}