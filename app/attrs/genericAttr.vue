<template>
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="attr.labels" v-if="attr">

    <radio-with-validity :name="name" v-model="val" v-if="attr.uiType === 'radio'"
        :values="choicesMap" :validity.sync="validity[name]">
    </radio-with-validity>

    <select-with-validity :name="name" v-model="val" v-else-if="attr.uiType === 'select'"
        :choices="attr.choices" :required="!attr.optional" :validity.sync="validity[name]">
    </select-with-validity>

    <div class="checkbox" v-else-if="attr.uiType === 'checkbox'">
      <label>
        <checkbox-with-validity :name="name" v-model="val" :validity.sync="validity[name]">
        </checkbox-with-validity>
        <span v-html="conf.attrs_description[name]"></span>
      </label>
    </div>
    
    <input-with-validity :name="name" v-model="val" v-else
        :type="type" :realType="realType" :required="!attr.optional" :pattern="attr.pattern" :allowedChars="attr.allowedChars" :title="attr.labels && attr.labels.tooltip" :validity.sync="validity[name]">
    </input-with-validity>

  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import { includes, keyBy, mapValues } from 'lodash';

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
        choicesMap() {
            return this.attr.choices && mapValues(keyBy(this.attr.choices, 'key'), choice => choice.name);
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
