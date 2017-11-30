import VueRouter from "vue-router";
import conf from './conf';
import * as Helpers from './services/helpers'; 
import { Create } from './controllers/create';
import { Moderate, Reuse } from './controllers/moderate';
import { Validate } from './controllers/validate';
import { ModerateList } from './controllers/list';

import template_welcome from './templates/welcome.html'
import template_welcome_create from './templates/welcome-create.html'
import template_auto_created from './templates/auto-created.html';
import template_awaiting_email_validation from './templates/awaiting-email-validation.html';
import template_awaiting_moderation from './templates/awaiting-moderation.html';

console.log(template_welcome);

const _routes = {
    '/moderate/:id': Moderate,
    '/reuse/:uid': Reuse,
    '/validate/:id': Validate,
    '/create/:kind': Create,
    '/moderate': ModerateList,
    '/': { template: template_welcome },
    '/create': { template: template_welcome_create },
    '/auto-created/:id': { props: ['id'], template: template_auto_created },
    '/awaiting-email-validation': { template: template_awaiting_email_validation },
    '/awaiting-moderation/:id': { props: ['id'], template: template_awaiting_moderation },
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
