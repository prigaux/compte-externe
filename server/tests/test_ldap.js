'use strict';

var _ = require('lodash');
var test_utils = require('./test_utils');

function test_params() {
    var DNs = {};
    var params = {
	base: 'dc=univ,dc=fr',
	base_people: "ou=people,dc=univ,dc=fr",
	dn: 'cn=admin,dc=univ,dc=fr', password: 'xxx',    
	DNs: DNs,
    };

    var people = [
	{ uid: "prigaux", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", objectClass: [] },
	{ uid: "arigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux aymé", displayName: "aymé rigaux", objectClass: [] },
	{ uid: "ayrigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux aymé", displayName: "aymé rigaux", objectClass: [] },
    ];
    DNs[params.base_people] = {};
    people.forEach(function (e) {
	DNs["uid=" + e.uid + "," + params.base_people] = e;
    });
    return params;
}

function create_server(params) {
    if (!params) params = test_params();
    return require('./ldap_server')(params).then(function (server) {
	var conf = _.omit(params, 'DNs');
	conf.uri = server.url;
	return conf;
    });
}

module.exports = function (params) {
    return create_server(params).then(function (ldap_conf) {
	var conf = test_utils.require_fresh('../conf');
	_.assign(conf.ldap, ldap_conf);
	return [conf, test_utils.require_fresh('../ldap')];
    });
};
