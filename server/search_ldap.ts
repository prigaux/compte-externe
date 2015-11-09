'use strict';

const _ = require('lodash');
const conf = require('./conf');
const ldap = require('./ldap');
const filters = ldap.filters;

const maxLoginLength = 10;

const remove_accents = _.deburr;

exports.structures = (token, sizeLimit) => {
    let words_filter = filters.fuzzy(['description', 'ou'], token);
    let many = [filters.eq("supannCodeEntite", token), 
		filters.and([ words_filter, "(supannCodeEntite=*)"])];
    return ldap.searchManyMap(conf.ldap.base_structures, many, conf.ldap.structures_attrs, {sizeLimit: sizeLimit});
};

function suggested_mail(sn, givenName) {
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

function homonymes_filter(sns, givenNames) {

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
    //console.log("homonymes_filter", l);
    return filters.or(l);
}

function homonyme_scoring(birthDay, known_birthDay) {
    let partialInLdap = birthDay.getUTCMonth()+1 === 1 && birthDay.getUTCDate() === 1; // we have many entries with birthDay 1945-01-01, in that case matching only year is enough
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

function homonymes_scoring(l, birthDay) {
    l.forEach(u => {
	u.score = u.birthDay ? homonyme_scoring(u.birthDay, birthDay) : 0;
    });
    return _.sortBy(l, 'score').reverse();
}

function people_result(e, attr) {
    let ldapAttr = peopleLdapAttr(attr);
    let type = conf.ldap.types[ldapAttr];
    if (type) {
	if (!ldap.convert.from[type]) throw "invalid ldap type " + type + " for type " + attr;
	return ldap.convert.from[type](e[attr]);
    } else {
	return e[attr];
    }
}

function people_convert_from_ldap(e) {
    return _.mapValues(e, (v, attr) => (
	people_result(e, attr)
    ));
}

function peopleLdapAttr(attr) {
    return conf.ldap.people.attrs[attr] || attr;
}

exports.homonymes = (sns, givenNames, birthDay, attrs) => {
    attrs.push('dn');
    let ldapAttrs = _.reduce(attrs, (r, attr) => {
	r[attr] = peopleLdapAttr(attr);
	return r;
    }, {});
    let filter = homonymes_filter(sns, givenNames);
    if (conf.ldap.people.homonymes_restriction) {
	filter = filters.and([filter, conf.ldap.people.homonymes_restriction]);
	//console.log("homonymes filter", filter);
    }
    //console.log("homonymes", sns, givenNames, birthDay);
    return ldap.searchMap(conf.ldap.base_people, 
			  filter,
			  ldapAttrs, 
			  { sizeLimit: 10 }).then(l => {
			      l = l.map(people_convert_from_ldap);
			      return homonymes_scoring(l, birthDay).filter(e => (
				  e.score > 0
			      ));
			  });
};

// export it to allow override
exports.existLogin = login => (
    ldap.searchOne(conf.ldap.base_people, filters.eq("uid", login), "uid").then(v => (
	!!v
    ))
);

function truncateLogin(login) {
    return login.substr(0, maxLoginLength);
}

function checkLogin(login) {
    let ok = login.match(/[a-z]/);
    if (!ok) {
	console.error('genLogin: ' + login + ': le login doit contenir au moins un caractère alphabétique');
    }
    return ok;
}

function accronyms(l, length) {
    length = length || 1;
    return l.map(s => (
        s.substr(0, length)
    )).join('');
}

function accronyms_and_sn(sn, givenNames, coll) {
    return truncateLogin(accronyms(givenNames, coll) + sn);
}

function genLogin_numeric_suffix(base, coll) {
    let login = base.substr(0, maxLoginLength - (""+coll).length) + coll;
    if (!checkLogin(login)) {
	// argh, no letters anymore :-(
	return undefined;   
    } else {
	return exports.existLogin(login).then(exist => {
	    if (!exist) {
		// yeepee
		return login;
	    } else {
		return genLogin_numeric_suffix(base, coll+1);
	    }
	});
    }
}

function genLogin_accronyms_prefix(sn, givenNames, coll, prev) {
    // composition initiales du prénom + nom avec test conflits
    if (coll >= maxLoginLength) return undefined;
    let login = accronyms_and_sn(sn, givenNames, coll);
    if (!checkLogin(login)) {
	// weird...
	return undefined;
    } else if (login === prev) {
	return undefined;
    } else {
	return exports.existLogin(login).then(exist => {
	    if (!exist) {
		// yeepee
		return login;
	    } else {
		return genLogin_accronyms_prefix(sn, givenNames, coll+1, login);
	    }
	});
    }
}

// génère un login unique
exports.genLogin = (sn, givenName) => {
    if (!sn) return Promise.resolve(undefined);
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
