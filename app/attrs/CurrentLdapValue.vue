<template>
  <div class="current-ldap-value" v-if="ldap_value && ldap_value !== value">
      actuellement : {{ldap_value}}
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ["ldap_value", "value"],
})
</script>
