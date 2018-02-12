import * as _ from 'lodash';
import { inclusive_range as range, sameKeyNameChoices } from './helpers';
import * as search_ldap from './search_ldap';
import * as ldap from './ldap';
import * as conf from './conf';
import * as helpers from './helpers';
import * as translate from './translate'
import shared_conf from '../shared/conf';
const filters = ldap.filters;

const const_to_choices = (l: string[]) => (
    _.map(l, const_ => ({ const: const_, title: const_ }))
)

const up1Table = (constraint_filter: string, ldapAttr_for_const: string, optional: boolean) => (
    async (token: string, sizeLimit: number) => {
        let filter;
        if (token.match(/\{.*/) || sizeLimit === 1) {
            filter = filters.eq(ldapAttr_for_const, token);
        } else if (token !== '') {
            filter = filters.fuzzy(['displayName'], token);
        }
        const filter_ = token === '' ? constraint_filter : filters.and([ filter, constraint_filter ]); 
        const l = await ldap.search(conf.ldap.base, filter_, { const: '', title: '' }, {
            const: { ldapAttr: ldapAttr_for_const },
            title: { ldapAttr: 'displayName' },
        }, { sizeLimit });
        let l_ = _.sortBy(l, 'title')
        if (optional && token === '') l_.unshift({ const: undefined, title: 'Ne pas préciser' });
        return l_;
    }
)

export const search_supannRoleGenerique_up1 = (opts: StepAttrOption) => ({
    oneOf_async: up1Table('(&(up1TableName=supannRoleGenerique)(up1Flags={PRIO}*))', 'up1TableKey', opts.optional),
    ...opts
})
export const search_supannActivite_up1 = (opts: StepAttrOption) => ({
    oneOf_async: up1Table('(&(up1TableName=supannActivite)(up1TableKey={UAI:0751717J:ACT}*))', 'displayName', opts.optional),
    ...opts
});
export const search_supannActivite = (opts: StepAttrOption) => ({
    oneOf_async: up1Table('(up1TableName=supannActivite)', 'up1TableKey', opts.optional),
    ...opts
});

const new_etablissement = {
    etablissement_siret: {},
    etablissement_description: {},
    etablissement_labeledURI: { "optional": true },
    etablissement_postalAddress: { "optional": true },
    etablissement_telephoneNumber: { "optional": true },
    etablissement_facsimileTelephoneNumber: { "optional": true },      
};

const etablissementExterneOrNew : StepAttrOption = {
    default: 'existing',
    oneOf: [
        { const: 'existing', title: "chercher dans la liste ci-dessous", merge_patch_parent_properties: {
            etablissementExterne: { oneOf_async: search_ldap.etablissements },
            ..._.mapValues(new_etablissement, opts => ({ toUserOnly: true, ...opts })),
        } },
        { const: 'new', title: "non trouvé dans la liste", merge_patch_parent_properties: new_etablissement },
    ]
};

const _main_profile_source_to_name: Dictionary<string> = {
    'APOGEE': 'géré dans Apogée',
    'SIHAM': 'géré par la DRH dans SIHAM',
    'RESEAUPRO': 'géré par Réseau Pro',
    'comptex/iae' : 'géré par la DRH IAE',
}

const _explain_main_profile = (v: v) => {

    let main_prof = _.maxBy(v.up1Profile || [], 'priority')

    if ((main_prof?.priority || 0) < 590 && v.global_supannEtuAnneeInscription) {
        const annees = v.global_supannEtuAnneeInscription;
        const lastAnneeInscription = annees && Math.max(...annees);

        const endDate = new Date(lastAnneeInscription + 1, 9 - 1, 1); // 201X/09/01
        const willExpireSoon = endDate < new Date();
        return { source: "APOGEE", lastAnneeInscription, willExpireSoon, willNotExpireSoon: !willExpireSoon }
    }
    if (!main_prof && v.etablissementExterne === '{AUTRE}PCU-ReseauPro' && v.global_structureParrain?.includes('DGJC')) {
        main_prof = { profilename: "{RESEAUPRO}alum", enddate: v.global_shadowExpire }
    }
    if (!main_prof && v.global_eduPersonPrimaryAffiliation === 'alum') {
        return { source: "{GRACE}student" }
    }
    const profilename = main_prof?.profilename || ''
    let willExpireSoon, willNotExpireSoon
    if (main_prof?.enddate) {
        willExpireSoon = main_prof.enddate < helpers.addDays(new Date(), 31 * 2)
        willNotExpireSoon = !willExpireSoon
    }
    let m
    const source = 
        profilename.match(/^\{HARPEGE}/) ? 'SIHAM' : 
        (m = profilename.match(/^\{COMPTEX:(.*?)\}/)) ? 'comptex/' + m[1] :
        profilename.match(/^\{RESEAUPRO}/) ? 'RESEAUPRO' :
        null;
    return { source, willExpireSoon, willNotExpireSoon }
}

const explain_main_profile = (_: any, v: v) => {
    if (!v.uid) return undefined;

    const r = _explain_main_profile(v)

    const formatAcademicYear = (n : number) => n ? `${n} / ${n+1}` : '';

    let description;
    if (r.source === 'APOGEE' && r.willExpireSoon) {
        description = `était étudiant en ${formatAcademicYear(r.lastAnneeInscription)}`
    } else {
        const handled_by = _main_profile_source_to_name[r.source]
        description = `
  est ${shared_conf.affiliation_labels[v.global_eduPersonPrimaryAffiliation] || 'un ancien compte sans affiliation'}
  ${formatAcademicYear(r.lastAnneeInscription)}
  
` + (handled_by && r.willNotExpireSoon ? `<b>${handled_by}</b>` : '')
    }
    return { ...r, description }
}

export const attrs : StepAttrsOption = {
    barcode: { 
        pattern: "[0-9]{12,}|",
    },
    mifare: { 
        pattern: "[0-9A-F]{14}|", // MIFARE 7 bytes TAG
    },
    roomNumber: {
        pattern: "(([A-Z]\\s[0-9]+)|([0-9]+(\\s[A-Z])?))(\\sbis|\\ster)?|[A-Z][0-9]{2}-[0-9]{2}[0-9A-Z]",
        labels: { 
            custom_error_message: "Veuiller saisir un numéro de bureau sous la forme lettre+espace+numéro ou numéro+espace+lettre (en majuscule).",
        },
    },
    floorNumber: { oneOf: [
        { const: undefined, title: "Sélectionnez un étage" },
        ... sameKeyNameChoices([ 
            "Niveau -2", "Niveau -1", "Rez-de-chaussée", "1er", 
            ... range(2, 22).map(n => `${n}e`), // "2e" .. "22e", PMF + autres
        ]),
    ] },
    roomAccess: { oneOf: [
        { const: undefined, title: "ne pas préciser" },
        ... sameKeyNameChoices([ 
            "Aile Cujas", "Aile Soufflot", "Cour d'honneur", // Pantheon ?
            ... range("A", "O").map(c => "Esc. " + c), // Pantheon ?
            ... range("A", "C").map(c => "Tour " + c), // PMF
        ])
    ] },

    eduPersonAffiliation: { oneOf: [
        { const: "teacher", title: "Enseignant" },
        { const: "researcher", title: "Chercheur" },
        { const: "staff", title: "Personnel Biatss" },
        { const: "emeritus", title: "Professeur émérite" },
        { const: "student", title: "Étudiant" },
        { const: "alum", title: "Ancien étudiant" },
    ] },

    buildingName: { oneOf: [
        { const: undefined, title: "ne pas préciser" },
        ... const_to_choices([
            "Bibliothèque de la Sorbonne",
            "Boutique publications de la Sorbonne",
            "Campus Condorcet - site d'Aubervilliers",
            "Campus Condorcet - site Porte de la Chapelle",
            "Campus Jourdan", // GLPI UP1#96132
            "Carré Colbert - INHA",
            "Centre 17 rue de Tolbiac",
            "Centre Berbier du Mets",
            "Centre Bourg-la-Reine",
            "Centre Broca",
            "Centre Cujas",
            "Centre Lourcine",
            "Centre Malher",
            "Centre Meudon",
            "Centre Michelet",
            "Centre Nanterre", "Centre Nanterre - Maison archéologie René Ginouvès",
            "Centre Panthéon",
            "Centre Pierre Mendès France",
            "Centre Port-Royal René Cassin",
            "Centre rue d'Ulm",
            "Centre rue Watt",
            "Centre Saint Charles",
            "Centre Sorbonne Cousin",
            "Centre Sorbonne",
            "Institut de géographie",
            "Jardin d'agronomie tropicale de Paris",
            "Maison des sciences économiques",
            "Maison internationale",
            "Marin Mersenne",
            "Sainte Barbe (Institut Tunc)",
        ]),
    ] },

    structureParrain: { 
        title: "Service qui invite : (UFR, service, laboratoire...)",
        oneOf_async: search_ldap.structures,
    },

    etablissementExterneOrNew,

    optional_etablissementExterneOrNew: {
        default: 'existing',
        uiType: 'radio',
        oneOf: [
            { const: 'unknown', title: "inconnu"},
            ...etablissementExterneOrNew.oneOf,
        ],
    },

    mailFrom_email: { 
        optional: true, uiType: "email",
        title: "Adresse mél expéditeur pour l'envoi de mail à l'utilisateur",
    },
    mailFrom_text: { 
        optional: true, 
        title: "Nom de l'expéditeur pour l'envoi de mail à l'utilisateur",
    },
    
    global_main_profile: { 
        toUser: explain_main_profile, 
        toUserOnly: true, 
        uiHidden: true,
    },

    accountStatus: { 
        title: 'Status', 
        oneOf: [ {const: "active", title: "actif"}, { const: undefined, title: "non activé"}, { const: 'deleted', title: 'supprimé'}, { const: 'disabled', title: 'désactivé'} ],
    },
};

translate.add_translations({
    fr: {}, // default is french!
    en: {
        "Type de compte": "Account kind",
        "Date de début": "Account start date",
        "Date de fin": "Account end date",
        "Fin du compte": "Account end date",
        "Date de naissance": "Date of birth",
        "Durée": "Duration",
        "Civilité": "Gender",
        "Nom d'usage": "Common name",
        "Prénom": "First name",
        "Nom de naissance": "Birth name",
        "Informations personnelles": "Personal informations",
        "Etablissement de provenance": "Establishment of origin",
        "Email personnel": "Personal email",
        "Adresse personnelle": "Home postal address",
        "Téléphone personnel": "Home phone number",
        "Choisir une durée": "Choose a duration",
        "ou une date": "or a date",
        "inconnu": "unknown",
        "chercher dans la liste ci-dessous": "search it below",
        "non trouvé dans la liste": "not found",
        "M.": "Male",
        "Mme": "Female",

        "Choisir": "Choose",
        "Email de la personne": "Guest email",
        "Email professionnel": "Business email",
        "Numéro de fax": "Fax number",
        "Numéro de téléphone": "Phone number",
        "Service qui invite : (UFR, service, laboratoire...)": "Service that invites (UFR, service, labotory...)",
        "SIRET": "SIRET code",
        "Téléphone professionnel": "Business phone",

    },
})
