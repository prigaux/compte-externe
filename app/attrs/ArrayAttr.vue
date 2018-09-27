<template>

<div>
    <label v-if="val.length === 0" class="col-md-3 control-label">{{label}}</label>
    <div v-for="(item, i) in val">
        <genericAttr :name="name + (i ? '-' + i : '')" :opts="i ? item_opts : first_item_opts" :value="item" @input="v => set_item(i, v)" @remove="_ => remove_item(i)"
                :allow_remove="opts.optional || i > 0" :submitted="submitted">
        </genericAttr>
    </div>
    <div :class="'col-sm-offset-' + (val.length ? 10 : 7)" class="col-sm-2" style="padding: 0 0 2rem 0">
        <button class="btn btn-info" style="width: 100%" type="button" @click="val.push('')"><i class="glyphicon glyphicon-plus"></i></button>
    </div>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import CurrentLdapValue from './CurrentLdapValue.vue';

function init(val) {
    return val || [];
}

export default Vue.extend({
    props: ['name', 'value', 'ldap_value', 'opts', 'submitted'],
    components: { CurrentLdapValue },
    data() {
        const val = init(this.value);
        if (val.length === 0 && !this.opts.optional) val.push('');
        return {
            validity: { [this.name]: {}, submitted: false },
            val,
            ldap_val: init(this.ldap_value).join(' '),
            initial_val: val.join(' '), 
        };
    },
    computed: {
        label() { return this.attr_labels[this.name] },
        first_item_opts() { 
            return { optional: this.opts.optional, ...this.opts.items };
        },
        item_opts() {
            return { optional: true };
        },
    },
    watch: {
        value(val) {
            this.val = init(val);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    methods: {
        tellParent() {
            this.$emit('input', this.val);
        },
        set_item(i, v) {
            this.val[i] = v;
            this.tellParent();
        },
        remove_item(i) {
            this.val.splice(i, 1);
            this.tellParent();
        }
    
    },
});
</script>
