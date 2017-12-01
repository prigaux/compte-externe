import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import { router } from '../router';
import { defaults } from 'lodash';
import { V, StepAttrsOption } from '../services/ws';
import ImportFile from '../import/ImportFile.vue';
import ImportResult from '../import/ImportResult.vue';
import Homonyms from '../controllers/Homonyms.vue';
import template from '../templates/create.html';

function AttrsForm_data() {
    return {
      label: conf.attr_labels,
      step: undefined,
      attrs: <StepAttrsOption> undefined,
      v: <V> undefined,
      v_orig: <V> undefined,
      errorMessages: {},
      submitted: false,

      to_import: undefined,
      imported: <any[]> undefined,
    };    
}

export const AttrsForm = Vue.extend({
    mounted() {
        Ws.getInScope(this, this.id, this.$route.query, this.expectedStep).then(() => {
            if (this.v.noInteraction) this.send();
        });
    },

    template,
    props: [ 'wanted_id', 'initialStep' ],
    data: AttrsForm_data,
    components: { ImportFile, ImportResult, Homonyms },

    computed: {
        id() {
            if (this.initialStep) return "new/" + this.initialStep;
            if (this.wanted_id) return this.wanted_id;
            throw "expected either initialStep or id";
        },
        expectedStep() {
            return this.initialStep || null;
        },
        check_homonyms() {
            return !this.initialStep && this.attrs && this.attrs.uid;
        },
        other_attrs(): StepAttrsOption {
            if (this.to_import && this.attrs) {
                return Helpers.filter(this.attrs, (_, k) => !this.to_import.fields.includes(k));
            } else {
                return this.attrs;
            }
        },
    
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
          if (this.to_import) {
            this.send_new_many();
          } else {
            this.send();
          }
      },
      nextStep(resp) {
        console.log("nextStep");
        if (resp.login && !resp.step) {
            // user created
            if (this.v.supannAliasLogin &&
                this.v.supannAliasLogin !== resp.login) {
                alert("L'utilisateur a été créé, mais avec l'identifiant « " + resp.login + "». Il faut prévenir l'utilisateur");
                this.go_back();
            }
            if (conf.printCardUrl && this.attrs.barcode && !this.v.barcode) {
                document.location.href = conf.printCardUrl(resp.login);
            } else if (this.initialStep) {
                router.push('/auto-created/' + resp.login);
            } else {
                router.push('/moderate');            
            }
        } else if (resp.step === 'validate_email') {
            router.push('/awaiting-email-validation');
        } else if (resp.login) {
            router.push('/awaiting-moderation/' + resp.login);
        } else {
            this.go_back();
        }
      },
      go_back() {
        if (this.initialStep) {
            // TODO: to test
            document.location.href = conf.base_pathname;
        } else {
            router.push('/moderate');            
        }          
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
      send_new_many() {
            this.to_import.lines.forEach(v => defaults(v, this.v));

            return Ws.new_many(this.initialStep, this.to_import.lines).then(resp => {
                this.imported = resp;
                this.imported.forEach((resp, i) => {
                    resp.v = this.to_import.lines[i];
                });
                //this.to_import = undefined;
                console.log(this.imported);
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

