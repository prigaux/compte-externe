'use strict';

import _ = require('lodash');
import test_utils = require('./test_utils');

function test_params() {
    let DNs = {};
    let params = {
	base: 'dc=univ,dc=fr',
	base_people: "ou=people,dc=univ,dc=fr",
	dn: 'cn=admin,dc=univ,dc=fr', password: 'xxx',    
	DNs: DNs,
    };

    let people = [
	{ uid: "prigaux", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [] },
	{ uid: "e10000000", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','student'], objectClass: [] },
	{ uid: "arigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [] },
	{ uid: "ayrigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19750101000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [] },
    ];
    DNs[params.base_people] = {};
    people.forEach(e => {
	DNs["uid=" + e.uid + "," + params.base_people] = e;
    });
    return params;
}

function create_server(params) {
    if (!params) params = test_params();
    return require('./ldap_server')(params).then(server => {
	let conf = _.omit(params, 'DNs');
	conf['uri'] = server.url;
	return conf;
    });
}

const doIt = (params = undefined) => (
    create_server(params).then(ldap_conf => {
	let conf = test_utils.require_fresh('../conf');
	_.assign(conf.ldap, ldap_conf);
	return [conf, test_utils.require_fresh('../ldap')];
    })
);
export = doIt;
