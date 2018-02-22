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
        siret: "Etablissement",
        charter: "Charte",
        duration_or_enddate: "Fin du compte",
        duration: "Durée",
        enddate: "Date de fin",
    },

    attrs_description: {
        charter: `Vous acceptez de vous conformer 
            aux chartes informatiques <a target="_blank" href="http://dsiun.univ-paris1.fr/fileadmin/DSI/Chartes/charte_utilisation_ressources_informatiques_et_internet.html">de l'université</a> 
            et <a target="_blank" href="http://www.renater.fr/IMG/pdf/Charte_RENATER_Vjanv2014.pdf" >du réseau RENATER</a>.
            <br>
            Votre compte et son mot de passe associé sont strictement personnels : vous êtes seul responsable de l'usage qui en est fait.`,
    },

    default_attrs_opts: {
        supannCivilite: { uiType: 'radio' },
        homePhone: { uiType: "phone" },
        telephoneNumber: { uiType: "phone" },
        supannMailPerso: { uiType: "email" },
        givenName: { allowedChars: allowedCharsInNames },
        sn: { allowedChars: allowedCharsInNames },
        birthName: { allowedChars: allowedCharsInNames, labels: { tooltip: "si différent du nom d'usage" } },
        duration_or_enddate: { uiType: 'radio' },
        duration: { uiType: 'select' },
        profilename: { uiType: 'radio' },
        charter: { uiType: 'checkbox' },
        roomAccess: { uiType: 'select' },
        floorNumber: { uiType: 'select' },
    },

    attrs_order: [
        'supannCivilite', 'givenName', 'altGivenName', 'sn', 'birthName', 'birthDay',
        'homePostalAddress', 'homePhone', 'supannMailPerso',
        'jpegPhoto',
    ],

    title: "Gestion de comptes",

    pattern: {
        frenchPhone: "^(\\+33|0)\\s*[1-9](\\s*[0-9]){8}$", // french
        phone: [
            "0\\s*[1-9](\\s*[0-9]){8}", // french
            "\\+(1|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|7|8[1246]|9[0-58]|[0-9]{3})(\\s*[0-9]){4,14}", // international country code, less than 15 digits
        ].join('|'),
        frenchPostalCode: "\\s*[0-9]{5}\\s*",
    },
    error_msg: {
        userPassword: 'Veuillez choisir un mot de passe comportant au moins 8 caractères. Ce mot de passe doit contenir des lettres minuscules, des lettres majuscules et des chiffres.',
        phone: 'Le champ doit être un numéro de téléphone. Exemples : 01 02 03 04 05  ou  +41 66 555 44 33  ou  +886 1 1234 5678',
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

