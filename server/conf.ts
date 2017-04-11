'use strict';

import fs = require('fs');
import sendmailTransport = require('nodemailer-sendmail-transport');

const conf = {
    maxLiveModerators: 100,

    mainUrl: 'https://compte-externe-test.univ.fr',
    
    mail: {
        from: 'Pascal Rigaux <pascal.rigaux@univ.fr>',
        intercept: 'Pascal Rigaux <pascal.rigaux@univ.fr>',
        transport: sendmailTransport({}),
    },

    types: {
        uid: '', dn: '', cn: '', sn: '', displayName: '', givenName: '',
        birthDay: new Date(),
        homePostalAddress: 'postalAddress',
    },
        
    ldap: {
        uri: 'ldap://ldap-test.univ.fr',
        base: "dc=univ,dc=fr",
        base_people: "ou=people,dc=univ,dc=fr",
        base_structures: "ou=structures,dc=univ,dc=fr",

        structures_attrs: { key: 'supannCodeEntite', name: 'ou', description: 'description' },
        
        people: {
            attrs: { birthDay: 'up1BirthDay' },
            sns: ['sn'],
            givenNames: ['givenName'],
            homonymes_restriction: '(&(eduPersonAffiliation=*)(!(eduPersonAffiliation=student)))',
        },

        group_cn_to_memberOf: cn => (
            "cn=" + cn + ",ou=groups,dc=univ,dc=fr"
        ),

        // empty for anonymous bind:
        dn: 'cn=comptex,ou=admin,dc=univ,dc=fr',
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
            mail: 'mail',

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
