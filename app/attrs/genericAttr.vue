<template>
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="attr.labels" v-if="attr">
    <radio-with-validity :name="name" v-model="val" v-if="attr.uiType === 'radio'"
        :values="attr.choicesMap" :validity.sync="validity[name]">
    </radio-with-validity>
    <input-with-validity :name="name" v-model="val" v-else
        :type="type" :realType="realType" :required="!attr.optional" :pattern="attr.pattern" :allowedChars="attr.allowedChars" :title="attr.labels && attr.labels.tooltip" :validity.sync="validity[name]">
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
