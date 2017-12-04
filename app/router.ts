import VueRouter from "vue-router";
import conf from './conf';
import * as Helpers from './services/helpers'; 
import { AttrsForm } from './services/attrsForm';
import { Validate } from './controllers/validate';
import { ModerateList } from './controllers/list';

import template_welcome from './templates/welcome.html'
import template_welcome_create from './templates/welcome-create.html'

console.log(template_welcome);

const _routes = {
    '/moderate/:wanted_id': AttrsForm,
    '/validate/:id': Validate,
    '/create/:initialStep': AttrsForm,
    '/moderate': ModerateList,
    '/': { template: template_welcome },
    '/create': { template: template_welcome_create },
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
