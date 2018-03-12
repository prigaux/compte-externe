<template> 
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="opts.labels">      
    <typeahead :name="name" v-model="val" :options="search" :minChars="3" :formatting="function (e) { return e && e.description }"
        placeholder="Entrez une raison sociale ou un SIRET"
        :editable="false" :validity.sync="validity[name]"></typeahead>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import * as Ws from '../services/ws';

export default Vue.extend({
    props: ['value', 'name', 'opts', 'submitted', 'v'],
    data() {
        return {
          validity: { [this.name]: {}, submitted: false },
          val: undefined,
        };
    },
    asyncComputed: {
        valueS() {
            return this.value && Ws.etablissement_get(this.value);
        },
    },
    watch: {
        valueS(val) {
            this.val = val;
        },
        val(val) {
            if (val) {
                this.$emit('input', val.key);
                if (this.opts.onChange) this.opts.onChange(this.v, val.key, val);
            }
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    methods: {
        search: Ws.etablissements_search,
    },
});
</script>
