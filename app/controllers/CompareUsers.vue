<template>
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
</template>

<script lang="ts">
import Vue from 'vue'
import conf from '../conf';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';

function computeComparisons(v, homonyme) {   
        let r = [];
        Helpers.eachObject(homonyme, (attr, val) => {
            if (attr === 'uid' || attr === 'supannAliasLogin' || attr === 'dn' || attr === 'score' || attr === 'jpegPhoto' || attr === 'eduPersonAffiliation') return; 
            var val2 = "" + (val || '');
            if (!(attr in v)) return;
            var val1 = "" + (v[attr] || '');
            if (val1 !== val2) {
                r.push({ attr, cmp: Helpers.formatDifferences(val1, val2) });
            }
        });
        return r;
}

export default Vue.extend({
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
})
</script>
