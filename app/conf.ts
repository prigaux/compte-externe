'use strict';

const wsgroupsURL = "https://wsgroups.univ-paris1.fr";

const conf = {
    printCardUrl: undefined, //(login) => `http://unicampus.univ.fr/unicampus/DesktopDefault.aspx?tabindex=1&tabid=2&NomCon=Xxxx&id_vis=${login}`,
    wsgroupsURL,
    
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
        phone: "(\\s*[0-9]\\s*){10}",
        frenchPostalCode: "\\s*[0-9]{5}\\s*",
    },
    error_msg: {
        userPassword: 'Veuillez choisir un mot de passe comportant au moins 8 caractères. Ce mot de passe doit contenir des lettres minuscules, des lettres majuscules et des chiffres.',
        phone: 'Le champ doit être un numéro de téléphone. Exemple: 01 02 03 04 05',
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
                "node_modules/axios/dist/axios.js",
                "node_modules/vue/dist/vue.js",
                "node_modules/vue-router/dist/vue-router.js",
                "node_modules/diff/dist/diff.js",
                "node_modules/promise-polyfill/promise.js",
                wsgroupsURL + "/web-widget/autocompleteUser-resources.html.js",
            ],
        },
        css: [
            'app.css'
        ],
        js: [
            "conf.js",
            "services/helpers.js",
            "services/ws.js",
            "services/attrsEdit.js",
            "services/attrsForm.js",
            "filters/various.js",
            "controllers/create.js",
            "controllers/validate.js",
            "controllers/moderate.js",
            "controllers/list.js",
            "directives/various.js",
            "directives/validators.js",
            "directives/Bootstrap.js",
            "directives/typeahead.js",
            "start.js",
        ],
        tests: [
            // NB: only used by karma, wildcards allowed
            "directives/*_test.js",
            "services/*_test.js",
        ],
    },
};

declare let module;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = conf;
} else {
    /* globals window */
    window['conf'] = conf;
}
