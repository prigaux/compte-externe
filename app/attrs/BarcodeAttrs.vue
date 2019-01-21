<template>
<fieldset>
  <my-bootstrap-form-group name="cardChoice" :label="attr_labels.cardChoice" v-if="attrs.barcode">
    <label class="radio-inline" v-for="(descr, val) in cardChoices">
       <input type="radio" :name="cardChoice" :value="val" v-model="cardChoice" required>
       {{descr}}
    </label>
  </my-bootstrap-form-group>
 
  <transition name="fade">
  <div v-if="cardChoice === 'enroll'">
   <my-bootstrap-form-group name="barcode" :label="attr_labels.barcode" :validity="validity" v-if="attrs.barcode">
     <input-with-validity name="barcode" v-model="v.barcode" type="number" v-auto-focus required :validity.sync="validity.barcode"></input-with-validity>
   </my-bootstrap-form-group>

   <my-bootstrap-form-group name="mifare" :label="attr_labels.mifare" :validity="validity" v-if="attrs.mifare">
     <input-with-validity type="text" name="mifare" :pattern="attrs.mifare.pattern" v-model="v.mifare" required :validity.sync="validity.mifare"></input-with-validity>
     <span v-if="v.mifare && v.mifare.length === 8">Cette carte n'est pas supportée. Il faut créer une nouvelle carte</span>
   </my-bootstrap-form-group>
  </div>
  </transition>
</fieldset>
</template>

<script lang="ts">
import Vue from "vue";
import MixinAttrs from './MixinAttrs.vue';

export default Vue.extend({
    mixins: [MixinAttrs],
    data() {
        return { cardChoice: undefined };
    },
    mounted() {
        this.cardChoice = this.defaultCardChoice;
    },
    watch: {
        allow_unchanged(allow) {
            if (allow) {
                // homonyme merge can allow_unchanged when it was not before, so use it by default
                this.cardChoice = this.defaultCardChoice;
            }
        },
        cardChoice(choice) {
            switch (choice) {
                case "print":
                case "enroll":
                    this.v.barcode = "";
                    this.v.mifare = "";
                    break;
                case "unchanged":
                    this.v.barcode = this.v.global_barcode;
                    this.v.mifare = this.v.global_mifare;
                    break;                
            }
        },
    },
    computed: {
      allow_unchanged() {
        return this.v && this.v.global_mifare;
      },
      defaultCardChoice() {
        return this.allow_unchanged ? "unchanged" : "print";
      },
      cardChoices() { 
        return {
            print: 'Créer une nouvelle carte', 
            enroll: 'Enroller une carte existante', 
            ...this.allow_unchanged && { unchanged: 'Pas de modification de carte' },
        };
      },
    },
});
</script>
