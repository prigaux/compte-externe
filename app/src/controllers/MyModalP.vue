<template>
    <modal v-if="_active" @cancel="_cancel">
        <div slot="header">
            <button type="button" class="close" @click="_cancel" title="Annuler">&times;</button>
            <span class="glyphicon glyphicon-warning-sign" aria-hidden="true"> Attention</span>
        </div>
        <div slot="body">
            <p class="text-warning" v-html="_msg"></p>
        </div>
        <div slot="footer">
            <button type="button" class="btn btn-default" @click="_cancel">{{"Annuler"}}</button>
            <button type="button" class="btn btn-primary" @click="_ok">{{"Confirmer"}}</button>
        </div>
    </modal>
</template>

<script lang="ts">
import Vue from "vue";
import { ref, Ref } from '@vue/composition-api';
import * as Helpers from '../services/helpers';

import Modal from '../directives/Modal.vue';

export default Vue.extend({
    components: { Modal },
    setup() {
        const _active: Ref<Helpers.promise_defer<null>> = ref(undefined)
        const _msg = ref("")
        return {
            open(msg: string) {
                _msg.value = msg
                _active.value = Helpers.promise_defer()
                return _active.value.promise
            },
            _active, _msg,
            _cancel() {
                _active.value.reject("cancel")
                _active.value = undefined
            },
            _ok() {
                _active.value.resolve(null)
                _active.value = undefined
            },
        }
    },
})
</script>