<template>
  <my-bootstrap-form-group :name="name" :opts="opts" :no_html_label="true" :validity="validity" v-if="!opts.readOnly || val" class="FileUploadAttr">

    <span v-if="val">
        <img style="max-width: 400px; max-height: 400px" :src="val" v-if="is_image">
        <iframe style="max-width: 400px; max-height: 400px" :src="val" v-else></iframe>
        <button class="btn btn-default" style="vertical-align: top; margin-left: 1rem" @click.prevent="window_open">
          <span class="glyphicon glyphicon-zoom-in"></span>
            Voir en grand</button>
    </span>

    <span style="display: inline-block" v-if="!opts.readOnly">

       <div v-if="error" class="alert alert-danger" role="alert">Le type de fichier {{error.mimeType}} est interdit.</div>
       <div v-if="is_image">Ci-contre, votre document en prévisualisation.<p></p></div>
       <div v-else-if="val">Votre fichier de type {{mimeType}} est accepté.<p></p></div>
       

      <!-- for validation: -->
      <input-with-validity :name="name" :value="val" type="text" style="display: none" :required="!opts.optional" :validity.sync="validity[name]"></input-with-validity>

      <label class="btn btn-default">
          {{val || error ? 'Choisir un autre fichier' : 'Choisir un fichier'}}
          <input-file style="display: none;" :accept="acceptedMimeTypes.join(', ')" @change="onFileUploaded"></input-file>
      </label>

      <p><div v-html="opts.description"></div></p>
    </span>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";
import * as Helpers from '../services/helpers';

const default_acceptedMimeTypes = [ 'image/png', 'image/jpeg', 'application/pdf' ]

const dataURL_to_mimeType = (val: string) => (
    val?.match(/^data:(\w{1,30}\/\w{1,30})/)?.[1]
)

export default Vue.extend({
    props: ['value', 'name', 'opts'],
    data() {
        return {
            validity: { [this.name]: {} },
            val: this.value,
            error: undefined,
        };
    },
    computed: {
       acceptedMimeTypes() {
           return this.opts.acceptedMimeTypes || default_acceptedMimeTypes
       },
       mimeType() {
            return dataURL_to_mimeType(this.val)
       },
       is_image() {
           return this.mimeType?.match(/^image\//)
       },
    },
    watch: {
        value(val) {
            this.val = val;
        },
        val(val) {
            this.$emit('input', val);
        },
    },
    methods: {
        async onFileUploaded(file) {
            const val = await Helpers.fileReader('readAsDataURL', file) as string
            const mimeType = dataURL_to_mimeType(val)
            if (!this.acceptedMimeTypes.includes(mimeType)) {
                this.val = ''
                this.error = { mimeType }
            } else {
                this.val = val
                this.error = undefined
            }
        },
        window_open() {
            window.open(this.val)
        }
    },
});
</script>

