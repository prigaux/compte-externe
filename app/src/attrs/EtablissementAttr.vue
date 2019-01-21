<template> 
  <my-bootstrap-form-group :name="name" :label="opts.title" :validity="validity" :labels="opts.labels">      
    <typeahead :name="name" v-model="val" :options="search" :minChars="3" :formatting="formatting"  :formatting_html="formatting_html"
        placeholder="Entrez une raison sociale, un SIRET ou un UAI"
        :required="!opts.optional"
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
                this.$emit('input', val.const);
                if (this.opts.onChange) this.opts.onChange(this.v, val.const, val);
            }
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    methods: {
        search: Ws.etablissements_search,
        formatting(e) {
            if (!e) return '';
            return e.title || e.displayName;
        },
        formatting_html(e) {
            if (!e) return '';
            const formatted_code = e.const.replace(/^\{(.*?)}/, "$1 : ");
            return (e.title || e.displayName) +
              `<br><span class="xsmall">${formatted_code + (e.postalAddress ? '  -  ' + e.postalAddress : '') }</span>`;
        },
    },
});
</script>
