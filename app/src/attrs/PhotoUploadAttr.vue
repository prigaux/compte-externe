<template>
  <my-bootstrap-form-group :name="name" :label="opts.title" no_html_label="true" :validity="validity" v-if="!opts.readOnly || val" class="PhotoUploadAttr">

    <span class="photoShow" v-if="val">
        <img :src="val" class="photoBorder" alt="" :style="non_edit_size">
    </span>

    <span style="display: inline-block" v-if="!opts.readOnly">

      <!-- for validation: -->
      <input-with-validity :name="name" :value="val" type="text" style="display: none" :required="!opts.optional" :validity.sync="validity.jpegPhoto"></input-with-validity>

      <span v-if="toValidate" class="photoModify">
        <div class="photoBorder">
            <MyCroppie ref="croppie" :data="toValidate" :options="croppie_options" @error='onInvalidPhoto'></MyCroppie>
        </div>
        <nav class="photoModifyButtons">
            <ul class="nav">
                <li><button type="button" @click="$refs.croppie.rotate(90)" title="Rotation droite">↺</button></li>
                <li><button type="button" @click="$refs.croppie.rotate(-90)" title="Rotation gauche">↻</button></li>
                <li><button type="button" @click="croppieValidate()" title="Valider la photo" class="submit"><span class="glyphicon glyphicon-ok"></span></button></li>
            </ul>
        </nav>            
      </span>

      <span class="withPhoto" v-else-if="val">
        <button type="button" class="btn btn-default" @click="photoToValidate()" aria-label="Modifier la photo">
          <span class="glyphicon glyphicon-pencil"></span>
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

      <p><div v-html="opts.description"></div></p>
    </span>
  </my-bootstrap-form-group> 
</template>

<script lang="ts">
import Vue from "vue";
import MyCroppie from '../directives/MyCroppie';
import * as Helpers from '../services/helpers';


const _size = (width, ratio) => ({ width, height: width / ratio })
const _size_px = ({ width, height }) => ({ width: `${width}px`, height: `${height}px` })

export default Vue.extend({
    components: { MyCroppie },
    props: ['value', 'name', 'opts'],
    data() {
        return {
            validity: { [this.name]: {} },
            val: this.value,
            toValidate: null,
            error: null,
            withCroppie: false,
        };
    },
    computed: {
       ratio() {
           return this.opts.ratio || 4/5;
       },
       non_edit_size() {
           return _size_px(_size(100, this.ratio))
       },
       croppie_options() {
           return {
                init: {
                    viewport: _size(200, this.ratio),
                },
                export: {
                    type: 'base64',
                    format: 'jpeg',
                    size: _size(this.opts.width || 284, this.ratio),
                    quality: this.opts.photo_quality || 0.8,
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
    },
    mounted() {
    },
    methods: {
        onInvalidPhoto() {
            const m = this.toValidate.match(/^data:(.*?);/);
            this.error = { mimeType: m && m[1] };
            this.toValidate = null;
            // give up on this uploaded value
            this.val_before_croppie = this.prev_val_before_croppie;
        },
        photoToValidate() {
            if (!this.val_before_croppie) this.val_before_croppie = this.val;
            this.toValidate = this.val_before_croppie;
            this.prevVal = this.val; // for cancel            
            this.val = null;
            this.error = false;
        },
        async onPhotoUploaded(file) {
            this.prev_val_before_croppie = this.val_before_croppie || this.val
            this.val_before_croppie = await Helpers.fileReader('readAsDataURL', file)
            this.photoToValidate();
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
    background: black;
    margin-top: 3em;
    min-height: 0px;
    border-radius: 4px;
}
.photoModifyButtons ul {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
}
.photoModifyButtons button {
    font-size: 21px;
    font-weight: bold;
    color: white !important;
    border: 0;
    display: block;
    height: 34px;
    width: 34px;
    background: linear-gradient(#666, #444);
    border-radius : 50%
}
.photoModifyButtons button:hover {
    filter: brightness(1.25);
}
.photoModifyButtons button.submit {
    background: linear-gradient(#61E061, #298529);
}
.photoModifyButtons .glyphicon {
    font-size: 75%;
}
.photoBorder{
    border: 1px solid #eee;
}
.photoShow {
    display: inline-block;
    margin-right: 2rem;
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
.photoModify .cr-slider-wrap {
    width: 100%;
    margin: 2px auto;

    background: linear-gradient(#f5c95c, #c89108);
    padding: 0px 9px;
    border-radius: 14px;
    border-bottom:#777 1px solid;
}

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
.PhotoUploadAttr .on-the-right {
    display: flex;
}
</style>
