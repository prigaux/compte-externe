'use strict';

// use the HTML5 History API
// $locationProvider.html5Mode(true);
//config(['$routeProvider', function($routeProvider) {
//  $routeProvider.otherwise({redirectTo: '/'});
//}]);

const _routes = {
    '/moderate/:id': Moderate,
    '/reuse/:uid': Reuse,
    '/validate/:id': Validate,
    '/create/:kind': Create,
    '/moderate': ModerateList,
    '/': { templateUrl: 'templates/welcome.html' },
    '/create': { templateUrl: 'templates/welcome-create.html' },
    '/auto-created/:id': { props: ['id'], templateUrl: 'templates/auto-created.html' },
    '/awaiting-email-validation': { templateUrl: 'templates/awaiting-email-validation.html' },
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

router.afterEach((to, _from) => {
    if (to.path.match(new RegExp("/awaiting-moderation/|/auto-created"))) {
        // rely on add-on which detects this cookie to clear history https://github.com/prigaux/firefox-trigger-clear-history
        Helpers.createCookie('forceBrowserExit', 'true', 0);
    }
});

const app = new Vue({ 
    router
}).$mount(".page");
