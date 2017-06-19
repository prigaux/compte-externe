'use strict';

// use the HTML5 History API
// $locationProvider.html5Mode(true);
//config(['$routeProvider', function($routeProvider) {
//  $routeProvider.otherwise({redirectTo: '/'});
//}]);

const _routes = {
    '/moderate/:id': Moderate,
    '/validate/:id': Validate,
    '/create/:kind': Create,
    '/moderate': ModerateList,
    '/': { templateUrl: 'templates/welcome.html' },
    '/create': { templateUrl: 'templates/welcome-create.html' },
    '/auto-created/:id': { props: ['id'], templateUrl: 'templates/auto-created.html' },
    '/awaiting-email-validation': { templateUrl: 'templates/awaiting-email-validation.html' },
    '/browser-exit': { templateUrl: 'templates/browser-exit.html' },
    '/awaiting-moderation/:id': { props: ['id'], templateUrl: 'templates/awaiting-moderation.html' },
};

const routes = [];
Helpers.eachObject(_routes, (path, component) => {
    if (!component.name) component.name = path.replace(/\W/g, '');
    if (component.templateUrl) component = Helpers.templateUrl(component);
    routes.push({ path, component, props: true })
});

const router = new VueRouter({
  mode: 'history',
  routes,
});

if (conf.forceBrowserExit) {
    ForceBrowserExit.install(new RegExp("/awaiting-moderation/|/auto-created"), '/browser-exit');
}

const app = new Vue({ 
    router
}).$mount(".page");
