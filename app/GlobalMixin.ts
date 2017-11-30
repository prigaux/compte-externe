import Vue from 'vue';
import conf from './conf';

export default Vue.extend({
    computed: {
        attr_labels() { return conf.attr_labels },
        conf() { return conf },
    },    
});