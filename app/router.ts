import VueRouter from "vue-router";
import conf from './conf';
import * as Helpers from './services/helpers'; 
import Step from './controllers/Step.vue';
import ModerateList from './controllers/ModerateList.vue';

import template_welcome from './templates/welcome.html'

export let router;

const _routes = {
    '/login/:kind?': { render(_h) { router.replace(this.$route.query.then) } }, // TODO, use vue-router redirect
    '/steps/:kind?': ModerateList,
    '/:stepName/:wanted_id?': Step,
    '/': { template: template_welcome },
};

const routes = [];
Helpers.eachObject(_routes, (path, component) => {
    routes.push({ path, component, props: true })
});

const opts = {
    mode: undefined,
    base: conf.base_pathname,
    routes,
};

declare var process;
if (process.env.NODE_ENV === 'production') {
    opts.mode = 'history';
}

router = new VueRouter(opts);
