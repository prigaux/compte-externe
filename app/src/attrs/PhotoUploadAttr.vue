<template>
  <my-bootstrap-form-group :name="name" :label="opts.title" :validity="validity" v-if="!opts.readOnly || val">

    <span class="photoShow" v-if="val">
        <img :src="val" class="photoBorder">
    </span>

    <span style="display: inline-block" v-if="!opts.readOnly">

      <!-- for validation: -->
      <input-with-validity :name="name" :value="val" type="text" style="display: none" :required="!opts.optional" :validity.sync="validity.jpegPhoto"></input-with-validity>

      <span v-if="toValidate" class="photoModify">
        <div class="photoBorder">
            <MyCroppie ref="croppie" :data="toValidate" :options="croppie_options" @error='onInvalidPhoto'></MyCroppie>
        </div>
        <nav class="navbar navbar-inverse photoModifyButtons">
            <ul class="nav navbar-nav">
                <li><button type="button" @click="$refs.croppie.rotate(90)" title="Rotation droite">↺</button></li>
                <li><button type="button" @click="$refs.croppie.rotate(-90)" title="Rotation gauche">↻</button></li>
                <li><button type="button" @click="croppieValidate()" title="Valider la photo"><span class="glyphicon glyphicon-ok"></span></button></li>
            </ul>
        </nav>            
      </span>

      <span class="withPhoto" v-else-if="val">
        <button type="button" class="btn btn-default" @click="photoToValidate(val)">
          <span class="glyphicon glyphicon-edit"></span>
            Modifier la photo
        </button>
        <br>
      </span>

      <div class="alert alert-danger" v-if="error">
            Votre photo pose problème, veuillez vérifier son format et/ou son contenu.
            <small v-if="error.mimeType"><br>Le format « {{error.mimeType}} » n'est pas une image ou n'est pas géré par votre navigateur.</small>
      </div>

      <label class="btn btn-default">
          <span class="glyphicon glyphicon-camera"></span>
          {{val || toValidate ? 'Choisir une autre photo' : 'Choisir une photo'}}
          <input-file style="display: none;" accept="image/*" @change="onPhotoUploaded"></input-file>
      </label>

    </span>
    <div v-html="opts.description"></div>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";
import MyCroppie from '../directives/MyCroppie';
import * as Helpers from '../services/helpers';


export default Vue.extend({
    components: { MyCroppie },
    props: ['value', 'name', 'opts', 'submitted'],
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: this.value,
            toValidate: null,
            error: null,
            withCroppie: false,
        };
    },
    computed: {
       croppie_options() {
           return {
                init: {
                    viewport: { width: 200, height: 242 },
                },
                export: {
                    type: 'base64',
                    format: 'jpeg',
                    size: { width: 283, height: 343 },
                },
            };
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
    mounted() {
    },
    methods: {
        onInvalidPhoto() {
            const m = this.toValidate.match(/^data:(.*?);/);
            this.error = { mimeType: m && m[1] };
            this.toValidate = null;
        },
        photoToValidate(val) {
            this.toValidate = val;
            this.prevVal = this.val; // for cancel            
            this.val = null;
            this.error = false;
        },
        async onPhotoUploaded(file) {
            this.photoToValidate(await Helpers.fileReader('readAsDataURL', file));
        },
        async croppieValidate() {
            this.val = await this.$refs.croppie.get(); 
            this.toValidate = null;
        },
    },
});
</script>

<style scoped>
.photoModifyButtons {
    margin-top: 3em;
    min-height: 0px;
    border-radius: 4px;
}
.photoModifyButtons button {
    font-size: 17px;
    font-weight: bold;
    color: white !important;
    background: transparent;
    border: 0;
    padding: 0 25px;
}
.photoModifyButtons .glyphicon {
    font-size: 13px;
}
.photoBorder{
    border: 1px solid #eee;
}
.photoShow {
    display: inline-block;
    margin-right: 2rem;
}
.photoShow .photoBorder {
    width: 100px;
    height: 123px;
}
.photoModify {
    width: 200px;
    display: inline-block;
    margin-right: 2rem;
}
.photoModify .photoBorder {
    height: 242px;
}
.withPhoto button {
    margin-bottom: 1rem;
}

</style>

<style>
.photoModify .cr-viewport::after {
    content: "";
    pointer-events: none;
    display: block;
    position: absolute;
    left: 0; right: 0;
    top: 30px; bottom: 20px;
    border: 2px solid white;
    border-radius: 50%;
}
</style>
