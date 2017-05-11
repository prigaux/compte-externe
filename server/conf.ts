'use strict';

import * as fs from 'fs';
import sendmailTransport = require('nodemailer-sendmail-transport');
import * as ldap_convert from './ldap_convert';

const ldap_base = "dc=univ,dc=fr";
const ldap_main = {
        uri: 'ldap://ldap-test.univ.fr',
        base: ldap_base,
        base_people: "ou=people," + ldap_base,
        base_groups: "ou=groups," + ldap_base,
        base_structures: "ou=structures," + ldap_base,
        base_rolesGeneriques: "ou=supannRoleGenerique,ou=tables," + ldap_base,
        base_etablissements: "ou=supannEtablissement,ou=tables," + ldap_base,
};

const conf = {
    maxLiveModerators: 100,

    mainUrl: 'https://compte-externe-test.univ.fr',
    
    mail: {
        from: 'Assistance <assistance@univ.fr>',
        intercept: 'Admin <admin@univ.fr>',
        transport: sendmailTransport({}),
    },
       
    ldap: {
        ...ldap_main,

        structures: {
            types: {
                key: '', name: '', description: '',
            },
            attrs: {
                key: { ldapAttr: 'supannCodeEntite' }, 
                name: { ldapAttr: 'ou' },
            },
        },
        
        etablissements: {
            types: {
                key: '', name: '', description: '',
                postalAddress: '', siret: '',
            },
            attrs: {
                key: { ldapAttr: 'dn' },
                name: { ldapAttr: 'displayName' },
                siret: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette("{SIRET}") },
                postalAddress: { convert: ldap_convert.postalAddress },
            },
        },
        
        people: {
            types: {
                uid: '', sn: '', displayName: '', givenName: '',
                supannCivilite: '',
                supannAliasLogin: '', supannMailPerso: '', userPassword: '', mail: '',
                birthDay: new Date(), birthName: '', altGivenName: [],
                homePhone: '', pager: '',
                homePostalAddress: '',
                jpegPhoto: '',
                structureParrain: '',

                Shib_Identity_Provider: '',
                eduPersonPrincipalName: '',

                barcode: '',
                mifare: '',

                // useful to know the kind of profiles the user has.
                global_eduPersonAffiliation: [],
                global_eduPersonPrimaryAffiliation: '',
                global_supannEtuAnneeInscription: [0],

                eduPersonPrimaryAffiliation: '',
                eduPersonEntitlement: '',
                supannRoleEntite: [],

                profilename: '',
                priority: 0,
                startdate: new Date(),
                enddate: new Date(),
                duration: 0,
            },

            attrs : { 
                homePostalAddress: { convert: ldap_convert.postalAddress },
                birthDay: { ldapAttr: "up1BirthDay", convert: ldap_convert.datetime },
                birthName: { ldapAttr: 'up1BirthName' },
                altGivenName: { ldapAttr: 'up1AltGivenName' },
                startdate: { convert: ldap_convert.date },
                enddate: { convert: ldap_convert.date },
                Shib_Identity_Provider: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette('{SAML}') },
                eduPersonPrincipalName: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{EPPN}") },                
                structureParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dn("supannCodeEntite", ldap_main.base_structures) },
                barcode: { ldapAttr: 'employeeNumber' },
                mifare: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{MIFARE}")  },
                jpegPhoto: { convert: ldap_convert.base64 },
            },
            sns: ['sn'],
            givenNames: ['givenName'],
            supannCiviliteChoices: [ 'M.', 'Mme' ].map(s => ({ key: s, name: s })),
            homonymes_restriction: '(objectClass=inetOrgPerson)',
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
        },

        disconnectWhenIdle_duration: 1 * 60 * 1000, // in milliseconds
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

    attrsHelpingDiagnoseHomonymes: [
        'mail', 'altGivenName', 'global_eduPersonAffiliation', 'global_eduPersonPrimaryAffiliation', 'global_supannEtuAnneeInscription',
    ],

    cas_idp: 'https://idp.univ.fr',

    mongodb: { 
        url: "mongodb://localhost:27017/compte-externe",
    },

    esup_activ_bo: {
        url: "http://xxxx.univ.fr:8080/esup-activ-bo/xfire/AccountManagement",
    },

    pattern: {
        isFrenchMobilePhone: "(0|\\+33)\\s*[67](\\s*[0-9]){8}",        
    },

    http_client_CAs: fs.readFileSync('/etc/ssl/certs/ca-certificates.crt').toString().split(/(?=-----BEGIN CERTIFICATE-----)/),

    poll_maxTime: 4 * 60 * 1000, // 4 minutes
};

export = conf;
