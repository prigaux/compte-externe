<template>
 <div>
     <p><b>{{homonyme.mail || homonyme.uid}}</b> <ExistingAccountWarning :v="homonyme"></ExistingAccountWarning></p>
     <table class="table table-bordered">
       <tbody>
         <tr v-for="{ attr, cmp, skip } in comparisons" v-if="!skip">
           <td>{{label[attr] || attr}}</td>
           <td v-html="cmp[0]"></td>
           <td v-html="cmp[1]"></td>
         </tr>
       </tbody>
     </table>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as _ from 'lodash';
import conf from '../conf';
import * as Helpers from '../services/helpers';
import ExistingAccountWarning from '../controllers/ExistingAccountWarning.vue';

function format(val) {
    if (val instanceof Date) {
        return Helpers.formatDate(val, 'dd/MM/yyyy');
    } else {
        return "" + (val || '');
    }
}

function computeComparisons(v, homonyme) {   
        let sameAttrs = {};
        const ignored_attrs = [ 'uid', 'supannAliasLogin', 'score', 'eduPersonAffiliation', 'eduPersonPrimaryAffiliation', 'supannEtuAnneeInscription' ];
        return conf.attrs_order.filter(attr => (
            (attr in homonyme) && !_.includes(ignored_attrs, attr)
        )).map(attr => {
            var val2 = format(homonyme[attr]);
            var val1 = format(v[attr]);
            if (!val1 && attr === 'birthName' && val2) {
                val1 = format(v['sn']);
            }
            [ val1, val2 ] = [ val1, val2 ].map(Helpers.maybeFormatPhone);
            const same = Helpers.equalsIgnoreCase(val1, val2);
            const skip = !val1 && attr === 'altGivenName' && sameAttrs['givenName'];

            let cmp;
            if (attr === 'jpegPhoto') {
                [ val1, val2 ] = [ val1, val2 ].map(val => `<img src="${val}">`);
                cmp = [ val1, same ? "<i>identique</i>" : val2 ];
            } else if (same) { 
                sameAttrs[attr] = true;
                cmp = [ val1, same ? "<i>identique</i>" : val2 ];
            } else {
                cmp = Helpers.formatDifferences(val1, val2);
            }
            return { attr, cmp, skip };
        });
}

export default Vue.extend({
    props: ['v', 'homonyme'],
    components: { ExistingAccountWarning },
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
