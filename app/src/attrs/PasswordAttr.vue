<template>
<div>
  <my-bootstrap-form-group name="userPassword" :label="opts.title" :labels="opts.labels" :validity="validity" hideErrors=1>
    <input-with-validity name="userPassword" v-model="val" type="password" autocomplete="new-password" :pattern="passwordPattern" required :validity.sync="validity.userPassword"></input-with-validity>
    <span class="help-block" v-if="!validity.userPassword.valid">{{error_msg.userPassword}}</span>
  </my-bootstrap-form-group>

  <my-bootstrap-form-group name="userPassword2" :label="default_attrs_title.userPassword2" :validity="validity" hideErrors=1>
    <input-with-validity name="userPassword2" v-model="userPassword2" type="password" autocomplete="new-password" :same-as="val" required :validity.sync="validity.userPassword2"></input-with-validity>
    <span class="help-block" v-if="validity.userPassword2.patternMismatch && !validity.userPassword.patternMismatch">Les mots de passe ne sont pas identiques</span>
  </my-bootstrap-form-group>
</div>  
</template>

<script lang="ts">
import Vue from "vue";
import conf from '../conf';

export default Vue.extend({
    props: ['value', 'opts', 'submitted'],
    data() {
        return {
          validity: { userPassword: {}, userPassword2: {}, submitted: false },
          val: this.value,
          userPassword2: null,
        };
    },
    computed: {
      passwordPattern() {
          return "(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])[ -~]{8,}"; // must contain digit / uppercase / lowercase. must be printable ASCII chars
      },
      error_msg() {
          return conf.error_msg;
      },
    },
    watch: {
        value(val) {
            this.val = val;
        },
        val(val) {
            this.$emit('input', val);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
});
</script>
