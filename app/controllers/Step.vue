<template>
<div class="normalContent">
 <div v-if="resp && resp.component">
    <component :is="resp.component" :resp="resp" :v="v"></component>
 </div>
 <div v-else-if="v">
  <h4 style="margin-top: 2em" v-html="step.labels.title"></h4>

  <div v-if="step.allow_many">
    
        <div v-if="imported">
            <ImportResult :imported="imported" :ordered_fields="to_import.fields" @done="imported = to_import = undefined"></ImportResult>
        </div>
        <div v-else>
            <ImportFile @change="val => to_import = val"></ImportFile>
        </div>
  </div>

<div v-if="!imported">

 <div v-if="check_homonyms && !all_potential_homonyms">
     Recherche des homonymes, veuillez patienter...
 </div>
 <div v-else-if="check_homonyms && all_potential_homonyms.length">
    <Homonyms :v="v" :l="all_potential_homonyms" @merge="merge" @no_merge="potential_homonyms = []">
    </Homonyms>
 </div>
 <div v-else>

    <div v-if="attrs.profilename && v.uid && !v.profilename_to_modify">
        <p style="height: 2em"></p>
            <div class="alert alert-danger" >
                Le compte sera fusionné avec le compte existant {{v.uid}}.
                <p/>
                {{v.givenName}} {{v.sn}} <ExistingAccountWarning :v="v"></ExistingAccountWarning> 
            </div>
    </div>
             
    <attrsForm
        :v="v" :v_orig="v_orig" :v_ldap="v_ldap" :attrs="other_attrs" :step_labels="step.labels"
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
import { defaults } from 'lodash';
import { V, StepAttrsOption } from '../services/ws';
import { compute_subAttrs_and_handle_default_values } from '../services/sub_and_defaults';

import ImportFile from '../import/ImportFile.vue';
import ImportResult from '../import/ImportResult.vue';
import Homonyms from '../controllers/Homonyms.vue';
import attrsForm from '../attrs/attrsForm';
import ExistingAccountWarning from '../controllers/ExistingAccountWarning.vue';


function AttrsForm_data() {
    return {
      step: undefined,
      attrs: <StepAttrsOption> undefined,
      v: <V> undefined,
      v_orig: <V> undefined,
      v_ldap: <V> undefined,
      resp: undefined,
      to_import: undefined,
      imported: <any[]> undefined,
      all_potential_homonyms: undefined,
      potential_homonyms: undefined,
    };    
}

export default Vue.extend({
    mounted() {
        this.init();
    },
    props: [ 'wanted_id', 'stepName' ],
    data: AttrsForm_data,
    components: { ImportFile, ImportResult, Homonyms, ExistingAccountWarning, attrsForm },

    watch: {
        '$route': function() {
            Helpers.assign(this, AttrsForm_data());
            this.init();
        },
        'v_default': 'handle_default_values',
    },
    computed: {
        id() {
            return this.wanted_id || "new";
        },
        initialStep() {
            return !this.wanted_id && this.stepName;
        },
        check_homonyms() {
            return !this.initialStep && this.attrs_ && this.attrs_.uid && !this.v.uid;
        },
        noInteraction() {
            return this.v.noInteraction || Object.keys(this.attrs_).length === 0;
        },
        attrs_() {
            return this.attrs && Helpers.filter(this.attrs, (opts) => !opts.uiHidden);
        },

        other_attrs(): StepAttrsOption {
            let { attrs, prev_defaults } = compute_subAttrs_and_handle_default_values(this.attrs, this.prev_defaults, this.v);
            this.prev_defaults = prev_defaults;
            
            attrs = Helpers.filter(attrs, (opts) => !opts.uiHidden);

            Helpers.eachObject(attrs, (attr, _opts) => {
                // ensure Vue.js reactivity works
                if (!(attr in this.v)) Vue.set(this.v, attr, undefined);
            });

            if (this.to_import && attrs) {
                attrs = Helpers.filter(attrs, (_, k) => !this.to_import.fields.includes(k));
            }
            if (this.$route.query && attrs) {
                // do not display things that have been forced in the url
                attrs = Helpers.filter(attrs, (_, k) => !(k in this.$route.query));
            }
            return attrs;
        },
    },

    methods: {
        init() {
            Ws.getInScope(this, this.id, this.$route.query, this.stepName).then(() => {
                if (this.noInteraction) this.send();
                if (this.check_homonyms) this.update_potential_homonyms({});
            });    
        },
        async update_potential_homonyms(v) {
            const l = await Ws.homonymes(this.id);
            this.all_potential_homonyms = l;
        },
      submit(v, { resolve }) {
          this.v = v;
          let p = this.to_import ? this.send_new_many() : this.send();
          Helpers.finallyP(p, resolve);
      },
      nextStep(resp) {
        console.log("nextStep", resp);
        if (resp.forceBrowserExit) {
            Helpers.createCookie('forceBrowserExit', 'true', 0);
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
      templated_response(resp, template: string) {
        this.resp = resp;
        this.resp.component = Vue.extend({ 
            props: ['resp', 'v'], 
            template,
        });
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
          return Ws.set(this.id, this.stepName, this.v, this.$route.query).then(resp => {
              if (resp.error === "no_moderators") {
                  Ws.structure_get(this.v.structureParrain).then(structure => {
                    alert(conf.error_msg.noModerators(structure.name));
                    this.v.structureParrain = undefined;
                  });
              } else {
                return this.nextStep(resp);
              }
          });
      },
      send_new_many() {
            this.to_import.lines.forEach(v => defaults(v, this.v));

            return Ws.new_many(this.stepName, this.to_import.lines).then(resp => {
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
            if (val && (!this.v[attr] || attr === 'supannAliasLogin')) {
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
        Ws.remove(this.id, this.stepName).then(this.nextStep);
      }
    },
});

</script>
