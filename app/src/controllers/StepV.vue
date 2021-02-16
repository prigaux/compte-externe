<template>
<div class="normalContent">
 <div v-if="resp && resp.component" class="response">
    <component :is="resp.component" :resp="resp" :v_pre="v_pre" :v="v"></component>
 </div>
 <div v-else-if="v">
  <h2 style="margin-top: 2em" v-html="step.labels.title" v-if="step.labels.title"></h2>

  <div v-if="step_description">
    <component :is="step_description" :v_pre="v_pre" :v="v"></component>
  </div>

  <div v-if="imported">
    <ImportResult :imported="imported" :ordered_fields="to_import.fields" @done="imported = to_import = undefined"></ImportResult>
  </div>

  <div v-else>

   <div v-if="check_homonyms && !all_potential_homonyms">
       Recherche des homonymes, veuillez patienter...
   </div>
   <div v-else-if="check_homonyms && potential_homonyms.length">
      <Homonyms :v="v" :l="potential_homonyms" @merge="merge">
      </Homonyms>
   </div>
   <div v-else>

    <div v-if="allow_check_homonyms && v.global_main_profile">
        <p style="height: 2em"></p>
            <div class="alert alert-danger" >
                Le compte sera fusionné avec le compte existant {{v.uid}}.
                <p/>
                {{v.givenName}} {{v.sn}} <span v-html="v.global_main_profile.description"></span>
            </div>
    </div>

    <div v-if="step.allow_many">
        <ImportFile :attrs="attrs" @change="val => to_import = val"></ImportFile>
    </div>
             
    <MyModalP ref="MyModalP"></MyModalP>

    <attrsForm
        :class="{ display_fieldIsRequired_hint: display_fieldIsRequired_hint }"
        :v="v" :v_ldap="v_ldap" :attrs="other_attrs" :step_labels="step.labels" :stepName="stepName"
        :disableOkButton="disableOkButton"
        :onelineForm="onelineForm"
        @submit="submit" @reject="reject"></attrsForm>

    <div class="display_fieldIsRequired_hint" v-if="display_fieldIsRequired_hint">
        <hr style="margin-top: 4rem">
        <p><span class="required_field"></span> Champs obligatoires</p>
    </div>

    <div v-if="step_post_scriptum">
        <hr style="margin-top: 2rem">
        <component :is="step_post_scriptum" :v_pre="v_pre" :v="v"/>
    </div>

   </div> <!-- !homonyms -->
  </div> <!-- imported -->
 </div> <!-- v -->
</div>
</template>

<script lang="ts">
import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import { router } from '../router';
import { defaults, isEqual, unionBy, isEmpty } from 'lodash';
import { StepAttrsOption } from '../services/ws';
import { compute_mppp_and_handle_default_values, filterAttrs } from '../../../shared/mppp_and_defaults';

import ImportFile from '../import/ImportFile.vue';
import ImportResult from '../import/ImportResult.vue';
import Homonyms from '../controllers/Homonyms.vue';
import attrsForm from '../attrs/attrsForm';
import MyModalP from './MyModalP.vue';


function AttrsForm_data() {
    return {
      resp: undefined,
      to_import: undefined,
      imported: <any[]> undefined,
      all_potential_homonyms: undefined,
    };    
}

export let v_from_prevStep = {};

