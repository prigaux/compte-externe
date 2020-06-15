<template>
<div v-if="l.length">
   <p style="height: 2em"></p>
     <div class="alert alert-danger" >
       Les informations fournies pour le nouveau compte correspondent à un compte existant.
     </div>

 <div v-for="homonyme in l">
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

export default Vue.extend({
  props: ['v', 'l'],

  components: { 'compare-users': () => import('./CompareUsers.vue') },

  methods: {
      merge(homonym) {
        this.$emit('merge', homonym);
      },
      ignore(homonym) {
          homonym.ignore = true
      }
  }
});
</script>