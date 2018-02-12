'use strict';

import * as fs from 'fs';
import sendmailTransport = require('nodemailer-sendmail-transport');
import * as ldap_convert from './ldap_convert';
import * as _ from 'lodash';
import * as session from 'express-session';
import * as session_file_store from 'session-file-store';
import { sameKeyNameChoices } from './helpers';
import * as grouped_calls from './helper_grouped_calls';
// @ts-expect-error
import * as vue_config from '../app/vue.config';

const ldap_base = "dc=univ-paris1,dc=fr";
const ldap_main = {
        uri: ['ldap://ldap-pmf2.univ-paris1.fr', 'ldap://ldap-pth2.univ-paris1.fr', 'ldap://ldap-pth1.univ-paris1.fr'],

        // empty for anonymous bind:
        dn: 'cn=comptex,ou=admin,' + ldap_base,
        password: 'xxx',

        base: ldap_base,
        base_people: "ou=people," + ldap_base,
        base_groups: "ou=groups," + ldap_base,
        base_structures: "ou=structures," + ldap_base,
        base_structures_old: "ou=structures,o=Paris1," + ldap_base,
        base_rolesGeneriques: "ou=supannRoleGenerique,ou=tables," + ldap_base,
        base_etablissements: "ou=supannEtablissement,ou=tables," + ldap_base,

        uid_to_eppn: "@univ-paris1.fr",
};

const internal_organizations = [
    '{UAI}0751717J', // Univ Paris 1
    '{UAI}0752719Y', // SCD
    '{UAI}0753364Z', // IAE
];

