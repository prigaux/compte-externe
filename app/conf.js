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
    assets: {
	lib: {
	    css: [
		'bower_components/html5-boilerplate/css/normalize.css',
		'bower_components/html5-boilerplate/css/main.css',
		'bower_components/bootstrap/dist/css/bootstrap.css',
		'bower_components/angular-bootstrap/ui-bootstrap-csp.css',
	    ],
	    js: [
		"bower_components/angular/angular.js",
		"bower_components/angular-route/angular-route.js",
		"bower_components/angular-messages/angular-messages.js",
		"bower_components/angular-bootstrap/ui-bootstrap-tpls.js",
		"bower_components/jsdiff/diff.js",
	    ],
	},
	css: [
	    'app.css'
	],
	js: [
	    "conf.js",
	    "app.js",
	    "controllers/various.js",
	    "controllers/create.js",
	    "controllers/validate.js",
	    "controllers/moderate.js",
	    "controllers/list.js",
	    "services/ws.js",
	    "services/attrsEdit.js",
	    "services/helpers.js",
	    "directives/various.js",
	    "directives/validators.js",
	    "directives/Bootstrap.js",
	    "directives/password-strength.js",
	],
	tests: [
	    // NB: only used by karma, wildcards allowed
	    'bower_components/angular-mocks/angular-mocks.js',
	    "controllers/*_test.js",
	    "directives/*_test.js",
	    "services/*_test.js",
	],
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = conf;
} else {
    /* globals window */
    window.conf = conf;
}
