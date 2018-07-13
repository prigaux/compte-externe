<template>
 <div v-if="opts && (!opts.readonly || val)">

  <DateAttr v-model="val" :name="name" v-if="uiType === 'date'"
    :ldap_value="ldap_value"
    :opts="opts" :submitted="submitted">
  </DateAttr>

  <DateThreeInputsAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'dateThreeInputs'"
    :minYear="opts.minYear" :maxYear="opts.maxYear" :submitted="submitted">
  </DateThreeInputsAttr>

  <AddressAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'postalAddress'"
    :ldap_value="ldap_value"
    :opts="opts" :submitted="submitted">
  </AddressAttr>

  <jpegPhotoAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'photo'"
     :opts="opts" :submitted="submitted">
  </jpegPhotoAttr>

  <StructureAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'structure'"
     :opts="opts" :submitted="submitted">
  </StructureAttr>

  <PasswordAttr v-model="val" :label="attr_labels[name]" v-else-if="uiType === 'password'"
     :submitted="submitted">
  </PasswordAttr>

  <EtablissementAttr v-model="val" :name="name" :v="v" v-else-if="uiType === 'etablissement'"
     :opts="opts" :submitted="submitted">
  </EtablissementAttr>

  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity" :labels="opts.labels" v-else-if="opts">

    <radio-with-validity :name="name" v-model="val" v-if="uiType === 'radio'"
        :values="choicesMap" :required="!opts.optional" :validity.sync="validity[name]">
    </radio-with-validity>

    <select-with-validity :name="name" v-model="val" v-else-if="uiType === 'select'"
        :choices="opts.choices" :required="!opts.optional" :validity.sync="validity[name]">
    </select-with-validity>

    <div class="checkbox" v-else-if="uiType === 'checkbox'">
      <label>
        <checkbox-with-validity :name="name" v-model="val" :validity.sync="validity[name]">
        </checkbox-with-validity>
        <span v-html="conf.attrs_description[name]"></span>
      </label>
    </div>
    
    <input-with-validity :name="name" v-model="val" v-else
        :disabled="opts.readonly"
        :type="type" :realType="realType" :required="!opts.optional" :pattern="opts.pattern" :allowedChars="opts.allowedChars" :title="opts.labels && opts.labels.tooltip" :validity.sync="validity[name]">
    </input-with-validity>

    <CurrentLdapValue :value="initial_value" :ldap_value="ldap_value"></CurrentLdapValue>

  </my-bootstrap-form-group>
 </div>
</template>

<script lang="ts">
import Vue from "vue";
import { includes, keyBy, mapValues } from 'lodash';
import { isDateInputSupported } from '../services/helpers';

import DateAttr from './DateAttr.vue';
import DateThreeInputsAttr from './DateThreeInputsAttr.vue';
import AddressAttr from './AddressAttr.vue';
import jpegPhotoAttr from './jpegPhotoAttr.vue';
import PasswordAttr from './PasswordAttr.vue';
import StructureAttr from './StructureAttr.vue';
import EtablissementAttr from './EtablissementAttr.vue';
import CurrentLdapValue from './CurrentLdapValue.vue';

export default Vue.extend({
    props: ['value', 'name', 'opts', 'submitted', 'v', 'ldap_value'],
    components: { DateAttr, DateThreeInputsAttr, AddressAttr, jpegPhotoAttr, PasswordAttr, StructureAttr, EtablissementAttr, CurrentLdapValue },
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: this.value,
            initial_value: this.value,
            doGet: null,
        };
    },
    computed: {
        uiType() {
            if (this.opts.uiType === 'date' && !isDateInputSupported()) {
                return 'dateThreeInputs';
            }
            return this.opts.uiType || this.opts.choices && (this.opts.choices.length <= 2 ? 'radio' : 'select');
        },
        type() {
            return this.realType || !this.opts.uiType ?
               'text' : 
               this.opts.uiType;
        },
        realType() { 
            return includes(['phone', 'mobilePhone', 'frenchPostalCode', 'siret'], this.opts.uiType) ? this.opts.uiType : undefined;
        },
        choicesMap() {
            return this.opts.choices && mapValues(keyBy(this.opts.choices, 'key'), choice => choice['name']);
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
