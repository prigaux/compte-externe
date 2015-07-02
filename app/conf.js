'use strict';

var conf = {
    attr_labels: {
	supannCivilite: "Civilité",
	givenName: "Prénom",
	sn: "Nom d'usage",
	birthName: "Nom de naissance",
	birthDay: "Date de naissance",
	homePostalAddress: "Adresse personnelle",
	homePhone: "Téléphone personnel",
	supannMailPerso: "Email personnel",
	structureParrain: "SERVICE QUI INVITE : (UFR, Service, Laboratoire...)",
	userPassword: "Mot de passe",
	barcode: "Code barre",
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = conf;
} else {
    /* globals window */
    window.conf = conf;
}
