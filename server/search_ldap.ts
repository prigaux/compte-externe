'use strict';

import * as _ from 'lodash';
import * as conf from './conf';
import * as ldap from './ldap';
const filters = ldap.filters;

const maxLoginLength = 10;

const remove_accents = _.deburr;

export const onePerson = (filter) => (
    ldap.searchOne(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, {})
);

export const vuser = (user: CurrentUser) => {
    if (!user) return Promise.resolve(undefined);
    return onePerson(filters.eq("eduPersonPrincipalName", user.id)).then(vuser => {
        if (!vuser) console.error("unknown user", user)
        return vuser;
    })
};

export const structures = (token: string, sizeLimit: number) => {
    let words_filter = filters.fuzzy(['description', 'ou'], token);
    let many = [filters.eq("supannCodeEntite", token), 
                filters.and([ words_filter, "(supannCodeEntite=*)"])];
    return ldap.searchMany(conf.ldap.base_structures, many, 'key', conf.ldap.structures.types, conf.ldap.structures.attrs, {sizeLimit}).then(ldap.remove_dns);
};

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

function homonymes_filter(sns: string[], givenNames: string[], supannMailPerso?: string): ldap.filter {

    function cn_filter() {
        return filters.alike_no_accents('cn', sns[0] + '*' + (givenNames[0] || ""));
    }

    function sn_givenName_filter() {
        let l = [];
        l.push(filters.alike_many('sn', sns));

        if (givenNames && givenNames.length) {
            l.push(filters.alike_many('givenName', givenNames));
        }
        return filters.and(l);
    }

    function mail_filter() {
        return filters.startsWith("mail", suggested_mail(sns[0], givenNames[0]) + '@');
    }

    let l = [ cn_filter(),
              sn_givenName_filter(), 
              mail_filter() ];
    if (supannMailPerso) {
        l.push(filters.eq('supannMailPerso', supannMailPerso));
    }
    //console.log("homonymes_filter", l);
    return filters.or(l);
}

function homonyme_scoring(birthDay: Date, known_birthDay: Date): number {
    if (!birthDay || !known_birthDay) return 1; // mostly for tests
    let partialInLdap = birthDay.getUTCMonth() + 1 === 1 && birthDay.getUTCDate() === 1; // we have many entries with birthDay 1945-01-01, in that case matching only year is enough
    function same(method) {
        return birthDay[method]() === known_birthDay[method]();
    }
    let sameYear = same('getUTCFullYear');
    let sameMonth = same('getUTCMonth');
    let sameDay = same('getUTCDate');
    return sameYear && sameMonth && sameDay ? 3 :
        sameYear && (sameMonth || sameDay || partialInLdap) ? 1 :
        sameMonth && sameDay ? 1 :
        0;
}
export type Homonyme = typeof conf.ldap.people.types & { score: number }

function homonymes_scoring(l: typeof conf.ldap.people.types[], birthDay: Date): Homonyme[] {
    let l_ = _.map(l, e => {
      let score = e.birthDay ? homonyme_scoring(e.birthDay, birthDay) : 0;
      if (score === 3) {
         score += e.eduPersonPrimaryAffiliation === 'student' ? 2 : 
                (e.eduPersonAffiliation || []).includes('member') ? 1 : 0;
      }   
      return <Homonyme> _.merge({ score }, e);
    });
    return _.sortBy(l_, 'score').reverse();
}

const homonymes_ = (sns: string[], givenNames: string[], birthDay: Date, supannMailPerso: string) : Promise<Homonyme[]> => {
    let filter = homonymes_filter(sns, givenNames, supannMailPerso);
    if (conf.ldap.people.homonymes_restriction) {
        filter = filters.and([filter, conf.ldap.people.homonymes_restriction]);
        //console.log("homonymes filter", filter);
    }
    //console.log("homonymes", sns, givenNames, birthDay);
    return ldap.search(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, { sizeLimit: 10 }).then(l => {
                              return homonymes_scoring(l, birthDay).filter(e => (
                                  e.score > 0
                              ));
                          });
};

const _merge_at = (v: v, attrs) => <string[]> _.merge(_.at(<{}> v, attrs));

export const homonymes = (v: v) : Promise<Homonyme[]> => {
    let sns = _merge_at(v, conf.ldap.people.sns);
    let givenNames = _merge_at(v, conf.ldap.people.givenNames);
    if (sns[0] === undefined) return Promise.resolve([]);
    console.log("sns", sns);
    return homonymes_(sns, givenNames, v.birthDay, v.supannMailPerso);    
};

export function searchPeople_matching_subvs(subvs: Partial<v>[], token: string, options: ldap.Options) {
    const ands = subvs.map(subv => {
        const v_ldap = ldap.convertToLdap(conf.ldap.people.attrs, conf.ldap.people.attrs, subv as any, {});
        // limitation: do not handle multi-valued attrs
        return filters.or(_.map(v_ldap, (val, attr) => filters.eq(attr, val as string)));
    });
    const filter = filters.and([
        filters.fuzzy(['displayName', 'cn'], token),
        ...ands,
    ]);
    console.log("searchPeople_matching_subvs with filter", filter);
    return ldap.search(conf.ldap.base_people, filter, conf.ldap.people.types, conf.ldap.people.attrs, options);
}

// export it to allow override
export let existLogin = (login: string): Promise<boolean> => (
    ldap.searchOne(conf.ldap.base_people, filters.eq("uid", login), {}, null).then(v => (
        !!v
    ))
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

function accronyms_and_sn(sn, givenNames, coll): string {
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
