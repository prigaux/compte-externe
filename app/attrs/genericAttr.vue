<template>
 <div v-if="attr && (!attr.readonly || val)">

  <DateAttr v-model="val" :label="attr_labels[name]" v-if="uiType === 'date'"
    :minYear="attr.minYear" :maxYear="attr.maxYear" :submitted="submitted">
  </DateAttr>

  <AddressAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'postalAddress'"
    :submitted="submitted">
  </AddressAttr>

  <jpegPhotoAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'photo'"
     :attrs="attr" :submitted="submitted">
  </jpegPhotoAttr>

  <StructureAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'structure'"
     :attrs="attr" :submitted="submitted">
  </StructureAttr>

  <PasswordAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'password'"
     :submitted="submitted">
  </PasswordAttr>

  <my-bootstrap-form-group :name="name" multi="true" :label="attr_labels[name]" v-else-if="uiType === 'siret'">
     <div class="col-xs-3" :class="{'has-error': validity.submitted && !validity[name].valid}">
         <input-with-validity :name="name" v-model="val"
            real-type="siret" placeholder="Numéro SIRET" :required="!attr.optional" :validity.sync="validity[name]">
         </input-with-validity>
         <validation-errors :name="name" :validity="validity"></validation-errors>
     </div>
  </my-bootstrap-form-group>

  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="attr.labels" v-else-if="attr">

    <radio-with-validity :name="name" v-model="val" v-if="uiType === 'radio'"
        :values="choicesMap" :validity.sync="validity[name]">
    </radio-with-validity>

    <select-with-validity :name="name" v-model="val" v-else-if="uiType === 'select'"
        :choices="attr.choices" :required="!attr.optional" :validity.sync="validity[name]">
    </select-with-validity>

    <div class="checkbox" v-else-if="uiType === 'checkbox'">
      <label>
        <checkbox-with-validity :name="name" v-model="val" :validity.sync="validity[name]">
        </checkbox-with-validity>
        <span v-html="conf.attrs_description[name]"></span>
      </label>
    </div>
    
    <input-with-validity :name="name" v-model="val" v-else
        :disabled="attr.readonly"
        :type="type" :realType="realType" :required="!attr.optional" :pattern="attr.pattern" :allowedChars="attr.allowedChars" :title="attr.labels && attr.labels.tooltip" :validity.sync="validity[name]">
    </input-with-validity>

  </my-bootstrap-form-group>
 </div>
</template>

<script lang="ts">
import Vue from "vue";
import { includes, keyBy, mapValues } from 'lodash';

import DateAttr from './DateAttr.vue';
import AddressAttr from './AddressAttr.vue';
import jpegPhotoAttr from './jpegPhotoAttr.vue';
import PasswordAttr from './PasswordAttr.vue';
import StructureAttr from './StructureAttr.vue';

export default Vue.extend({
    props: ['value', 'name', 'attr', 'submitted'],
    components: { DateAttr, AddressAttr, jpegPhotoAttr, PasswordAttr, StructureAttr },
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: this.value,
            doGet: null,
        };
    },
    computed: {
        uiType() {
            return this.attr.uiType || this.attr.choices && (this.attr.choices.length <= 2 ? 'radio' : 'select');
        },
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
