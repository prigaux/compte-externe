<template>
    <modal v-if="_active" @cancel="_cancel">
        <h4 slot="header">
            <button type="button" class="close" @click="_cancel" title="Annuler">&times;</button>
            <span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span> {{_title}}
        </h4>
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
        const _title = ref("")
        return {
            open(labels) {
                _msg.value = labels.msg
                _title.value = labels.title || "Attention"
                _active.value = Helpers.promise_defer()
                return _active.value.promise
            },
            _active, _msg, _title,
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

<style scoped>
.text-warning {
    line-height: 1.8em;
    color: #333;
}  

.btn {
    line-height: 1.8;
    
    width: 35%;
    min-width: 120px;
}
</style>