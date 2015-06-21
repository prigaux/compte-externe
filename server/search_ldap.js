'use strict';

var _ = require('lodash');
var conf = require('./conf');
var ldap = require('./ldap');
var filters = ldap.filters;
var accents = require('diacritics');

exports.structures = function (token, sizeLimit) {
    var words_filter = filters.fuzzy(['description', 'ou'], token);
    var many = [filters.eq("supannCodeEntite", token), 
		filters.and([ words_filter, "(supannCodeEntite=*)"])];
    return ldap.searchManyMap(conf.ldap.base_structures, many, conf.ldap.structures_attrs, {sizeLimit: sizeLimit});
};

function suggested_mail(sn, givenName) {
    var s = accents.remove(sn);
    if (givenName) {
	givenName = accents.remove(givenName);
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
	var l = [];
	l.push(filters.alike_many('sn', sns));

	if (givenNames && givenNames.length) {
	    l.push(filters.alike_many('givenName', givenNames));
	}
	return filters.and(l);
    }

    function mail_filter() {
	return filters.startsWith("mail", suggested_mail(sns[0], givenNames[0]) + '@');
    }

    var l = [ cn_filter(),
	      sn_givenName_filter(), 
	      mail_filter() ];
    //console.log("homonymes_filter", l);
    return filters.or(l);
}

function homonyme_scoring(birthDay, known_birthDay) {
    var partialInLdap = birthDay.getUTCMonth()+1 === 1 && birthDay.getUTCDate() === 1; // we have many entries with birthDay 1945-01-01, in that case matching only year is enough
    function same(method) {
	return birthDay[method]() === known_birthDay[method]();
    }
    var sameYear = same('getUTCFullYear');
    var sameMonth = same('getUTCMonth');
    var sameDay = same('getUTCDate');
    return sameYear && sameMonth && sameDay ? 3 :
	sameYear && (sameMonth || sameDay || partialInLdap) ? 1 :
	sameMonth && sameDay ? 1 :
	0;
}

function homonymes_scoring(l, birthDay) {
    l.forEach(function (u) {
	u.birthDay = people_result(u, 'birthDay');
	u.score = u.birthDay ? homonyme_scoring(u.birthDay, birthDay) : 0;
    });
    return _.sortBy(l, 'score').reverse();
}

function people_result(e, attr) {
    var ldapAttr = peopleLdapAttr(attr);
    var type = conf.ldap.types[ldapAttr];
    if (!ldap.convert.from[type]) throw "invalid ldap type " + type + " for type " + attr;
    return ldap.convert.from[type](e[attr]);
}

function peopleLdapAttr(attr) {
    return conf.ldap.people.attrs[attr] || attr;
}

exports.homonymes = function (sns, givenNames, birthDay, attrs) {
    attrs.push('dn');
    var ldapAttrs = _.reduce(attrs, function (r, attr) {
	r[attr] = peopleLdapAttr(attr);
	return r;
    }, {});
    var filter = homonymes_filter(sns, givenNames);
    if (conf.ldap.people.homonymes_restriction) {
	filter = filters.and([filter, conf.ldap.people.homonymes_restriction]);
	//console.log("homonymes filter", filter);
    }
    //console.log("homonymes", sns, givenNames, birthDay);
    return ldap.searchMap(conf.ldap.base_people, 
			  filter,
			  ldapAttrs, 
			  { sizeLimit: 10 }).then(function (l) {
			   return homonymes_scoring(l, birthDay).filter(function (e) {
			       return e.score > 0;
			   });
		       });
};
