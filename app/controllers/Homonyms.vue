<template>
<div v-if="homonymes.length">
   <p style="height: 2em"></p>
     <div class="alert alert-danger" >
       Les informations fournies pour le nouveau compte correspondent à un compte existant.
     </div>

 <div v-for="homonyme in homonymes">
   <p style="height: 0.5em"></p>
   <compare-users :v="v" :homonyme="homonyme"></compare-users>
   <button class="btn btn-primary" @click="merge(homonyme)"><span class="glyphicon glyphicon-resize-small"></span> C'est la même personne</button>
   <button class="btn btn-primary" @click="ignore(homonyme)"><span class="glyphicon glyphicon-remove"></span> Ce n'est pas la même personne</button>
   <p style="height: 1em"></p>
 </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
import CompareUsers from './CompareUsers.vue';

export default Vue.extend({
  props: ['v', 'l'],
  data() {
      return { 
        homonymes: this.l,
      };
  },

  components: { 'compare-users': CompareUsers },

  watch: {
      homonymes(l) {
        this.$emit('homonymes', l);
      },
  },

  methods: {
      merge(homonym) {
        this.$emit('merge', homonym);
        this.homonymes = [];
      },
      ignore(homonym) {
          this.homonymes = this.homonymes.filter(e => e !== homonym);
      }
  }
});
</script>