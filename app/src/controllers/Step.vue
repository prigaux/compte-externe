<template>
<div class="alert alert-danger" role="alert" v-if="fatal_error">
    <p style="white-space: pre">{{fatal_error}}</p>
</div>
<div :class="'step-' + stepName" v-else>
    <StepV v-for="(v, index) in vs" :key="index"
        :wanted_id="wanted_id" :stepName="stepName"
        :id="id" :v_pre="v_pre"
        :step="index === 0 ? step : non_first_step" :attrs="attrs" :all_attrs_flat="all_attrs_flat" :v="v" :v_orig="vs_orig[index]" :v_ldap="v_ldap"
        :onelineForm="onelineForm"
    ></StepV>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import { router } from '../router';
import { isEmpty, fromPairs, every } from 'lodash';
import { V, StepAttrsOption } from '../services/ws';

import { v_from_prevStep } from './StepV.vue';
import StepV from './StepV.vue';


function AttrsForm_data() {
    return {
      step: undefined,
      attrs: <StepAttrsOption> undefined,
      all_attrs_flat: <StepAttrsOption> undefined,
      vs: <V> undefined,
      vs_orig: <V> undefined,
      v_ldap: <V> undefined,
      fatal_error: undefined,
    };    
}

export default Vue.extend({
    mounted() {
        const prevStep = this.$route.query?.prev;
        if (prevStep && isEmpty(v_from_prevStep)) {
            // we lost information passed through javascript memory, so go back to initial step
            router.replace({ path: '/' + prevStep });
        } else {
            this.init();
        }
    },
    props: [ 'wanted_id', 'stepName' ],
    data: AttrsForm_data,
    components: { StepV },

    watch: {
        '$route': function() {
            Helpers.assign(this, AttrsForm_data());
            this.init();
        },
    },
    computed: {
        id() {
            return this.wanted_id || "new";
        },
        v_pre() {
            let v = { ...this.$route.query, ...v_from_prevStep };
            delete v.prev;
            return v;
        },
        hash_params() {
            if (!this.$route.hash) return {};
            return fromPairs(this.$route.hash.replace(/^#/, '').split('&').map((s: string) => s.split('=')));
        },
        onelineForm() {
            return this.vs && every(this.all_attrs_flat || [], opts => opts.readOnly)
        },
        non_first_step() {
            const labels = this.step.labels
            return { ...this.step, labels: { ...labels, title: '' } }
        },
    },

    methods: {
        init() {
            Ws.getInScope(this, this.id, this.v_pre, this.hash_params, this.stepName);    
        },
    },
});

</script>
