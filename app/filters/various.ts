import Vue from "vue";
import * as Helpers from '../services/helpers';

Vue.filter('formatIdpId', function (s) {
        s = s.replace(/^https?:\/\//, '');
        s = s.replace(/.*\.(.*\..*)/, '$1');
        return s;
});


Vue.filter('date', Helpers.formatDate);
Vue.filter('escapeRegexp', Helpers.escapeRegexp);