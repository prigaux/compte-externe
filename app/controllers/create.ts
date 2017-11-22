import Vue from 'vue';
import { router } from '../router';
import { AttrsForm_mixin } from '../services/attrsForm';
import template from '../templates/create.html';


export const Create = Vue.extend({
  template,
  props: ['kind'],
  data() {
      return { 
        homonymes: undefined,
      };
  },

  computed: {
    kind_() { return this.kind === 'cas' ? 'federation' : this.kind },
    id() { return 'new/' + this.kind_; },
    expectedStep() { return this.kind_ },
  },

  mixins: [AttrsForm_mixin],  

  methods: {
      nextStep(resp) {
          console.log("nextStep");
        if (resp.step === 'validate_email') {
            router.push('/awaiting-email-validation');
        } else if (resp.login && !resp.step) {
            router.push('/auto-created/' + resp.login);
        } else if (resp.login) {
            router.push('/awaiting-moderation/' + resp.login);
        } else {
            // TODO need to pass by SP shib
            //$location.path('/location');
            router.push('/');
        }
    }
  },
});
