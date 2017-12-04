'use strict';

const wsgroupsURL = "https://wsgroups.univ-paris1.fr";

export default {
    printCardUrl: undefined, //(login) => `http://unicampus.univ.fr/unicampus/DesktopDefault.aspx?tabindex=1&tabid=2&NomCon=Xxxx&id_vis=${login}`,
    wsgroupsURL,
    base_pathname: '/',
    
    attr_labels: {
        supannCivilite: "Civilité",
        givenName: "Prénom",
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
        supannMailPerso: "Email personnel",
        jpegPhoto: "Photo",
        structureParrain: "SERVICE QUI INVITE : (UFR, Service, Laboratoire...)",
        duration_month: "Durée du compte (en mois)",
        userPassword: "Mot de passe",
        userPassword2: "Confirmer le mot de passe",
        cardChoice: "Carte",
        barcode: "Code barre",
        mifare: "Code Mifare",
        profilename: "Type de compte",
    },

    title: "Gestion de comptes",

    pattern: {
        phone: [
            "0(\\s*[0-9]){9}", // french
            "\\+(1|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|7|8[1246]|9[0-58]|[0-9]{3})(\\s*[0-9]){4,14}", // international country code, less than 15 digits
        ].join('|'),
        frenchPostalCode: "\\s*[0-9]{5}\\s*",
    },
    error_msg: {
        userPassword: 'Veuillez choisir un mot de passe comportant au moins 8 caractères. Ce mot de passe doit contenir des lettres minuscules, des lettres majuscules et des chiffres.',
        phone: 'Le champ doit être un numéro de téléphone. Exemples : 01 02 03 04 05  ou  +41 66 555 44 33  ou  +886 1 1234 5678',
        frenchPostalCode: 'Le champ doit être un code postal. Exemple: 75013',
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
    },

    countries: [
        // sorted first 30 countries found in UP1 LDAP
        "FRANCE", "EGYPTE", "ROUMANIE", "ITALIE", "ALLEMAGNE", "TURQUIE", "VIETNAM", "ETATS UNIS", "ESPAGNE", "CHINE POPULAIRE",
        "MAROC", "BELGIQUE", "LUXEMBOURG", "ARGENTINE", "ALGERIE", "GRANDE BRETAGNE", "TOGO", "CANADA", "SUISSE", "BRESIL",
        "GRECE", "TUNISIE", "RUSSIE", "COTE D'IVOIRE", "ILE MAURICE", "PAYS BAS", "POLOGNE", "GABON", "AUTRICHE", "REPUBLIQUE DOMINICAINE",
    ],

    assets: {
        lib: {
            css: [
                'node_modules/html5-boilerplate/dist/css/normalize.css',
                'node_modules/html5-boilerplate/dist/css/main.css',
                'node_modules/bootstrap/dist/css/bootstrap.css',
            ],
            js: [
                "node_modules/promise-polyfill/promise.js",
                wsgroupsURL + "/web-widget/autocompleteUser-resources.html.js",
            ],
        },
        css: [
            '.public/app.css'
        ],
    },
};

