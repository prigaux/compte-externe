<template>
<div v-if="description">
    <div v-if="allow_reuse">
        <h4 v-html="description"></h4>

        <form novalidate v-if="step.acl_subvs || step.attrs.profilename_to_modify" class="form-horizontal">
            <my-bootstrap-form-group :name="uid" label="Choisir un utilisateur">
                <typeahead :minChars="3" :editable="false"
                            @input="withUser"
                    :options="people_search"
                    :formatting="e => e.givenName + ' ' + e.sn"></typeahead>
                <div v-if="profiles" style="padding-top: 1rem">
                    {{user.givenName}} {{user.sn}} a plusieurs profiles. Veuillez choisir le profile à modifier.
        </div>
            </my-bootstrap-form-group>

            <genericAttr name="profilename" :opts="profiles" v-model="profile" :submitted="false" v-if="profiles"></genericAttr>
        </form>

        <div v-else>
            <autocomplete-user class="form-control" placeholder="Rechercher une personne" @select="withUser"></autocomplete-user>
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
import { includes } from 'lodash';
import Vue from "vue";
import * as Ws from '../services/ws';
import { router } from '../router';
import genericAttr from '../attrs/genericAttr.vue';

export default Vue.extend({
   props: ['step'],
   components: { genericAttr },
   data() { 
       return {
            user: undefined,
            profile: undefined,
            profiles: undefined,
       };
   },
   computed: {
     allow_reuse() {
         return this.step.attrs.uid && !this.step.attrs.uid.uiHidden;
     },
     description() {
         const labels = this.step.labels || {};
         return "description" in labels ? labels.description : labels.title;
     },
   },
   watch: {
     profile(p) {
         this.gotoStep(this.user, p);
     },
   },
   methods: {
     people_search(token) {
         return Ws.people_search(this.step.id, token);
     },
     withUser(u) {
         const need_profile : Ws.StepAttrOption = this.step.attrs.profilename_to_modify;
         if (need_profile) {
             const choices = need_profile.choices.filter(function (choice) {
                 return includes(u.global_profilename, choice.key);
             });
             if (choices.length === 1) {
                 this.gotoStep(u, choices[0].key);
             } else {
                 this.profiles = { ...need_profile, choices };
                 this.user = u;
             }
         } else {
             this.gotoStep(u);
         }
     },
     gotoStep(u, profilename = undefined) {
        router.push(`/${this.step.id}?uid=${u.uid}` + (profilename ? `&profilename_to_modify=${profilename}` : ''));
     },
  },  
});
</script>
