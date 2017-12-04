import Vue from "vue";
import VueRouter from "vue-router";
import * as Helpers from './services/helpers'; 
import { router } from './router';
import GlobalMixin from './GlobalMixin';

import "./filters/various";
import "./directives/various";
import "./directives/validators";
import "./directives/Bootstrap";
import "./directives/typeahead";
import "./services/attrsEdit";

router.afterEach((to, _from) => {
    if (to.path.match(new RegExp("/awaiting-moderation/|/auto-created"))) {
        // rely on add-on which detects this cookie to clear history https://github.com/prigaux/firefox-trigger-clear-history
        Helpers.createCookie('forceBrowserExit', 'true', 0);
    }
});

Vue.mixin(GlobalMixin);
Vue.use(VueRouter)

new Vue({ 
    router
}).$mount(".page");
