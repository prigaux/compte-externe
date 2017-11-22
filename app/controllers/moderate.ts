import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers';
import { AttrsForm_mixin } from '../services/attrsForm';
import * as Ws from '../services/ws';
import { router } from '../router';

import template_reuse from '../templates/reuse.html';
import template_moderate from '../templates/moderate.html';


function computeComparisons(v, homonyme) {   
        let r = [];
        Helpers.eachObject(homonyme, (attr, val) => {
            if (attr === 'uid' || attr === 'dn' || attr === 'score' || attr === 'jpegPhoto' || attr === 'eduPersonAffiliation') return; 
            var val2 = "" + (val || '');
            if (!(attr in v)) return;
            var val1 = "" + (v[attr] || '');
            if (val1 !== val2) {
                r.push({ attr, cmp: Helpers.formatDifferences(val1, val2) });
            }
        });
        return r;
}

export const CompareUsers = Vue.extend({
    props: ['v', 'homonyme'],
    computed: {
        comparisons() {
            let v_ = Ws.toWs(this.v);
            return computeComparisons(v_, this.homonyme);
        },
        label() {
            return conf.attr_labels;
        },
    },
    template: `
 <div>
   <div v-if="comparisons.length == 0">
     Le compte <b>{{homonyme.uid}}</b> correspond exactement.
   </div>
   <div v-else>
     Voici les différences avec le compte <b>{{homonyme.uid}}</b> :
     <table class="table table-bordered">
       <tbody v-for="e in comparisons">
         <tr>
           <td>{{label[e.attr] || e.attr}}</td>
           <td v-html="e.cmp[0]"></td>
           <td v-html="e.cmp[1]"></td>
         </tr>
       </tbody>
     </table>
   </div>
  </div>
   `,
});

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

export const Reuse = {
  name: "Reuse",
  template: template_reuse,
  props: ['uid'],
  mixins: [AttrsForm_mixin, Moderate_mixin],

  computed: {
    id() { return 'new/reuse?uid=' + this.uid; },
    conf() { return conf },
    isMember() { 
        let aff = this.v.eduPersonAffiliation;
        return aff && aff.indexOf('member') >= 0;
    },
    anneeInscription() {
        let annees = this.v.supannEtuAnneeInscription;
        return annees && Math.max(...annees);
    },
  },
};
