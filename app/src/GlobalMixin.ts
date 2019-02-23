import * as _ from 'lodash';
import Vue from 'vue';
import conf from './conf';
import * as Helpers from './services/helpers';


export default Vue.extend({
    computed: {
        default_attrs_title() { return _.mapValues(conf.default_attrs_opts, (opts) => opts['title']) },
        conf() { return conf },
    },
    methods: {
        hasAffiliation(v, ...affiliations) {
            return Helpers.arrayContains(v.global_eduPersonAffiliation || [], affiliations);
        },
    },
});
