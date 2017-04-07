function computeComparisons(v, homonyme) {   
        let r = [];
        Helpers.eachObject(homonyme, (attr, val) => {
            if (attr === 'uid' || attr === 'dn' || attr === 'score') return; 
            var val2 = "" + (val || '');
            var val1 = "" + (v[attr] || '');
            if (val1 !== val2) {
                r.push({ attr, cmp: Helpers.formatDifferences(val1, val2) });
            }
        });
        return r;
}

const CompareUsers : vuejs.ComponentOption = {
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
};


const Moderate : vuejs.ComponentOption = {
  name: "Moderate",
  templateUrl: 'templates/moderate.html',
  props: ['id'],
  data() {
      return Helpers.assign(AttrsForm_data(), { 
        homonymes: [],
      });
  },

  components: { 'compare-users': CompareUsers },
  mixins: [AttrsForm_mixin],

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
        }
        router.push('/moderate');
    },

  },

    mounted() {
        Ws.homonymes(this.id).then(l => {
            this.homonymes = l;
        });
    },
};
