import Vue from "vue";
import VueRouter from "vue-router";
import { router } from './router';
import GlobalMixin from './GlobalMixin';

import "./filters/various";
import "./directives/various";
import "./directives/validators";
import "./directives/Bootstrap";
import "./directives/typeahead";
import "./services/attrsEdit";

Vue.mixin(GlobalMixin);
Vue.use(VueRouter)

new Vue({ 
    router
}).$mount(".page");
