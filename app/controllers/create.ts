import Vue from 'vue';
import { router } from '../router';
import { AttrsForm_mixin } from '../services/attrsForm';
import { StepAttrsOption } from '../services/ws';
import { defaults } from 'lodash';
import * as Ws from '../services/ws';
import * as Helpers from '../services/helpers';
import ImportFile from '../import/ImportFile.vue';
import ImportResult from '../import/ImportResult.vue';
import template from '../templates/create.html';


export const Create = Vue.extend({
  template,
  props: ['kind'],
  data() {
      return { 
        homonymes: undefined,
        to_import: undefined,
        imported: <any[]> undefined,
      };
  },

  computed: {
    kind_() { return this.kind === 'cas' ? 'federation' : this.kind },
    id() { return 'new/' + this.kind_; },
    expectedStep() { return this.kind_ },
    other_attrs(): StepAttrsOption {
        if (this.to_import && this.attrs) {
            return Helpers.filter(this.attrs, (_, k) => !this.to_import.fields.includes(k));
        } else {
            return this.attrs;
        }
    },
  },

  components: { ImportFile, ImportResult },
  mixins: [AttrsForm_mixin],  

  methods: {
      send_new_many() {
            this.to_import.lines.forEach(v => defaults(v, this.v));

            return Ws.new_many(this.kind_, this.to_import.lines).then(resp => {
                this.imported = resp;
                this.imported.forEach((resp, i) => {
                    resp.v = this.to_import.lines[i];
                });
                //this.to_import = undefined;
                console.log(this.imported);
            });          
      },        
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
