<template>
<div>
    <StepV
        :wanted_id="wanted_id" :stepName="stepName"
    ></StepV>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import StepV from './StepV.vue';

export default Vue.extend({
    props: [ 'wanted_id', 'stepName' ],
    components: { StepV },
});

</script>
