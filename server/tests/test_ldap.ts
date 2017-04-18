'use strict';

import _ = require('lodash');
import test_utils = require('./test_utils');
import { parseDN } from 'ldapjs';

// get module types:
import __conf__ = require('../conf');
import __ldap__ = require('../ldap');
export type conf = typeof __conf__;
export type ldap = typeof __ldap__;


function test_params() {
    let DNs = {};
    let params = {
        base: 'dc=univ,dc=fr',
        base_people: "ou=people,dc=univ,dc=fr",
        base_rolesGeneriques: "ou=supannRoleGenerique,ou=tables,dc=univ,dc=fr",
        dn: 'cn=admin,dc=univ,dc=fr', password: 'xxx',    
        DNs: DNs,
    };

    let people = [
/* tslint:disable:max-line-length whitespace */      
        { uid: "prigaux", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [], supannEtablissement: [ "{UAI}0751717J", "{SAML}https://univ-test.fr" ] },
        { uid: "e10000000", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','student'], objectClass: [] },
        { uid: "arigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [], supannRoleEntite: "[role={SUPANN}D30][type={SUPANN}S230][code=DGH]" },
        { uid: "ayrigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19750101000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [] },
/* tslint:enable */
    ];
    let rolesGeneriques = [
/* tslint:disable:max-line-length whitespace */      
        { supannRoleGenerique: "{SUPANN}F10", cn: "Chef de service", description: "Chef de service", displayName: "Chef de service", initials: "CHEF SRV", objectClass: "up1TableEntry", supannRefId: "{HARPEGE.FCSTR}521" },
        { supannRoleGenerique: "{SUPANN}D30", cn: "Directeur(ice)", description: "Directeur(ice)", displayName: "Directeur(ice)", initials: "DIR", objectClass: "up1TableEntry", supannRefId: [ "{HARPEGE.FCSTR}522", "{HARPEGE.FCEXC}8" ] },
        { supannRoleGenerique: "{SUPANN}D10", cn: "Directeur(ice) d'administration centrale", description: "Directeur(ice) d'administration centrale", displayName: "Directeur(ice) d'administration centrale", initials: "DIR AC", objectClass: "up1TableEntry" },
        { supannRoleGenerique: "{SUPANN}D00", cn: "Ministre", description: "Ministre", displayName: "Ministre", initials: "MINISTRE", objectClass: "up1TableEntry" },
/* tslint:enable */
    ];
    function add(dn: string, e) {
      DNs[parseDN(dn).toString()] = e;
    }
    function addAll(base, attr, list) {
        add(base, {});
        list.forEach(e => {
            if (!e[attr]) throw `missing ${attr} in ${e}`;
            add(attr + "=" + e[attr] + "," + base, e);
        });        
    }
    addAll(params.base_people, "uid", people);
    addAll(params.base_rolesGeneriques, "supannRoleGenerique", rolesGeneriques);
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

export const create = (params = undefined): Promise<{conf: conf, ldap: ldap}> => (
    create_server(params).then(ldap_conf => {
        let conf: conf = test_utils.require_fresh('../conf');
        _.assign(conf.ldap, ldap_conf);
        let ldap: ldap = test_utils.require_fresh('../ldap');
        return {conf, ldap};
    })
);
