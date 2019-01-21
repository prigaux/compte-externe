<script lang="ts">
import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers'; 

function attrs_data(vm) {
    let validity = { submitted : false };
    Helpers.eachObject(vm.attrs, (attr) => validity[attr] = {});
    Helpers.eachObject(conf.attr_labels, (attr) => validity[attr] = {});
    return { validity };
}

export default Vue.extend({
    props: ['v', 'attrs', 'submitted'],
    model: { prop: 'v', event: 'change' },
    data: function() { return attrs_data(this); },
    watch: {
        submitted(b) {
            this.validity.submitted = b;
        },
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
