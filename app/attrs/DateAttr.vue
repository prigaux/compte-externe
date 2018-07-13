<template>
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity">
    <input-with-validity :name="name" v-model="val" type="date"
       :min="opts.min" :max="opts.max" :required="!opts.optional" :validity.sync="validity[name]"></input-with-validity>
    <CurrentLdapValue :value="initial_val" :ldap_value="ldap_val"></CurrentLdapValue>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import CurrentLdapValue from './CurrentLdapValue.vue';

function init(date) {
    return date && date.toISOString().replace(/T.*/, '');
}

export default Vue.extend({
    props: ['name', 'value', 'ldap_value', 'label', 'opts', 'submitted'],
    components: { CurrentLdapValue },
    data() {
        const val = init(this.value);
        const ldap_val = init(this.ldap_value);
        return {
            validity: { [this.name]: {}, submitted: false },
            val,
            ldap_val,
            initial_val: val, 
        };
    },
    watch: {
        value(date) {
            if (date && date !== this.date) this.val = init(date);
        },
        date(date) {
            this.$emit('input', date);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    computed: {
        date() {
            return new Date(this.val);
        },
    },
});
</script>
