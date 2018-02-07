import Vue from "vue";
import conf from '../conf';

import PasswordAttr from './PasswordAttr.vue';
import BarcodeAttrs from './BarcodeAttrs.vue';
import DateAttr from './DateAttr.vue';
import AddressAttr from './AddressAttr.vue';
import jpegPhotoAttr from './jpegPhotoAttr.vue';
import StructureAttr from './StructureAttr.vue';

import template from './attrsForm.html';


const accentsRange = '\u00C0-\u00FC';

export default Vue.extend({
    props: ['v', 'v_orig', 'attrs', 'step_labels'],
    data() {
        return {
            validity: { submitted: false, supannCivilite: {}, givenName: {}, sn: {}, birthName: {}, homePhone: {}, supannMailPerso: {}, structureParrain: {}, duration: {}, profilename: {} },
        };
    },
    template,
    components: { DateAttr, AddressAttr, jpegPhotoAttr, StructureAttr, BarcodeAttrs, PasswordAttr },

    computed: {
        label() {
            return conf.attr_labels;
        },
        submitted() {
            return this.validity.submitted;
        },
        allowedCharsInNames() {
            return "[A-Za-z" + accentsRange + "'. -]";
        },
        currentYear() {
            return new Date().getUTCFullYear();
        },
    },

    methods: {
      submit(event) {
          console.log("submit");
          this.validity.submitted = true;
          if (!event.target.checkValidity()) return;
          this.$emit('submit', this.v);
      },
      reject() {
          this.$emit('reject', this.v);
      }
    },
});

