<template>
<div class="normalContent">
 <div v-if="resp && resp.component">
    <component :is="resp.component" :resp="resp" :v="v"></component>
 </div>
 <div v-else-if="v">
  <h4 style="margin-top: 2em" v-html="step.labels.title"></h4>

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
      <Homonyms :v="v" :l="potential_homonyms" @merge="merge" @no_merge="no_merge">
      </Homonyms>
   </div>
   <div v-else>

    <div v-if="attrs.global_eduPersonPrimaryAffiliation && attrs.profilename && v.uid && !v.profilename_to_modify">
        <p style="height: 2em"></p>
            <div class="alert alert-danger" >
                Le compte sera fusionné avec le compte existant {{v.uid}}.
                <p/>
                {{v.givenName}} {{v.sn}} <ExistingAccountWarning :v="v"></ExistingAccountWarning> 
            </div>
    </div>

    <div v-if="step.allow_many">
        <ImportFile :attrs="attrs" @change="val => to_import = val"></ImportFile>
    </div>
             
    <attrsForm
        :v="v" :v_ldap="v_ldap" :attrs="other_attrs" :step_labels="step.labels" :stepName="stepName"
        @submit="submit" @reject="reject"></attrsForm>

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
import { compute_mppp_and_handle_default_values, filterAttrs } from '../services/mppp_and_defaults';

import ImportFile from '../import/ImportFile.vue';
import ImportResult from '../import/ImportResult.vue';
import Homonyms from '../controllers/Homonyms.vue';
import attrsForm from '../attrs/attrsForm';
import ExistingAccountWarning from '../controllers/ExistingAccountWarning.vue';


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
    ],
    data: AttrsForm_data,
    components: { ImportFile, ImportResult, Homonyms, ExistingAccountWarning, attrsForm },

    computed: {
        initialStep() {
            return !this.wanted_id && this.stepName;
        },
        check_homonyms() {
            return !this.initialStep && this.attrs_ && this.attrs_.uid && !this.attrs_.uid.readOnly && !this.v.uid;
        },
        noInteraction() {
            return this.v.noInteraction || Object.keys(this.attrs_).length === 0;
        },
        attrs_() {
            return this.attrs && Helpers.filter(this.attrs, (opts) => !opts.uiHidden);
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
            const template = this.step && this.step.labels && this.step.labels.description;
            return template && Vue.extend({ props: ['v_pre', 'v'], template: "<div>" + template + "</div>" });
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
            this.all_potential_homonyms = unionBy(this.all_potential_homonyms || [], l, 'uid');
        },
        async submit_() {
            await this.may_update_potential_homonyms(this.v, this.v_orig);
            if (this.check_homonyms && this.potential_homonyms.length) {
                // we cannot submit, we must display the new potential homonyms
            } else {
                await this.to_import ? this.send_new_many() : this.send();
            }
        },
      submit(v, { resolve }) {
          this.v = v;
          let p = this.submit_();
          Helpers.finallyP(p, resolve);
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
        router.push({ path: resp.nextBrowserStep, query });
      },
      templated_response(resp, template: string) {
        this.resp = {
            ...resp,
            component: Vue.extend({ props: ['resp', 'v'], template }),
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
              if (resp.error === "no_moderators") {
                alert(resp.error);
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
      no_merge() {
          this.potential_homonyms.forEach(h => h.ignore = true);
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