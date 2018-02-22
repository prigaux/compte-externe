<template>
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="attr.labels" v-if="attr">
    <input-with-validity :name="name" v-model="val"
        :type="type" :realType="realType" :required="!attr.optional" :pattern="attr.pattern" :allowedChars="attr.allowedChars" :validity.sync="validity[name]">
    </input-with-validity>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import { includes } from 'lodash';

export default Vue.extend({
    props: ['value', 'name', 'attr', 'submitted'],
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: this.value,
            doGet: null,
        };
    },
    computed: {
        type() {
            return this.realType || !this.attr.uiType ?
               'text' : 
               this.attr.uiType;
        },
        realType() { 
            return includes(['phone', 'frenchPostalCode', 'siret'], this.attr.uiType) ? this.attr.uiType : undefined;
        },
    },
    watch: {
        value(val) {
            this.val = val;
        },
        val(val) {
            this.$emit('input', val);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
});
</script>
