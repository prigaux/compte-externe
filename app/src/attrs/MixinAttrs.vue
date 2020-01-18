<script lang="ts">
import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers'; 

function attrs_data(vm) {
    let validity = {};
    Helpers.eachObject(vm.attrs, (attr) => validity[attr] = {});
    Helpers.eachObject(conf.default_attrs_opts, (attr) => validity[attr] = {}); // TODO: get rid of this. Hopefully not needed anymore
    return { validity };
}

export default Vue.extend({
    props: ['v', 'attrs'],
    model: { prop: 'v', event: 'change' },
    data: function() { return attrs_data(this); },
    watch: {
        v: {
            deep: false,
            handler(v) {
                console.log("re-emitting", v);
                return this.$emit('change', v);
            },
        },
    },
});
</script>
