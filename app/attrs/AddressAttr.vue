<template>
<div v-if="opts.readonly">
   <my-bootstrap-form-group name="address_lines" :label="attr_labels.address_lines">
      <textarea rows="5" :value="value" class="form-control" disabled></textarea>
   </my-bootstrap-form-group>
</div>
<div v-else>
  <my-bootstrap-form-group name="country" :label="label" :validity="validity">
     <typeahead name="country" v-model="country" :options="conf.countries" placeholder="Pays" :validity.sync="validity.country" required></typeahead>
  </my-bootstrap-form-group>
    
 <div v-if="country === 'FRANCE'">
  <my-bootstrap-form-group name="address_lines" :label="attr_labels.address_lines" :validity="validity">
    <input-with-validity name="address_lines" v-model="lines" placeholder="Numéro, rue" :validity.sync="validity.address_lines" required></input-with-validity>
  </my-bootstrap-form-group>
  <my-bootstrap-form-group name="address_line2">
    <input-with-validity name="address_line2" v-model="line2" placeholder="complément d'adresse"></input-with-validity>
  </my-bootstrap-form-group>
  <my-bootstrap-form-group name="postalCode" multi="true">
    <div class="col-md-offset-3 col-xs-2" :class="{'has-error': validity.submitted && !validity.postalCode.valid}">
      <div>
        <input-with-validity name="postalCode" v-model="postalCode" real-type="frenchPostalCode" placeholder="Code postal" required :validity.sync="validity.postalCode"></input-with-validity>
        <validation-errors name="postalCode" :validity="validity"></validation-errors>
      </div>
    </div>
    <div class="col-xs-7" :class="{'has-error': validity.submitted && !validity.town.valid}">
      <div>
        <typeahead name="town" v-model="town" :options="towns" placeholder="Ville" :editable="false" :validity.sync="validity.town"></typeahead>
        <validation-errors name="town" :validity="validity"></validation-errors>
      </div>
    </div>
  </my-bootstrap-form-group>
 </div>
 <div v-else>
   <my-bootstrap-form-group name="address_lines" :label="attr_labels.address_lines" :validity="validity">
     <textarea-with-validity rows="5" v-model="lines" class="form-control" required :validity.sync="validity.address_lines"></textarea-with-validity>
   </my-bootstrap-form-group>
 </div>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import * as Helpers from '../services/helpers';
import * as Address from '../services/address';

export default Vue.extend({
    props: ['value', 'label', 'opts', 'submitted'],
    data() {
        return {
            validity: { country: {}, address_lines: {}, postalCode: {}, town: {}, submitted: false },
            ...Address.fromString(this.value),
        };
    },
    watch: {
        value(val) {
            if (val && val !== this.currentValue) Helpers.assign(this, Address.fromString(val));
        },
        currentValue(val) {
            this.$emit('input', val);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
        towns(l) {
            if (l && l.length === 1) {
                this.town = l[0];
            }
        },
    },
    asyncComputed: {
        towns() {
            const code = this.postalCode;
            return code && code.length >= 5 ? Helpers.frenchPostalCodeToTowns(code) : [];
        },
    },
    computed: {
        currentValue() {
            return Address.toString(this);
        },
    },
});
</script>
