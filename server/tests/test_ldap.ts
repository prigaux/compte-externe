'use strict';

import * as _ from 'lodash';
import { parseDN } from 'ldapjs';

import * as conf from '../conf';
import * as ldap from '../ldap';
import * as ldap_convert from '../ldap_convert';


function test_params() {
    let DNs = {};
    let params = {
        base: 'dc=univ,dc=fr',
        base_people: "ou=people,dc=univ,dc=fr",
        base_rolesGeneriques: "ou=supannRoleGenerique,ou=tables,dc=univ,dc=fr",
        dn: 'cn=admin,dc=univ,dc=fr', password: 'xxx',    
        group_cn_to_memberOf: cn => "cn=" + cn + "," + "ou=groups,dc=univ,dc=fr",
        people: {
            ...conf.ldap.people,
            attrs: {
                ...conf.ldap.people.attrs,
                structureParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dn("supannCodeEntite", "ou=structures,dc=univ,dc=fr") },
            }
        },
        DNs: DNs,
    };

    let people = [
/* tslint:disable:max-line-length whitespace */      
        { uid: "prigaux", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthName: 'Nomdavant', up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [], supannEtablissement: [ "{UAI}0751717J", "{SAML}https://univ-test.fr", "{MIFARE}mifare_id" ], supannEtuAnneeInscription: [ "2016", "2017" ],
          accountStatus: 'active',
          up1Profile: [
              "[up1Source={HARPEGE}carriere][up1Priority=800][up1StartDate=20110915][up1EndDate=20190430][eduPersonOrgUnitDN=ou=DGHA,ou=structures,o=Paris1,dc=univ-paris1,dc=fr][employeeType=Ingénieur de recherche rf][supannParrainDN=ou=DGEP,ou=structures,o=Paris1,dc=univ-paris1,dc=fr][eduPersonAffiliation=member;employee;staff][supannEntiteAffectation=DGHA][buildingName=Centre Pierre Mendès France][supannRefId={MIFARE}803853C2593A04][supannEtablissement={UAI}0751717J][supannEntiteAffectationPrincipale=DGHA][employeeNumber=9100035249][eduPersonPrimaryOrgUnitDN=ou=DGHA,ou=structures,o=Paris1,dc=univ-paris1,dc=fr][postalAddress=90 RUE DE TOLBIAC$75634 PARIS CEDEX 13$FRANCE][supannOrganisme={EES}0751717J][supannEmpCorps={NCORPS}836][up1TagMifare=8A38A3CA59AA0A][supannActivite={REFERENS}E1B22][eduPersonPrimaryAffiliation=staff]",
              "[up1Source={COMPTEX}PLB.SC4][up1Priority=190][up1StartDate=20171216][up1EndDate=20181101][eduPersonAffiliation=employee;member;teacher][eduPersonEntitlement=urn:mace:univ-paris1.fr:entitlement:SC4:registered-reader][eduPersonPrimaryAffiliation=teacher][employeeNumber=9100035249][givenName=Pascal][homePhone=+33 1 82 09 08 74][homePostalAddress=6 Allée D'ANDREZIEUX$75018 PARIS$FRANCE][sn=Rigaux][supannCivilite=M.][supannEtablissement={UAI}0752719Y][supannOrganisme={EES}0752719Y][supannParrainDN=supannCodeEntite=SC4,ou=structures,dc=univ-paris1,dc=fr][supannRefId={MIFARE}803853C2593A04][up1BirthDay=19751002000000Z][up1BirthName=Nomdavant][up1TagMifare=8A38A3CA59AA0A]",
          ] },
        { uid: "e10000000", sn: "rigaux", givenName: "pascal", cn: "rigaux pascal", displayName: "pascal rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','student'], supannEtuId: '22', mailHost: 'malix.univ-paris1.fr', objectClass: [] },
        { uid: "arigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19751002000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [], mail: "ayme.rigaux@univ-paris1.fr", eduPersonPrincipalName: "arigaux@univ-paris1.fr", supannRoleEntite: ["[role={SUPANN}D30][type={SUPANN}S230][code=DGH]"], memberOf: ["cn=g1,ou=groups,dc=univ,dc=fr"] },
        { uid: "ayrigaux", sn: "rigaux", givenName: "aymé", cn: "rigaux ayme", displayName: "aymé rigaux", up1BirthDay: '19750101000000Z', eduPersonAffiliation: ['member','employee','staff'], objectClass: [], eduPersonPrincipalName: "ayrigaux@univ-paris1.fr", supannRoleEntite: ["[role={SUPANN}D30][type={SUPANN}S230][code=DGH]", "[role={SUPANN}D10][type={SUPANN}S230][code=DGHA]"] },
/* tslint:enable */
    ];
    let rolesGeneriques = [
/* tslint:disable:max-line-length whitespace */      
        { up1TableKey: "{SUPANN}F10", cn: "Chef de service", description: "Chef de service", displayName: "Chef de service", initials: "CHEF SRV", objectClass: "up1TableEntry", supannRefId: "{HARPEGE.FCSTR}521" },
        { up1TableKey: "{SUPANN}D30", cn: "Directeur(ice)", description: "Directeur(ice)", displayName: "Directeur(ice)", initials: "DIR", objectClass: "up1TableEntry", supannRefId: [ "{HARPEGE.FCSTR}522", "{HARPEGE.FCEXC}8" ] },
        { up1TableKey: "{SUPANN}D10", cn: "Directeur(ice) d'administration centrale", description: "Directeur(ice) d'administration centrale", displayName: "Directeur(ice) d'administration centrale", initials: "DIR AC", objectClass: "up1TableEntry" },
        { up1TableKey: "{SUPANN}D00", cn: "Ministre", description: "Ministre", displayName: "Ministre", initials: "MINISTRE", objectClass: "up1TableEntry" },
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
    addAll(params.base_rolesGeneriques, "up1TableKey", rolesGeneriques);
    return params;
}

let _server

function create_server(params) {
    if (!params) params = test_params();
    return require('./ldap_server')(params).then(server => {
        let conf = _.omit(params, 'DNs');
        conf['uri'] = server.url;
        _server = server
        return conf;
    });
}

export const create = (params = undefined): Promise<{void}> => (
    create_server(params).then(ldap_conf => {
        (conf as any).ldap = { ...conf.ldap, ...ldap_conf };
        ldap.force_new_clientP();
    })
);

export const stop = () => {
    //console.info("closing ldap client & ldap server xxxxxxxxxxxxxxxxxxxxxxxxxx")
    ldap.close_client();
    _server.close()
}