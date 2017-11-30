import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import { V, StepAttrsOption } from '../services/ws';

function AttrsForm_data() {
    return {
      label: conf.attr_labels,
      step: undefined,
      attrs: <StepAttrsOption> undefined,
      v: <V> undefined,
      v_orig: <V> undefined,
      errorMessages: {},
      submitted: false,
    };    
}

export const AttrsForm_mixin = Vue.extend({

    mounted() {
        Ws.getInScope(this, this.id, this.$route.query, this.expectedStep).then(() => {
            if (this.v.noInteraction) this.send();
        });
    },

    data: AttrsForm_data,

    computed: {
        // for reuse steps:
        isMember() { 
            let aff = this.v.eduPersonAffiliation;
            return aff && aff.indexOf('member') >= 0;
        },
        anneeInscription() {
            let annees = this.v.supannEtuAnneeInscription;
            return annees && Math.max(...annees);
        },
    },

    methods: {
      submit(event) {
          console.log("submit");
          this.submitted = true;
          if (!event.target.checkValidity()) return;
          this.send();
      },
      send() {
          Ws.set(this.id, this.v).then(resp => {
              if (resp.error === "no_moderators") {
                  alert(conf.error_msg.noModerators(this.v.structureParrainS.name));
                  this.v.structureParrainS = undefined;
              } else {
                return this.nextStep(resp);
              }
          });
      },
      merge(homonyme) {
          // especially for "uid" attr, but also "mifare", "barcode"
          Helpers.eachObject(homonyme, (attr, val) => {
            if (attr === "score") return;
            if (val && !this.v[attr]) { 
                console.log("adding " + attr + " = " + val); 
                this.v[attr] = val;
                this.v_orig[attr] = val;
            }
          });
          this.v_orig = Helpers.copy(this.v_orig); // make it clear for Vuejs that v_orig has been updated
        },
      reject() {
        Ws.remove(this.id).then(this.nextStep);
      }
    },
});

