<template>
<div v-if="description">
    <div v-if="allow_reuse">
        <h4 v-html="description"></h4>
        <div v-if="step.acl_subvs">
          <typeahead :minChars="3" :editable="false"
             @input="reuse"
             :options="people_search"
             :formatting="e => e.givenName + ' ' + e.sn"></typeahead>
        </div>
        <div v-else>
            <autocomplete-user class="form-control" placeholder="Rechercher une personne" @select="reuse"></autocomplete-user>
        </div>
    </div>
    <div v-else>
        <h4>
            <router-link :to="'/' + step.id" v-html="description"></router-link>
        </h4>
    </div>
    <p style="margin-bottom: 2em"></p>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import * as Ws from '../services/ws';
import { router } from '../router';

export default Vue.extend({
   props: ['step'],
   computed: {
     allow_reuse() {
         return this.step.attrs.uid && !this.step.attrs.uid.uiHidden;
     },
     description() {
         const labels = this.step.labels || {};
         return "description" in labels ? labels.description : labels.title;
     },
   },
   methods: {
     people_search(token) {
         return Ws.people_search(this.step.id, token);
     },
     reuse(u) {
        router.push(`/${this.step.id}?uid=${u.uid}`);
     },
  },  
});
</script>
