<template>
<div v-if="step.labels && step.labels.title">
    <div v-if="allow_reuse">
        <h4 v-html="step.labels.title"></h4>
        <div>
            <autocomplete-user class="form-control" placeholder="Rechercher une personne" @select="reuse"></autocomplete-user>
        </div>
    </div>
    <div v-else>
        <h4>
            <router-link :to="'/' + step.id" v-html="step.labels.title"></router-link>
        </h4>
    </div>
    <p style="margin-bottom: 2em"></p>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import { router } from '../router';

export default Vue.extend({
   props: ['step'],
   computed: {
     allow_reuse() {
         return !!this.step.attrs.uid;
     },
   },
   methods: {
     reuse(u) {
        router.push(`/${this.step.id}?uid=${u.uid}`);
     },
  },  
});
</script>
