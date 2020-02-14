<template>
  <my-bootstrap-form-group :name="name" :label="opts.title" :validity="validity" :labels="opts.labels">
    <input-with-validity :name="name" v-model="val" type="date"
       :disabled="opts.readOnly"
       :min="min" :max="max" :required="!opts.optional" :validity.sync="validity[name]"></input-with-validity>
    <CurrentLdapValue :value="initial_val" :ldap_value="ldap_val" @input="v => val = v"></CurrentLdapValue>
    <span v-html="opts.description"></span>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import CurrentLdapValue from './CurrentLdapValue.vue';

function toYYYY_MM_DD(date) {
    return date && date.toISOString().replace(/T.*/, '');
}
const init = toYYYY_MM_DD;

export default Vue.extend({
    props: ['name', 'value', 'ldap_value', 'opts'],
    components: { CurrentLdapValue },
    data() {
        const val = init(this.value);
        const ldap_val = init(this.ldap_value);
        return {
            validity: { [this.name]: {} },
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
    },
    computed: {
        date() {
            return this.val && new Date(this.val) || undefined;
        },
        min() {
            return toYYYY_MM_DD(this.opts.minDate);
        },
        max() {
            return toYYYY_MM_DD(this.opts.maxDate);
        },
    },
});
</script>
