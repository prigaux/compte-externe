<template>
  <my-bootstrap-form-group name="structure" :label="label" :validity="validity">
    <div v-if="opts.readonly && val">
      {{val.description}}
    </div>
    <div v-else>
      <typeahead name="structure" v-model="val" :options="structures_search" :minChars="3" :formatting="function (e) { return e && e.description }"
            :required="!opts.optional"
            :editable="false" :validity.sync="validity.structure"></typeahead>
    </div>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import * as Ws from '../services/ws';

export default Vue.extend({
    props: ['value', 'label', 'opts', 'submitted'],
    data() {
        return {
          validity: { structure: {}, submitted: false },
          val: undefined,
        };
    },
    asyncComputed: {
        valueS() {
            return this.value && Ws.structure_get(this.value);
        },
    },
    watch: {
        valueS(val) {
            this.val = val;
        },
        val(val) {
            if (val) this.$emit('input', val.key);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    methods: {
        structures_search: Ws.structures_search,
    },
});
</script>
