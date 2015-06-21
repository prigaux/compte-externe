'use strict';

var sendmailTransport = require('nodemailer-sendmail-transport');

var conf = {
    maxLiveModerators: 100,

    mainUrl: 'https://compte-externe-test.univ.fr',
    
    mail: {
	from: 'Pascal Rigaux <pascal.rigaux@univ.fr>',
	intercept: 'Pascal Rigaux <pascal.rigaux@univ.fr>',
	transport: sendmailTransport({}),
    },

    ldap: {
	uri: 'ldap://ldap-test.univ.fr',
	base: "dc=univ,dc=fr",
	base_people: "ou=people,dc=univ,dc=fr",
	base_structures: "ou=structures,dc=univ,dc=fr",

	structures_attrs: { key: 'supannCodeEntite', name: 'ou', description: 'description' },

	types: { up1BirthDay: 'datetime' },
	
	people: {
	    attrs: { birthDay: 'up1BirthDay' },
	    sns: ['sn'],
	    givenNames: ['givenName'],
	    homonymes_restriction: '(&(eduPersonAffiliation=*)(!(eduPersonAffiliation=student)))',
	},

	group_cn_to_memberOf: function (cn) {
	    return "cn=" + cn + ",ou=groups,dc=univ,dc=fr";
	},

	// empty for anonymous bind:
	dn: 'cn=comptex,ou=admin,dc=univ,dc=fr',
	password: 'xxx',
	
	uid_to_eppn: "@univ.fr",
	group_member_to_eppn: function (user_dn) {
	    var r = user_dn.match(/^uid=([^,]*)/);
	    if (!r) console.log("invalid group member " + user_dn);
	    return r && r[1] + conf.ldap.uid_to_eppn;
	}
    },

    shibboleth: {
	header_map: {
	    Shib_Identity_Provider: 'Shib-Identity-Provider',
	    eduPersonPrincipalName: 'eppn',
	    supannMailPerso: 'mail',

	    supannCivilite: 'supannCivilite',
	    cn: 'cn',
	    sn: 'sn', 
	    givenName: 'givenName', 
	    displayName: 'displayName',
	},
    },

    mongodb: { 
	url: "mongodb://localhost:27017/compte-externe",
    },
};

module.exports = conf;
