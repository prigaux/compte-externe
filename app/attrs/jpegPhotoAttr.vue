<template>
  <my-bootstrap-form-group name="jpegPhoto" :label="label" :validity="validity" v-if="!attrs.readonly || val">
      <!-- for validation: -->
      <input-with-validity name="jpegPhoto" :value="val" type="text" style="display: none" required :validity.sync="validity.jpegPhoto"></input-with-validity>

      <div v-if="val">
          <img :src="val">
          <button class="btn btn-default" @click.prevent="val = ''" v-if="!attrs.readonly">
              Changer la photo
          </button>
      </div>
      <div v-else-if="attrs.readonly">
          aucune
      </div>
      <div v-else>
          <webcam-live-portrait width="240" height="300" :doget="doGet" @image="val = $event" style="vertical-align: middle"></webcam-live-portrait>
          <button class="btn btn-default" @click.prevent="doGet = [0]">Prendre une photo</button>
      </div>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    props: ['value', 'label', 'attrs', 'submitted'],
    data() {
        return {
            validity: { jpegPhoto: {}, submitted: false },
            val: this.value,
            doGet: null,
        };
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
