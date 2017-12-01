<template>
<div>
 <div v-if="homonymes.length || v.uid">
   <p style="height: 2em"></p>
     <div class="alert alert-danger" >
         <div v-if="v.uid">
            Le compte sera fusionné avec le compte existant {{v.uid}}
         </div>
         <div v-else>
       Les informations fournies pour le nouveau compte correspondent à un compte existant.
         </div>
     </div>
 </div>

 <div v-for="homonyme in homonymes" v-if="!v.uid">
   <p style="height: 0.5em"></p>
   <compare-users :v="v" :homonyme="homonyme"></compare-users>
   <button class="btn btn-primary" @click="$emit(homonyme)"><span class="glyphicon glyphicon-resize-small"></span> Fusionner avec {{homonyme.uid}}</button>
   <p style="height: 1em"></p>
 </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
import CompareUsers from './CompareUsers.vue';
import * as Ws from '../services/ws';

export default Vue.extend({
  props: ['v', 'id'],
  data() {
      return { 
        homonymes: [],
      };
  },

  components: { 'compare-users': CompareUsers },

  mounted() {
        Ws.homonymes(this.id).then(l => {
            this.homonymes = l;
        });
  },
});
</script>