<template>
 <div v-if="opts && (!opts.readOnly || validValue && val || opts.uiHidden === false)" class="genericAttr" :class="'oneAttr-' + name">

  <DateAttr v-model="val" :name="name" v-if="uiType === 'date'"
    :ldap_value="ldap_value"
    :opts="opts">
  </DateAttr>

  <DateThreeInputsAttr v-model="val" v-else-if="uiType === 'dateThreeInputs'"
    :opts="opts">
  </DateThreeInputsAttr>

  <ArrayAttr v-model="val" :name="name" v-else-if="uiType === 'array'"
    :ldap_value="ldap_value"
    :stepName="stepName"
    :opts="opts">
  </ArrayAttr>

  <AddressAttr v-model="val" v-else-if="uiType === 'postalAddress'"
    :ldap_value="ldap_value"
    :opts="opts">
  </AddressAttr>

  <cameraSnapshotAttr v-model="val" v-else-if="uiType === 'cameraSnapshot'"
     :opts="opts">
  </cameraSnapshotAttr>

  <PhotoUploadAttr v-model="val" :name="name" v-else-if="uiType === 'photoUpload'"
     :opts="opts">
  </PhotoUploadAttr>

  <PasswordAttr v-model="val" v-else-if="uiType === 'newPassword'"
     :opts="opts">
  </PasswordAttr>

  <AutocompleteAttr v-model="val" :name="name" :real_name="real_name" :v="v" v-else-if="uiType === 'autocomplete'"
     :stepName="stepName"
     :opts="opts">
  </AutocompleteAttr>

  <my-bootstrap-form-group :name="name" 
    :opts="opts"
    :no_html_label="uiType === 'radio' || uiType === 'checkbox'"
    :validity="validity" v-else-if="opts">

    <div v-if="uiType === 'radio'">
      <radio-with-validity :name="name" v-model="val"
          :values="choicesMap"
          :texts_are_html="uiOptions.texts_are_html"
          :disabled="opts.readOnly" :required="!opts.optional" :validity.sync="validity[name]">
      </radio-with-validity>
      <span v-html="opts.description"></span>
    </div>

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
      <span v-html="opts.description"></span>
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
        v-bind="input_attrs"
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
import { includes, find, isNil, keyBy, mapValues } from 'lodash';
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

function add_to_oneOf_if_missing(choices: Ws.StepAttrOptionChoices[], to_have) {
    if (!isNil(to_have) && choices && !choices.some(choice => choice.const === to_have)) {
        choices.push({ const: to_have, title: to_have })
    }
    return choices
}

export default Vue.extend({
    props: ['value', 'real_name', 'name', 'opts', 'v', 'ldap_value', 'stepName', 'allow_remove'],
    components: { 
        DateAttr, DateThreeInputsAttr, ArrayAttr, AddressAttr, cameraSnapshotAttr, PasswordAttr, AutocompleteAttr, CurrentLdapValue,
        PhotoUploadAttr: () => import('./PhotoUploadAttr.vue'),
    },
    data() {
        return {
            validity: { [this.name]: {} },
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
        oneOf() {
            return add_to_oneOf_if_missing(this.oneOf_, this.opts.allowUnchangedValue)
        },
        validValue() {
            return this.uiType === 'select' ? (
                this.oneOf && find(this.oneOf, choice => (
                    // (allow equality if value is number and choice.const is string)
                    choice.const == this.value // tslint:disable-line
                )) 
            ) : this.val;
        },
        input_attrs() {
            return this.type === 'password' ? { autocomplete: 'current_password' } : {}
        }
    },
    asyncComputed: {
        async oneOf_() {
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
    },
});
</script>
