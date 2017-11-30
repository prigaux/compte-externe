import Vue from "vue";
import conf from '../conf';
import { AttrsForm_mixin } from '../services/attrsForm';
import * as Ws from '../services/ws';
import { router } from '../router';
import CompareUsers from './CompareUsers.vue';

import template_moderate from '../templates/moderate.html';


export const Moderate_mixin = Vue.extend({
  computed: {
    expectedStep() { return null },
  },

  methods: {
     nextStep(resp) {
        if (resp.login && !resp.step) {
            // user created
            if (this.v.supannAliasLogin &&
                this.v.supannAliasLogin !== resp.login) {
                alert("L'utilisateur a été créé, mais avec l'identifiant « " + resp.login + "». Il faut prévenir l'utilisateur");
            }
            if (conf.printCardUrl && this.attrs.barcode && !this.v.barcode) {
                document.location.href = conf.printCardUrl(resp.login);
                return;
            }
        }
        router.push('/moderate');
    },

  },
});
       

export const Moderate = {
  name: "Moderate",
  template: template_moderate,
  props: ['id'],
  data() {
      return { 
        homonymes: [],
      };
  },

  components: { 'compare-users': CompareUsers },
  mixins: [AttrsForm_mixin, Moderate_mixin],

    mounted() {
        Ws.homonymes(this.id).then(l => {
            this.homonymes = l;
        });
    },
};