export default Vue.extend({
    mounted() {
        this.init();
    },
    props: [
        'wanted_id', 'stepName', 
        'id', 'v_pre',
        'step', 'attrs', 'all_attrs_flat', 'v', 'v_orig', 'v_ldap',
        'onelineForm',
    ],
    data: AttrsForm_data,
    components: { ImportFile, ImportResult, Homonyms, attrsForm, MyModalP },

    computed: {
        initialStep() {
            return !this.wanted_id && this.stepName;
        },
        allow_check_homonyms() {
            return this.attrs_?.uid?.uiType === 'homonym';
        },
        check_homonyms() {
            return this.allow_check_homonyms && !this.v.uid;
        },
        noInteraction() {
            return this.v.noInteraction || this.step?.labels?.okButton && Object.keys(this.attrs_).length === 0;
        },
        attrs_() {
            return this.attrs && Helpers.filter(this.attrs, (opts) => !opts.uiHidden);
        },
        display_fieldIsRequired_hint() {
            if (!this.attrs) return false;
            const nb_optional = Object.keys(Helpers.filter(this.all_attrs_flat, (opts) => !opts.readOnly && opts.optional)).length
            const nb_required = Object.keys(Helpers.filter(this.all_attrs_flat, (opts) => !opts.readOnly && !opts.optional)).length
            return conf.may_display_fieldIsRequired_hint && nb_required && nb_optional
        },

        other_attrs(): StepAttrsOption {
            let { attrs, current_defaults } = compute_mppp_and_handle_default_values(this.attrs, this.prev_defaults, this.v);
            this.prev_defaults = current_defaults;

            // no need to go through chosen oneOf, since "compute_mppp_and_handle_default_values" has already merged things
            attrs = filterAttrs(attrs, 'never', (opts, k) => (
                !opts.uiHidden &&
                !(this.to_import && this.to_import.fields.includes(k)) &&
                !(this.$route.query && (k in this.$route.query)) // do not display things that have been forced in the url
            ));
            return attrs;
        },
        step_description() {
            const text = this.step?.labels?.description;
            return text && Vue.extend({ props: ['v_pre', 'v'], template: "<div>" + text + "</div>" });
        },
        step_post_scriptum() {
            const text = this.step?.labels?.post_scriptum;
            return text && Vue.extend({ props: ['v_pre', 'v'], template: "<div>" + text + "</div>" });
        },
        disableOkButton() {
            return this?.step?.if_no_modification === 'disable-okButton' && isEqual(this.v, this.v_orig)
        },
        potential_homonyms() {
            return (this.all_potential_homonyms || []).filter(h => !h.ignore);
        },
    },

    methods: {
        init() {
            if (this.noInteraction) this.send();
            this.may_update_potential_homonyms({});
        },
        async may_update_potential_homonyms(v, v_orig = null) {
            if (this.check_homonyms && !isEqual(v, v_orig)) {
                await this.update_potential_homonyms(v);
            }
        },
        async update_potential_homonyms(v) {
            const l = await Ws.homonymes(this.id, v, this.all_attrs_flat);
            l.forEach(h => h.ignore = false);
            this.all_potential_homonyms = unionBy(this.all_potential_homonyms || [], l, 'uid');
        },
        async submit_() {
            await this.may_update_potential_homonyms(this.v, this.v_orig);
            if (this.check_homonyms && this.potential_homonyms.length) {
                // we cannot submit, we must display the new potential homonyms
            } else {
                await (this.to_import ? this.send_new_many() : this.send());
            }
        },
      submit(v, deferred) {
          // NB: must resolves "deferred" which blocks submitting until promise is finished
          this.v = v;
          let p = this.submit_();
          Helpers.promise_defer_pipe(p, deferred)
      },
      nextStep(resp) {
        console.log("nextStep", resp);
        if (resp.forceBrowserExit) {
            Helpers.createCookie('forceBrowserExit', 'true', 0);
        }
        if (resp.nextBrowserStep) {
            this.nextBrowserStep(resp);
            return;
        }
        const template = resp.labels && resp.labels.added || this.step && this.step.labels && this.step.labels.accepted;
        if (template) {
            this.templated_response(resp, "<div>" + template + "</div>");
            return;
        }
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
        this.go_back();
      },
      nextBrowserStep(resp) {
        // passwords must NOT be passed as query, pass them in javascript memory
        // in that cas, add "prev" parameter to correctly handle missing "v_from_prevStep" parameters
        let query;
        [ v_from_prevStep, query ] = Helpers.partitionObject(this.v, (k, _) => (this.attrs[k] || {}).uiType === 'password');

        query = Ws.toWs(query, this.all_attrs_flat);

        if (!isEmpty(v_from_prevStep)) {
            query.prev = this.$route.path.replace(/^\//, '');
        }
        if (resp.nextBrowserStep.match(/^https?:\/\//)) {
            document.location.href = resp.nextBrowserStep
        } else {
            router.push({ path: resp.nextBrowserStep, query });
        }
      },
      templated_response(resp, template: string) {
        this.resp = {
            ...resp,
            component: Vue.extend({ props: ['resp', 'v_pre', 'v'], template }),
        };
      },
      go_back() {
        if (this.initialStep) {
            // TODO: to test
            document.location.href = conf.base_pathname;
        } else {
            router.push('/steps');            
        }          
      },
      send() {
          return Ws.set(this.id, this.stepName, this.v, this.v_pre, this.all_attrs_flat).then(resp => {
              if (resp.ask_confirmation) {
                this.$refs.MyModalP.open(resp.ask_confirmation).then(() => {
                    this.v[resp.ask_confirmation.attr_to_save_confirmation] = true;
                    this.send();
                })
              } else {
                return this.nextStep(resp);
              }
          });
      },
      send_new_many() {
            this.to_import.lines.forEach(v => defaults(v, this.v));

            return Ws.new_many(this.stepName, this.to_import.lines, this.all_attrs_flat).then(resp => {
                this.imported = resp;
                this.imported.forEach((resp, i) => {
                    resp.v = this.to_import.lines[i];
                });
                //this.to_import = undefined;
                console.log(this.imported);
            });          
      },        
      merge(homonyme) {
          Helpers.eachObject(homonyme, (attr, val) => {
            if (attr.match(/^global_|^(uid|supannAliasLogin)$/)) {
                console.log("adding " + attr + " = " + val); 
                this.v[attr] = val;
                this.v_orig[attr] = val;
            }
          });
          this.v_ldap = homonyme;
          this.v_orig = Helpers.copy(this.v_orig); // make it clear for Vuejs that v_orig has been updated
        },
      reject(v) {
        this.v = v;
        Ws.remove(this.id, this.stepName).then(this.go_back);
      }
    },
});

</script>
