<template>
  <my-bootstrap-form-group name="jpegPhoto" :label="label.jpegPhoto" v-if="attrs.jpegPhoto" :validity="validity">
      <!-- for validation: -->
      <input-with-validity name="jpegPhoto" v-model="v.jpegPhoto" type="text" style="display: none" required :validity.sync="validity.jpegPhoto"></input-with-validity>

      <div v-if="v.jpegPhoto">
          <img :src="v.jpegPhoto">
          <a href="#" @click.prevent="v.jpegPhoto = ''" v-if="!attrs.jpegPhoto.readonly">
              Changer la photo
          </a>
      </div>
      <div v-else-if="attrs.jpegPhoto.readonly">
          aucune
      </div>
      <div v-else>
          <webcam-live-portrait width="240" height="300" :doget="doGet" @image="v.jpegPhoto = $event"></webcam-live-portrait>
          <a href="#" @click.prevent="doGet = [0]">Prendre une photo</a>
      </div>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";
import MixinAttrs from './MixinAttrs.vue';

export default Vue.extend({
    mixins: [MixinAttrs],
    data() {
        return {
            doGet: null,
        };
    },
});
</script>
