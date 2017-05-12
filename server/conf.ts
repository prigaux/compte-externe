'use strict';

import fs = require('fs');
import sendmailTransport = require('nodemailer-sendmail-transport');
import ldap_convert = require('./ldap_convert');

const ldap_base = "dc=univ,dc=fr";
const ldap_main = {
        uri: 'ldap://ldap-test.univ.fr',
        base: ldap_base,
        base_people: "ou=people," + ldap_base,
        base_groups: "ou=groups," + ldap_base,
        base_structures: "ou=structures," + ldap_base,
        base_rolesGeneriques: "ou=supannRoleGenerique,ou=tables," + ldap_base,
};

const conf = {
    maxLiveModerators: 100,

    mainUrl: 'https://compte-externe-test.univ.fr',
    
    mail: {
        from: 'Assistance <assistance@univ.fr>',
        intercept: 'Admin <admin@univ.fr>',
        transport: sendmailTransport({}),
    },

    types: {
        uid: '', dn: '', cn: '', sn: '', displayName: '', givenName: '',
        supannCivilite: '',
        supannAliasLogin: '', supannMailPerso: '', userPassword: '', mail: '',
        birthDay: new Date(), birthName: '',
        homePhone: '',
        homePostalAddress: '',
        jpegPhoto: '',
        structureParrain: '',

        Shib_Identity_Provider: '',
        eduPersonPrincipalName: '',

        barcode: '',
        mifare: '',

        eduPersonAffiliation: [],
        eduPersonPrimaryAffiliation: '',
        eduPersonEntitlement: '',
        supannEtablissement: [],

        profilename: '',
        priority: 0,
        startdate: new Date(),
        enddate: new Date(),
        duration: 0,

        key: '', name: '', description: '',
    },
        
    ldap: {
        ...ldap_main,

        structures: {
            attrs: {
                key: { ldapAttr: 'supannCodeEntite' }, 
                name: { ldapAttr: 'ou' },
                description: {},
            },
        },
        
        people: {
            attrs : { 
                homePostalAddress: { convert: ldap_convert.postalAddress },
                birthDay: { ldapAttr: "up1BirthDay", convert: ldap_convert.datetime },
                birthName: { ldapAttr: 'up1BirthName' },
                startdate: { convert: ldap_convert.date },
                enddate: { convert: ldap_convert.date },
                Shib_Identity_Provider: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette('{SAML}') },
                eduPersonPrincipalName: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{EPPN}") },                
                structureParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dn("supannCodeEntite", ldap_main.base_structures) },
                barcode: { ldapAttr: 'employeeNumber' },
                mifare: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{MIFARE}")  },
            },
            sns: ['sn'],
            givenNames: ['givenName'],
            homonymes_restriction: '(&(eduPersonAffiliation=*)(!(eduPersonAffiliation=student)))',
        },

        group_cn_to_memberOf: cn => (
            "cn=" + cn + "," + ldap_main.base_groups
        ),

        // empty for anonymous bind:
        dn: 'cn=comptex,ou=admin,' + ldap_main.base,
        password: 'xxx',
        
        uid_to_eppn: "@univ.fr",
        group_member_to_eppn: user_dn => {
            let r = user_dn.match(/^uid=([^,]*)/);
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

    cas_idp: 'https://idp.univ.fr',

    mongodb: { 
        url: "mongodb://localhost:27017/compte-externe",
    },

    esup_activ_bo: {
        url: "http://xxxx.univ.fr:8080/esup-activ-bo/xfire/AccountManagement",
    },

    http_client_CAs: fs.readFileSync('/etc/ssl/certs/ca-certificates.crt').toString().split(/(?=-----BEGIN CERTIFICATE-----)/),

};

export = conf;
