<template>
<div>
    <StepV
        :wanted_id="wanted_id" :stepName="stepName"
        :id="id" :v_pre="v_pre"
    ></StepV>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import { v_from_prevStep } from './StepV.vue';
import StepV from './StepV.vue';


export default Vue.extend({
    props: [ 'wanted_id', 'stepName' ],
    components: { StepV },

    computed: {
        id() {
            return this.wanted_id || "new";
        },
        v_pre() {
            let v = { ...this.$route.query, ...v_from_prevStep };
            delete v.prev;
            return v;
        },
    },
});

</script>
