import Vue from "vue";
import VueRouter from "vue-router";
import AsyncComputed from 'vue-async-computed';
import { router } from './router';
import GlobalMixin from './GlobalMixin';

import "./filters/various";
import "./directives/various";
import "./directives/validators";
import "./directives/Bootstrap";
import "./directives/typeahead";

Vue.mixin(GlobalMixin);
Vue.use(VueRouter)
Vue.use(AsyncComputed)

new Vue({ 
    router
}).$mount(".page");
