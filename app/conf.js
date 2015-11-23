'use strict';

var conf = {
    forceBrowserExit: true,
    
    attr_labels: {
        supannCivilite: "Civilité",
        givenName: "Prénom",
        sn: "Nom d'usage",
        birthName: "Nom de naissance",
        birthDay: "Date de naissance",
        address_line1: "Adresse personnelle",
        address_line2: "(complément)",
        postalCode: "Code postal",
        town: "Ville",
        country: "Pays",
        homePhone: "Téléphone personnel",
        supannMailPerso: "Email personnel",
        structureParrain: "SERVICE QUI INVITE : (UFR, Service, Laboratoire...)",
        userPassword: "Mot de passe",
        barcode: "Code barre",
    },

    attr_formatting: {
    },

    title: "Gestion de comptes",

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
                "bower_components/angular-cookies/angular-cookies.js",
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
            "services/ts.js",
            "services/ws.js",
            "services/attrsEdit.js",
            "services/helpers.js",
            "services/forceBrowserExit.js",
            "filters/various.js",
            "directives/various.js",
            "directives/validators.js",
            "directives/Bootstrap.js",
            "start.js",
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
