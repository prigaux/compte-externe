/// <reference path='types.d.ts' />

import checkDisplayName from './validators/displayName';
import * as helpers from './helpers';
import { is } from './helpers'

const accentsRange = '\u00C0-\u00FC';
const allowedCharsInNames = "[A-Za-z" + accentsRange + "'. -]";
const normalizeApostropheAndTrim = (s : string) => s.replace(/[’′´‘]/g, "'").replace(/^\s*/, '').replace(/\s*$/, '');

const wsgroupsURL = "https://wsgroups.univ-paris1.fr";

export default {
    printCardUrl: undefined, //(login) => `http://unicampus.univ.fr/unicampus/DesktopDefault.aspx?tabindex=1&tabid=2&NomCon=Xxxx&id_vis=${login}`,
    wsgroupsURL,
    title: "Gestion de comptes",
    may_display_fieldIsRequired_hint: true,

    // order of keys is used in CompareUsers
    default_attrs_opts: is<SharedStepAttrsOption>({
        supannCivilite: { title: "Civilité" },
        givenName: { title: "Prénom", allowedChars: allowedCharsInNames, normalize: normalizeApostropheAndTrim },
        altGivenName: { title: 'Autres prénoms', allowedChars: allowedCharsInNames, normalize: normalizeApostropheAndTrim },
        sn: {
            title: "Nom d'usage", allowedChars: allowedCharsInNames, normalize: normalizeApostropheAndTrim, 
            labels: { tooltip: "Nom marital, nom d'épouse ou nom de naissance" },
        },
        birthName: { 
            title: "Nom de naissance", allowedChars: allowedCharsInNames, normalize: normalizeApostropheAndTrim, 
            labels: { tooltip: "si différent du nom d'usage" },
        },
        displayName: { 
            title: "Nom annuaire", validator: checkDisplayName,
            description: "Nom affiché dans l'annuaire de l'université.",
        },
        birthDay: { title: "Date de naissance", format: 'date', uiType: 'date', minDate: new Date('1900'), minYear: 1900, maxDate: new Date(), maxYear: new Date().getUTCFullYear() },
        homePostalAddress: { title: "Adresse personnelle", uiType: 'postalAddress' },
        homePhone: { title: "Téléphone personnel", uiType: "phone", format: 'phone' },
        pager: { title: "Mobile personnel", uiType: "frenchMobilePhone", format: 'phone' },
        supannMailPerso: { title: "Email personnel", uiType: "email" },
        jpegPhoto: { title: "Photo", format: 'image/jpeg', uiType: 'cameraSnapshot' },
        telephoneNumber: { title: 'Téléphone fixe', uiType: "phone", format: "phone" },
        mobile: { title: "Mobile professionnel", uiType: "phone", format: "phone" },
        facsimileTelephoneNumber: { title: "Fax", uiType: "phone", format: "phone" },
        supannAutreTelephone: { title: 'Autres téléphones', items: { uiType: "phone", format: "phone" } },
        postalAddress: { title: "Adresse professionnelle", uiType: 'postalAddress' },
        roomAccess: { title: "Précision du lieu" },
        floorNumber: { title: "Étage" },
        roomNumber: { title: "Numéro de bureau", description: "(Exemples : 1805 ; A 406 ; 305 B ; A 406 bis ; 1506 ter)" },
        buildingName: { title: "Site" },
        userPassword: { title: "Mot de passe", uiType: 'newPassword' },
        userPassword2: { title: "Confirmer le mot de passe" },
        cardChoice: { title: "Carte" },
        barcode: { title: "Code barre" },
        mifare: { title: "Code Mifare" },
        profilename: { title: "Type de compte" },
        supannEntiteAffectation: { title: "Structure(s)/Composante(s)" },
        description: { title: "Activité(s)" },  
        employeeType: { title: "Corps" },
        supannActivite: { title: "Emploi" },
        departmentNumber: { title: "Discipline(s)" },
        supannRoleGenerique: { title: "Fonction(s) d'encadrement" },    
        etablissementExterneOrNew: { title: "Etablissement de provenance" },
        eduPersonAffiliation: { title: "Vous êtes" },
        global_eduPersonAffiliation: { title: "Statut(s)" },
        global_eduPersonPrimaryAffiliation: { title: "Statut principal" },
        etablissement_description: { title: "Raison sociale" },
        etablissement_postalAddress: { title: "Adresse de l'établissement", uiType: 'postalAddress' },
        etablissement_labeledURI: { title: "Site web de l'établissement", uiType: 'url' },
        etablissement_telephoneNumber: { title: "Numéro de téléphone", uiType: 'phone', format: 'phone' },
        etablissement_facsimileTelephoneNumber: { title: "Numéro de fax", uiType: 'phone', format: 'phone' },
        etablissement_siret: { title: "SIRET", uiType: 'siret' },
        charter: { title: "Charte", uiType: 'checkbox', description: 
           `Vous acceptez de vous conformer aux chartes informatiques 
            <a target="_blank" href="http://dsiun.univ-paris1.fr/fileadmin/DSI/Chartes/charte_utilisation_ressources_informatiques_et_internet.html">de l'université</a> 
            et
            <a target="_blank" href="http://www.renater.fr/IMG/pdf/Charte_RENATER_Vjanv2014.pdf" >du réseau RENATER</a>.
            <br>
            Votre compte et son mot de passe associé sont strictement personnels :
            vous êtes seul responsable de l'usage qui en est fait.`,
        },
        duration_or_enddate: { title: "Fin du compte" },
        duration: { title: "Durée" },
        startdate: { title: "Date de début", format: 'date', uiType: 'date', minDate: helpers.addDays(new Date(), -45), minYear: new Date().getUTCFullYear() },
        enddate: { title: "Date de fin", format: 'date', uiType: 'date', minDate: new Date(), minYear: new Date().getUTCFullYear() },
        supannAliasLogin: { title: 'Identifiant' },
        supannCodeINE: { title: "Numéro INE" },
        supannEtuId: { title: "Numéro étudiant" },
        supannEmpId: { title: 'Numéro agent' },
        supannEtuEtape: { title: "Diplôme(s) en cours" },
        supannListeRouge: { title: "Figurer sur la liste rouge" },
        eduPersonPrincipalName: { title: "Identifiant dans l'établissement" },
        mail: { title: "Courriel" },
        etablissementExterne: { 
            uiPlaceholder: "Entrez une raison sociale, un SIRET ou un UAI",
            onChange(v, _, etablissementS) {
                // set every "etablissement" fields in v, with prefix "etablissement_"
                Object.keys(v).forEach(k => { if (k.match(/^etablissement_/)) v[k] = '' });
                Object.keys(etablissementS).forEach(k => v[`etablissement_${k}`] = etablissementS[k]);
            },
            formatting(e) {
                if (!e) return '';
                return e.title || e.displayName;    
            },
            formatting_html(e) {
                if (!e) return '';
                const formatted_code = e.const.replace(/^\{(.*?)}/, "$1 : ");
                const details = `<br><span class="xsmall">${formatted_code + (e.postalAddress ? '  -  ' + e.postalAddress : '') }</span>`;
                return (e.title || e.displayName) + details;
            },
        },
    }),

    pattern: {
        frenchPhone: "^(\\+33|0)\\s*[1-9](\\s*[0-9]){8}$", // french
        frenchMobilePhone: "(0|\\+33)\\s*[67](\\s*[0-9]){8}",        
        phone: [
            "0\\s*[1-9](\\s*[0-9]){8}", // french
            "\\+(1|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|7|8[1246]|9[0-58]|[0-9]{3})(\\s*[0-9]){4,14}", // international country code, less than 15 digits
        ].join('|'),
        frenchPostalCode: "\\s*[0-9]{5}\\s*",
        country: "^(?!\\d)", // do not start with a digit (to warn someone mistakenly entering a postalcode or road number)
    },
    error_msg: {
        radio_required: 'Veuillez sélectionner une de ces options.',
        userPassword: 'Veuillez choisir un mot de passe comportant au moins 8 caractères. Ce mot de passe doit contenir des lettres minuscules, des lettres majuscules et des chiffres.',
        phone: 'Le champ doit être un numéro de téléphone. Exemples : 01 02 03 04 05  ou  +41 66 555 44 33  ou  +886 1 1234 5678',
        frenchMobilePhone: 'Le champ doit être un numéro de téléphone mobile français. Exemples : 06 02 03 04 05',
        frenchPostalCode: 'Le champ doit être un code postal. Exemple: 75013',
        country: 'Veuillez saisir un nom de pays',
        siret: 'Numéro SIRET invalide',
        forbiddenChars: (forbiddenChars) => (
            forbiddenChars.length === 1 ?
             `Le caractère « ${forbiddenChars} » n'est pas autorisé.` :
             `Les caractères « ${forbiddenChars} » ne sont pas autorisés.`
        ),
    },        

    affiliation_labels: { // NB: ordering used in search_ldap.people_choices
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
    
    // used for homonyms detection & displayName validation
    sns: ['sn', 'birthName'],
    givenNames: ['givenName', 'altGivenName'],
};

