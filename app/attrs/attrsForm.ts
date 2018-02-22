import Vue from "vue";
import conf from '../conf';

import genericAttr from './genericAttr.vue';
import BarcodeAttrs from './BarcodeAttrs.vue';

import template from './attrsForm.html';


export default Vue.extend({
    props: ['v', 'v_orig', 'attrs', 'step_labels'],
    data() {
        return {
            validity: { submitted: false, supannCivilite: {}, givenName: {}, sn: {}, birthName: {}, homePhone: {}, telephoneNumber: {}, roomAccess: {}, floorNumber: {}, roomNumber: {}, supannMailPerso: {}, structureParrain: {}, duration_or_enddate: {}, duration: {}, enddate: {}, profilename: {} },
        };
    },
    template,
    components: { genericAttr, BarcodeAttrs },

    computed: {
        label() {
            return conf.attr_labels;
        },
        submitted() {
            return this.validity.submitted;
        },
    },

    methods: {
      submit(event) {
          console.log("submit");
          this.validity.submitted = true;
          if (!event.target.checkValidity()) return Promise.resolve();
          
          return new Promise((resolve, reject) => {
            this.$emit('submit', this.v, { resolve, reject });
          });
      },
      reject() {
          this.$emit('reject', this.v);
      }
    },
});

