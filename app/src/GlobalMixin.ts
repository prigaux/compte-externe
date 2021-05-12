import * as _ from 'lodash';
import Vue from 'vue';
import conf from './conf';


export default Vue.extend({
    computed: {
        default_attrs_title() { return _.mapValues(conf.default_attrs_opts, (opts) => opts['title']) },
        conf() { return conf },
    },
    methods: {
        routerResolveFullHref(location) {
            const a = document.createElement('a');
            a.href = this.$router.resolve(location).href;
            return a.href;
        },
        v_to_readOnly_query(v) {
            return _.mapKeys(_.pickBy(v, val => val !== ''), (_v, k) => 'readOnly_' + k)
        },
        copyToClipboard(elt) {
            elt.select();
            document.execCommand('copy');
            elt.setSelectionRange(0, 0);
        },
    },
});