const conf = {
    maxLiveModerators: 100,

    mainUrl: 'https://comptex.univ-paris1.fr' + vue_config.publicPath.replace(/\/$/, ''),
    
    mail: {
        from: 'Assistance DSIUN <Assistance-DSIUN@univ-paris1.fr>',
        intercept: '', //'Admin <admin@univ.fr>',
        transport: sendmailTransport({ path: '/usr/sbin/sendmail' }), // give sendmail with full path (since PATH may not have /usr/sbin/)
    },

    mongodb: { 
        url: "mongodb://localhost:27017/compte-externe",
    },

    esup_activ_bo: {
        url: "http://marmite.univ-paris1.fr:8080/esup-activ-bo/xfire",
        multiValue_separator: '__-',
    },
    
    ldap: {
        shibIdentityProvider: 'urn:mace:cru.fr:federation:univ-paris1.fr',

        ...ldap_main,

        structures: {
            types: {
                const: '', short_title: '', title: '',
            },
            attrs: {
                const: { ldapAttr: 'supannCodeEntite' }, 
                short_title: { ldapAttr: 'ou' },
                title: { ldapAttr: 'description' },
            },
        },
        
        etablissements: {
            types: {
                const: '', title: '', displayName: '',
                siret: '',
                postalAddress: '', labeledURI: '', telephoneNumber: '', facsimileTelephoneNumber: '',
            },
            attrs: {
                const: { ldapAttr: 'up1TableKey' },
                title: { ldapAttr: 'description', fallbackLdapAttrs: ['displayName'] },
                siret: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette("{SIRET}") },
                uai: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette("{UAI}") },
                postalAddress: { convert: ldap_convert.postalAddress },
            },
        },
        
        people: {
            types: {
                uid: '', sn: '', displayName: '', givenName: '',
                supannCivilite: '',
                supannAliasLogin: '', supannMailPerso: '', userPassword: '', 
                mail: '', mailDeliveryOption: [''], mailForwardingAddress: '',
                birthDay: new Date(), birthName: '', altGivenName: [] as string[],
                homePhone: '', telephoneNumber: '', facsimileTelephoneNumber: '', supannAutreTelephone: [] as string[], pager: '', mobile: '',
                homePostalAddress: '',
                postalAddress: '',
                floorNumber: '', roomAccess: '', roomNumber: '', buildingName: '',
                jpegPhoto: '',
                personParrain: '', structureParrain: '',

                etablissementExterne: '',
                etablissementInterne: '',
                Shib_Identity_Provider: '',
                eduPersonPrincipalName: '',

                barcode: '',
                mifare: '',

                // useful to know the kind of profiles the user has.
                global_eduPersonAffiliation: [] as string[],
                global_eduPersonPrimaryAffiliation: '',
                global_supannEtuAnneeInscription: [0],
                global_structureParrain: '',
                global_profilename: [''],
                global_barcode: '',
                global_mifare: '',
                global_shadowExpire: new Date(),

                eduPersonPrimaryAffiliation: '',
                eduPersonEntitlement: [] as string[],
                supannRoleEntite: [] as string[],
                supannRoleGenerique: [] as string[],
                supannEntiteAffectationPrincipale: '',
                supannEntiteAffectation: [''],
                supannEtuEtape: [''],
                description: [''],
                info: [''],
                employeeType: [''],
                departmentNumber: '',
                supannActivite: '',
                labeledURI: '',

                profilename: '',
                priority: 0,
                startdate: new Date(),
                enddate: new Date(),
                duration: 0,

                accountStatus: '',
                up1KrbPrincipal: '',
                mailHost: '',
                supannEmpId: '',
                supannEtuId: '',
                supannCodeINE: '',
                
                termsOfUse: [''],
                supannConsentement: [''],
                supannListeRouge: '',

                up1Profile: [] as any[],
                '{SMSU}CG': '', '{PAGER}DISPLAY.FACULTY': '', '{PHOTO}PUBLIC': '', '{PHOTO}INTRANET': '', '{PHOTO}STUDENT': '',
                '{APPLI:OFFICE365}CGU': '',
            },

            attrs : { 
                homePostalAddress: { convert: ldap_convert.postalAddress },
                postalAddress: { convert: ldap_convert.postalAddress },
                birthDay: { ldapAttr: "up1BirthDay", convert: ldap_convert.datetime },
                birthName: { ldapAttr: 'up1BirthName' },
                altGivenName: { ldapAttr: 'up1AltGivenName' },
                floorNumber: { ldapAttr: 'up1FloorNumber' },
                roomAccess: { ldapAttr: 'up1RoomAccess' },
                up1Profile: { convert: ldap_convert.up1Profile },
                global_profilename: { ldapAttr: 'up1Profile', convert: ldap_convert.up1Profile_field('up1Source') },
                profilename: { ldapAttr: 'up1Source', ldapAttrJson: 'profilename' },
                priority: { ldapAttr: 'up1Priority', ldapAttrJson: 'priority' },
                startdate: { ldapAttr: 'up1StartDate', ldapAttrJson: 'startdate', convert: ldap_convert.date },
                enddate: { ldapAttr: 'up1EndDate', ldapAttrJson: 'enddate', convert: ldap_convert.date },
                etablissementExterne: { ldapAttr: 'supannEtablissement', convert: ldap_convert.match((s: string) => !internal_organizations.includes(s)) },
                etablissementInterne: { ldapAttr: 'supannEtablissement', convert: ldap_convert.match((s: string) => internal_organizations.includes(s)) },
                Shib_Identity_Provider: { ldapAttr: 'supannEtablissement', convert: ldap_convert.withEtiquette('{SAML}') },
                eduPersonPrincipalName: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{EPPN}") },                
                personParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dn("uid", ldap_main.base_people) },
                structureParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dn("supannCodeEntite", ldap_main.base_structures), convert2: ldap_convert.dn("ou", ldap_main.base_structures_old) },
                global_structureParrain: { ldapAttr: 'supannParrainDN', convert: ldap_convert.dns("supannCodeEntite", ldap_main.base_structures), convert2: ldap_convert.dns("ou", ldap_main.base_structures_old) },
                global_shadowExpire: { ldapAttr: 'shadowExpire', convert: ldap_convert.date_epoch },
                barcode: { ldapAttr: 'employeeNumber' },
                global_barcode: { ldapAttr: 'employeeNumber' },
                mifare: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{MIFARE}")  },
                global_mifare: { ldapAttr: 'supannRefId', convert: ldap_convert.withEtiquette("{MIFARE}")  },
                jpegPhoto: { convert: ldap_convert.base64 },
                termsOfUse: { ldapAttr: 'up1TermsOfUse' },
                ..._.fromPairs(['{SMSU}CG', '{PAGER}DISPLAY.FACULTY', '{PHOTO}PUBLIC', '{PHOTO}INTRANET', '{PHOTO}STUDENT'].map(value => 
                    [ value, { ldapAttr: 'up1TermsOfUse', convert: ldap_convert.has_value(value) } ]
                )),
                ..._.fromPairs(['{APPLI:OFFICE365}CGU'].map(value => 
                    [ value, { ldapAttr: 'supannConsentement', convert: ldap_convert.has_value(value) } ]
                )),
            },
            supannCiviliteChoices: sameKeyNameChoices([ 'M.', 'Mme' ]),

            mail_domains: [
                'univ-paris1.fr',
                'etu.univ-paris1.fr',
                'malix.univ-paris1.fr',
                'anciens.univ-paris1.fr',
                'bis-sorbonne.fr',
            ],
    
            homonymes_preferStudent: (profilename: string) => !!(profilename || '').match(/^\{COMPTEX:FC\}learner\./),
            homonymes_restriction: '(&(objectClass=inetOrgPerson)(!(shadowFlag=2))(!(shadowFlag=8)))' // ignore dupes/deceased
        },

        group_cn_to_memberOf: (cn: string) => (
            "cn=" + cn + "," + ldap_main.base_groups
        ),
        memberOf_to_group_cn: (memberOf: string) => (
            memberOf.match(/^cn=([^,]*)/)?.[1]
        ),

        group_member_to_eppn: (user_dn: string) => {
            let r = user_dn.match(/^uid=([^,]*)/);
            if (!r) console.log("invalid group member " + user_dn);
            return r[1] + conf.ldap.uid_to_eppn;
        },

        // cf "man slapd.conf"
        index_substr_any_len: 4, // minimum size for full merge_patch_parent_properties search: *xxxx*
        index_substr_if_minlen: 2, // minimum size for subinitial or subfinal (if = initial / final)

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

    session: { 
        secret: 'xx', 
        cookie: { secure: true, sameSite: 'lax' },
    } as session.SessionOptions,
    
    session_store: { 
        path: "/tmp"
    } as session_file_store.Options,

    cas: {
        host: '', //'cas.univ.fr',
    },

    http_client_CAs: fs.readFileSync('/etc/ssl/certs/ca-certificates.crt').toString().split(/(?=-----BEGIN CERTIFICATE-----)/),

    poll_maxTime: 4 * 60 * 1000, // 4 minutes

    crejsonldap: {
        grouped_calls: {
            nb_parallel_calls: 5,
            group_size: 50,
        } as grouped_calls.options,
    },
};

export = conf;
