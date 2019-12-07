<template>
 <div v-if="opts && (!opts.readOnly || validValue || opts.uiHidden === false)" class="genericAttr">

  <DateAttr v-model="val" :name="name" v-if="uiType === 'date'"
    :ldap_value="ldap_value"
    :opts="opts" :submitted="submitted">
  </DateAttr>

  <DateThreeInputsAttr v-model="val" v-else-if="uiType === 'dateThreeInputs'"
    :opts="opts" :submitted="submitted">
  </DateThreeInputsAttr>

  <ArrayAttr v-model="val" :name="name" v-else-if="uiType === 'array'"
    :ldap_value="ldap_value"
    :stepName="stepName"
    :opts="opts" :submitted="submitted">
  </ArrayAttr>

  <AddressAttr v-model="val" v-else-if="uiType === 'postalAddress'"
    :ldap_value="ldap_value"
    :opts="opts" :submitted="submitted">
  </AddressAttr>

  <cameraSnapshotAttr v-model="val" v-else-if="uiType === 'cameraSnapshot'"
     :opts="opts" :submitted="submitted">
  </cameraSnapshotAttr>

  <PhotoUploadAttr v-model="val" :name="name" v-else-if="uiType === 'photoUpload'"
     :opts="opts" :submitted="submitted">
  </PhotoUploadAttr>

  <PasswordAttr v-model="val" v-else-if="uiType === 'newPassword'"
     :opts="opts" :submitted="submitted">
  </PasswordAttr>

  <AutocompleteAttr v-model="val" :name="name" :v="v" v-else-if="uiType === 'autocomplete'"
     :stepName="stepName"
     :opts="opts" :submitted="submitted">
  </AutocompleteAttr>

  <my-bootstrap-form-group :name="name" :label="opts.title" :validity="validity" :labels="opts.labels" v-else-if="opts">

    <radio-with-validity :name="name" v-model="val" v-if="uiType === 'radio'"
        :values="choicesMap"
        :disabled="opts.readOnly" :required="!opts.optional" :validity.sync="validity[name]">
    </radio-with-validity>

    <div v-else-if="uiType === 'textarea' && uiOptions.autocomplete && !opts.readOnly">
      <history-textarea-with-validity :name="name" v-model="val"
        :rows="uiOptions.rows" :required="!opts.optional" :validity.sync="validity[name]">
      </history-textarea-with-validity>
      <span v-html="opts.description"></span>
    </div>

    <div v-else-if="uiType === 'textarea'">
      <textarea-with-validity :name="name" v-model="val"
        class="form-control"
        :disabled="opts.readOnly" :required="!opts.optional" :validity.sync="validity[name]">
      </textarea-with-validity>
      <span v-html="opts.description"></span>
    </div>

    <div v-else-if="uiType === 'select'">
        <!-- wait until oneOf is computed. <select-with-validity> can NOT handle "value" is in computed "oneOf" -->
      <select-with-validity :name="name" v-model="val" v-if="oneOf"
        :disabled="opts.readOnly"
        :choices="oneOf" :required="!opts.optional" :validity.sync="validity[name]">
      </select-with-validity>
    </div>

    <div class="checkbox" v-else-if="uiType === 'checkbox'">
      <label>
        <checkbox-with-validity :name="name" v-model="val"
            :disabled="opts.readOnly"
            :required="!opts.optional" :validity.sync="validity[name]">
        </checkbox-with-validity>
        <span v-html="opts.description"></span>
      </label>
    </div>
    
   <div :class="{ 'input-group': allow_remove }" v-else>
    <input-with-validity :name="name" v-model="val" 
        :disabled="opts.readOnly"
        :placeholder="opts.uiPlaceholder"
        :type="type" :realType="realType" :required="!opts.optional" :pattern="opts.pattern" :allowedChars="opts.allowedChars" :validator="opts.validator"
        :title="opts.labels && opts.labels.tooltip" :validity.sync="validity[name]">
    </input-with-validity>
    <span v-html="opts.description"></span>

    <span class="input-group-btn" v-if="allow_remove">
        <button class="btn btn-danger" type="button" @click="$emit('remove', name)" aria-label="Supprimer la valeur">
            <i class="glyphicon glyphicon-remove"></i>
        </button>
    </span>
   </div>

    <CurrentLdapValue v-model="initial_value" :ldap_value="ldap_value" @input="v => val = v"></CurrentLdapValue>

  </my-bootstrap-form-group>
 </div>
</template>

<script lang="ts">
import Vue from "vue";
import { includes, find, keyBy, mapValues } from 'lodash';
import { isDateInputSupported } from '../services/helpers';
import * as Ws from '../services/ws';

import DateAttr from './DateAttr.vue';
import DateThreeInputsAttr from './DateThreeInputsAttr.vue';
import AddressAttr from './AddressAttr.vue';
import ArrayAttr from './ArrayAttr.vue';
import cameraSnapshotAttr from './cameraSnapshotAttr.vue';
import PasswordAttr from './PasswordAttr.vue';
import AutocompleteAttr from './AutocompleteAttr.vue';
import CurrentLdapValue from './CurrentLdapValue.vue';

export default Vue.extend({
    props: ['value', 'real_name', 'name', 'opts', 'submitted', 'v', 'ldap_value', 'stepName', 'allow_remove'],
    components: { 
        DateAttr, DateThreeInputsAttr, ArrayAttr, AddressAttr, cameraSnapshotAttr, PasswordAttr, AutocompleteAttr, CurrentLdapValue,
        PhotoUploadAttr: () => import('./PhotoUploadAttr.vue'),
    },
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: this.value,
            initial_value: this.value,
        };
    },
    computed: {
        uiType() {
            if (this.opts.uiType === 'date' && !isDateInputSupported()) {
                return 'dateThreeInputs';
            }
            return this.opts.uiType || 
                this.opts.oneOf && (this.opts.oneOf.length <= 2 ? 'radio' : 'select') ||
                this.opts.items && 'array' ||
                this.opts.oneOf_async && 'autocomplete';
        },
        uiOptions() {
            return this.opts.uiOptions || {};
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
            return this.opts.oneOf && mapValues(keyBy(this.opts.oneOf, 'const'), choice => choice['title']);
        },
        validValue() {
            return this.uiType === 'select' ? this.oneOf && find(this.oneOf, choice => choice.const === this.value) : this.val;
        },
    },
    asyncComputed: {
        async oneOf() {
            const opts = this.opts || {};
            if (opts.oneOf) {
                return opts.oneOf;
            } else if (opts.oneOf_async && this.uiType === 'select') {
                return await Ws.search(this.stepName, this.real_name || this.name, '');
            } else {
                return undefined;
            }
        },
    },
    watch: {
        value(val) {
            this.val = val;
        },
        val(val) {
            if (this.opts.normalize) {
                const val_ = this.opts.normalize(val);
                if (val_ !== val) { this.val = val = val_ }
            }
            this.$emit('input', val);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
});
</script>
