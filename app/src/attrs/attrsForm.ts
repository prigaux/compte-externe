import Vue from "vue";

import { pickBy, findKey } from 'lodash';
import genericAttr from './genericAttr.vue';
import BarcodeAttrs from './BarcodeAttrs.vue';

import template from '!raw-loader!./attrsForm.html';


export default Vue.extend({
    props: ['v', 'v_ldap', 'attrs', 'step_labels', 'stepName', 'onelineForm'],
    data() {
        return {
            selectedTab: undefined,
            submitted: false,
        };
    },
    template,
    components: { genericAttr, BarcodeAttrs },

    computed: {
        selectedTab_() {
            return this.selectedTab || findKey(this.tabs, (_opts, name) => this.v[name]) || Object.keys(this.tabs)[0];
        },
        tabs() {
            return this.attrs ? pickBy(this.attrs, opts => opts.properties) : {};
        },
    },
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

