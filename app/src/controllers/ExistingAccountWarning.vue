<template>
<span v-if="soonAlumni">
  était étudiant en {{lastAnneeInscription | formatAcademicYear}}
</span>
<span v-else>
  est {{conf.affiliation_labels[v.global_eduPersonPrimaryAffiliation] || 'un ancien compte sans affiliation'}}      
  {{lastAnneeInscription | formatAcademicYear}}
  <b v-if="hasAffiliation(v, 'student', 'member')">géré par Apogée</b>
  <b v-if="hasAffiliation(v, 'employee')">géré par SIHAM</b>
</span>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: ['v'],
  computed: {
        lastAnneeInscription() {
            let annees = this.v.global_supannEtuAnneeInscription;
            return annees && Math.max(...annees);
        },
        soonAlumni() {
            const endDate = new Date(this.lastAnneeInscription + 1, 9 - 1, 1); // 201X/09/01
            return this.hasAffiliation(this.v, 'student', 'member') && endDate < new Date();
        },
  },
});
</script>