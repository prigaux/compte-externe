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
        copyToClipboard(elt) {
            elt.select();
            document.execCommand('copy');
            elt.setSelectionRange(0, 0);
        },
    },
});
