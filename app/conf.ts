'use strict';

const accentsRange = '\u00C0-\u00FC';
const allowedCharsInNames = "[A-Za-z" + accentsRange + "'. -]";

const wsgroupsURL = "https://wsgroups.univ-paris1.fr";

export default {
    printCardUrl: undefined, //(login) => `http://unicampus.univ.fr/unicampus/DesktopDefault.aspx?tabindex=1&tabid=2&NomCon=Xxxx&id_vis=${login}`,
    wsgroupsURL,
    base_pathname: '/',
    
    attr_labels: {
        supannCivilite: "Civilité",
        givenName: "Prénom",
        altGivenName: 'Autres prénoms',
        sn: "Nom d'usage",
        birthName: "Nom de naissance",
        birthDay: "Date de naissance",
        homePostalAddress: "Adresse personnelle",
        address_lines: "",
        address_line2: "(complément)",
        postalCode: "Code postal",
        town: "Ville",
        country: "Pays",
        homePhone: "Téléphone personnel",
        pager: "Mobile personnel",
        supannMailPerso: "Email personnel",
        jpegPhoto: "Photo",
        telephoneNumber: 'Tétéphone fixe',
        roomAccess: "Précision du lieu",
        floorNumber: "Étage",
        roomNumber: "Numéro de bureau",
        structureParrain: "SERVICE QUI INVITE : (UFR, Service, Laboratoire...)",
        userPassword: "Mot de passe",
        userPassword2: "Confirmer le mot de passe",
        cardChoice: "Carte",
        barcode: "Code barre",
        mifare: "Code Mifare",
        profilename: "Type de compte",
        etablissementExterneOrNew: "Etablissement",
        etablissement_description: "Raison sociale",
        etablissement_postalAddress: "Adresse de l'établissement",
        etablissement_labeledURI: "Site web de l'établissement",
        etablissement_telephoneNumber: "Numéro de téléphone",
        etablissement_facsimileTelephoneNumber: "Numéro de fax",
        etablissement_siret: "SIRET",
        charter: "Charte",
        duration_or_enddate: "Fin du compte",
        duration: "Durée",
        startdate: "Date de début",
        enddate: "Date de fin",
        eduPersonPrincipalName: "Identifiant dans l'établissement",
        mail: "Mail",
    },

    attrs_description: {
        charter: `Vous acceptez de vous conformer 
            aux chartes informatiques <a target="_blank" href="http://dsiun.univ-paris1.fr/fileadmin/DSI/Chartes/charte_utilisation_ressources_informatiques_et_internet.html">de l'université</a> 
            et <a target="_blank" href="http://www.renater.fr/IMG/pdf/Charte_RENATER_Vjanv2014.pdf" >du réseau RENATER</a>.
            <br>
            Votre compte et son mot de passe associé sont strictement personnels : vous êtes seul responsable de l'usage qui en est fait.`,
    },

    default_attrs_opts: {
        homePhone: { uiType: "phone" },
        telephoneNumber: { uiType: "phone" },
        pager: { uiType: "mobilePhone" },
        supannMailPerso: { uiType: "email" },
        givenName: { allowedChars: allowedCharsInNames },
        sn: { allowedChars: allowedCharsInNames },
        birthName: { allowedChars: allowedCharsInNames, labels: { tooltip: "si différent du nom d'usage" } },
        charter: { uiType: 'checkbox' },
        birthDay: { uiType: 'date', min: new Date('1900'), minYear: '1900', max: new Date(), maxYear: new Date().getUTCFullYear() },
        startdate: { uiType: 'date', min: new Date(), minYear: new Date().getUTCFullYear() },
        enddate: { uiType: 'date', min: new Date(), minYear: new Date().getUTCFullYear() },
        homePostalAddress: { uiType: 'postalAddress' },
        jpegPhoto: { uiType: 'photo' },
        userPassword: { uiType: 'password' },
        structureParrain: { uiType: 'structure' },
        etablissementExterne: { 
            uiType: 'etablissement', 
            onChange(v, _, etablissementS) {
                Object.keys(etablissementS).forEach(k => v[`etablissement_${k}`] = etablissementS[k]);
            },
        },
        etablissement_postalAddress: { uiType: 'postalAddress' },
        etablissement_siret: { uiType: 'siret' },
        etablissement_labeledURI: { uiType: 'url' },
        etablissement_telephoneNumber: { uiType: 'phone' },
        etablissement_facsimileTelephoneNumber: { uiType: 'phone' },
        },

    attrs_order: [
        'supannCivilite', 'givenName', 'altGivenName', 'sn', 'birthName', 'birthDay',
        'homePostalAddress', 'homePhone', 'pager', 'supannMailPerso',
        'jpegPhoto',
        'structureParrain',
        'startdate', 'duration_or_enddate', 'duration', 'enddate',
        'telephoneNumber', 'roomAccess', 'floorNumber', 'roomNumber',
        'userPassword', 'profilename',
        'etablissementExterneOrNew',
        'etablissementExterne',
        'etablissement_description',
        'etablissement_siret',
        'etablissement_postalAddress',
        'etablissement_labeledURI',
        'etablissement_telephoneNumber',
        'etablissement_facsimileTelephoneNumber',
        'charter',
    ],

    title: "Gestion de comptes",

    pattern: {
        frenchPhone: "^(\\+33|0)\\s*[1-9](\\s*[0-9]){8}$", // french
        frenchMobilePhone: "(0|\\+33)\\s*[67](\\s*[0-9]){8}",        
        phone: [
            "0\\s*[1-9](\\s*[0-9]){8}", // french
            "\\+(1|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|7|8[1246]|9[0-58]|[0-9]{3})(\\s*[0-9]){4,14}", // international country code, less than 15 digits
        ].join('|'),
        frenchPostalCode: "\\s*[0-9]{5}\\s*",
    },
    error_msg: {
        radio_required: 'Veuillez sélectionner une de ces options.',
        userPassword: 'Veuillez choisir un mot de passe comportant au moins 8 caractères. Ce mot de passe doit contenir des lettres minuscules, des lettres majuscules et des chiffres.',
        phone: 'Le champ doit être un numéro de téléphone. Exemples : 01 02 03 04 05  ou  +41 66 555 44 33  ou  +886 1 1234 5678',
        mobilePhone: 'Le champ doit être un numéro de téléphone mobile. Exemples : 06 02 03 04 05',
        frenchPostalCode: 'Le champ doit être un code postal. Exemple: 75013',
        siret: 'Numéro SIRET invalide',
        forbiddenChars: (forbiddenChars) => (
            forbiddenChars.length == 1 ?
             `Le caractère « ${forbiddenChars} » n'est pas autorisé.` :
             `Les caractères « ${forbiddenChars} » ne sont pas autorisés.`
        ),
        noModerators: (structureName) => (
            `Le service ${structureName} n'a pas de responsables déclarés dans le logiciel SIHAM. Il faut que les responsables en fassent la demande vers l'application de gestion de compte de l'ENT`
        ),
    },        

    affiliation_labels: {
        staff: "personnel Biatss",
        teacher: "enseignant",
        researcher: "chercheur",
        student: "étudiant",
        alum: "ancien étudiant",
        affiliate: "partenaire extérieur",
        emeritus: "professeur émérite",
        retired: "retraité",
        employee: "employé",
        'registered-reader': 'lecteur externe',
        'library-walk-in': "visiteur bibliothèque",
    },

    countries: [
        // sorted first 30 countries found in UP1 LDAP
        "FRANCE", "EGYPTE", "ROUMANIE", "ITALIE", "ALLEMAGNE", "TURQUIE", "VIETNAM", "ETATS UNIS", "ESPAGNE", "CHINE POPULAIRE",
        "MAROC", "BELGIQUE", "LUXEMBOURG", "ARGENTINE", "ALGERIE", "GRANDE BRETAGNE", "TOGO", "CANADA", "SUISSE", "BRESIL",
        "GRECE", "TUNISIE", "RUSSIE", "COTE D'IVOIRE", "ILE MAURICE", "PAYS BAS", "POLOGNE", "GABON", "AUTRICHE", "REPUBLIQUE DOMINICAINE",
    ],
};

