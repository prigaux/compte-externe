import Vue from "vue";

import genericAttr from './genericAttr.vue';
import BarcodeAttrs from './BarcodeAttrs.vue';

import template from '!raw-loader!./attrsForm.html';


export default Vue.extend({
    props: ['v', 'v_ldap', 'attrs', 'step_labels'],
    data() {
        return {
            submitted: false,
        };
    },
    template,
    components: { genericAttr, BarcodeAttrs },

    methods: {
      submit(event) {
          console.log("submit");
          this.submitted = true;
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

