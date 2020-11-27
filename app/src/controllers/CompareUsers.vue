<template>
 <div>
     <p><b>{{homonyme.mail || homonyme.uid}}</b> <span v-html="homonyme.global_main_profile.description"></span></p>
     <table class="table table-bordered">
       <tbody>
         <tr><th></th><th>Compte demandé</th><th>Compte existant</th></tr>
         <tr v-for="{ attr, cmp, skip } in comparisons" v-if="!skip">
           <td>{{default_attrs_title[attr] || attr}}</td>
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
import * as JsDiff from 'diff';

const format = Helpers.formatValue;

function computeComparisons(v, homonyme) {   
        let sameAttrs = {};
        const ignored_attrs = [ 'uid', 'supannAliasLogin', 'score' ];
        return Object.keys(conf.default_attrs_opts).filter(attr => (
            (attr in homonyme) && !_.includes(ignored_attrs, attr) && !attr.match(/^global_/)
        )).map(attr => {
            var val2 = format(homonyme[attr]);
            var val1 = format(v[attr]);
            if (!val1 && attr === 'birthName' && val2) {
                val1 = format(v['sn']);
            }
            [ val1, val2 ] = [ val1, val2 ].map(Helpers.maybeFormatPhone("0"));
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
                cmp = Helpers.formatDifferences(val1, val2, JsDiff);
            }
            return { attr, cmp, skip };
        });
}

export default Vue.extend({
    props: ['v', 'homonyme'],
    computed: {
        comparisons() {
            return computeComparisons(this.v, this.homonyme);
        },
    },
})
</script>
