<template>
  <my-bootstrap-form-group name="jpegPhoto" :label="opts.title" :validity="validity" v-if="!opts.readOnly || val">
      <!-- for validation: -->
      <input-with-validity name="jpegPhoto" :value="val" type="text" style="display: none" :required="!opts.optional" :validity.sync="validity.jpegPhoto"></input-with-validity>

      <div v-if="val">
          <img :src="val">
          <button type="button" class="btn btn-default" @click="val = ''" v-if="!opts.readOnly">
              Changer la photo
          </button>
      </div>
      <div v-else-if="opts.readOnly">
          aucune
      </div>
      <div v-else>
          <webcam-live-portrait width="240" height="300" :doget="doGet" @image="val = $event" style="vertical-align: middle"></webcam-live-portrait>
          <button type="button" class="btn btn-default" @click="doGet = [0]">Prendre une photo</button>
      </div>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    props: ['value', 'opts'],
    data() {
        return {
            validity: { jpegPhoto: {} },
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
    },
});
</script>
