import VueRouter from "vue-router";
import conf from './conf';
import * as Helpers from './services/helpers'; 
import { AttrsForm } from './services/attrsForm';
import { ModerateList } from './controllers/list';

import template_welcome from './templates/welcome.html'

console.log(template_welcome);

const _routes = {
    '/login/:kind?': { render(_h) { router.replace(this.$route.query.then) } }, // TODO, use vue-router redirect
    '/steps/:kind?': ModerateList,
    '/:stepName/:wanted_id?': AttrsForm,
    '/': { template: template_welcome },
};

const routes = [];
Helpers.eachObject(_routes, (path, component) => {
    if (!component.name) component.name = path.replace(/\W/g, '');
    routes.push({ path, component, props: true })
});

export const router = new VueRouter({
  mode: 'history',
  base: conf.base_pathname,
  routes,
});
