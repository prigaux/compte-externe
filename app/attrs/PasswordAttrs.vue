<template>
<div v-if="attrs.userPassword">
  <my-bootstrap-form-group name="userPassword" :label="label.userPassword" :validity="validity" hideErrors=1>
    <input-with-validity name="userPassword" v-model="v.userPassword" type="password" :pattern="passwordPattern" required :validity.sync="validity.userPassword"></input-with-validity>
    <span class="help-block" v-if="!validity.userPassword.valid">{{error_msg.userPassword}}</span>
  </my-bootstrap-form-group>

  <my-bootstrap-form-group name="userPassword2" :label="label.userPassword2" :validity="validity" hideErrors=1>
    <input-with-validity name="userPassword2" v-model="userPassword2" type="password" :same-as="v.userPassword" required :validity.sync="validity.userPassword2"></input-with-validity>
    <span class="help-block" v-if="validity.userPassword2.patternMismatch && !validity.userPassword.patternMismatch">Les mots de passe ne sont pas identiques</span>
  </my-bootstrap-form-group>
</div>  
</template>

<script lang="ts">
import Vue from "vue";
import conf from '../conf';
import MixinAttrs from './MixinAttrs.vue';

export default Vue.extend({
    mixins: [MixinAttrs],
    data() {
        return {
          userPassword2: null,
        };
    },
    computed: {
      passwordPattern() {
          return "(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z]).{8,}"; 
      },
      error_msg() {
          return conf.error_msg;
      },
    },
});
</script>
